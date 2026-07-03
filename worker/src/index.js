/**
 * TableStakes TURN credential minter.
 *
 * The browser never sees the Cloudflare TURN API token. It POSTs here, this
 * Worker mints short-lived ICE credentials via Cloudflare Realtime, and returns
 * only the resulting `iceServers` payload.
 *
 * Swapping TURN providers later = replace the body of `mintIceServers()`; the
 * request/response contract with the client stays the same.
 *
 * Runtime secrets (set via `wrangler secret put` or CI):
 *   TURN_KEY_ID          - Cloudflare Realtime TURN key id
 *   TURN_KEY_API_TOKEN   - API token authorized to generate credentials
 * Vars (wrangler.toml):
 *   ALLOWED_ORIGINS      - comma-separated origins allowed to call this Worker
 *   CREDENTIAL_TTL       - optional, seconds (default 86400)
 */

const DEFAULT_ALLOWED_ORIGINS = 'https://joshuarlowry.github.io';
const DEFAULT_TTL = 86400;

function allowedOrigins(env) {
  return new Set(
    (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  );
}

function corsHeaders(origin, env) {
  const allow = allowedOrigins(env).has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

async function mintIceServers(env) {
  const ttl = Number(env.CREDENTIAL_TTL) || DEFAULT_TTL;
  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`TURN provider responded ${res.status}: ${detail}`);
  }

  const data = await res.json();
  return data.iceServers;
}

function roomOriginAllowed(request, env) {
  const origin = request.headers.get('Origin') || '';
  return !origin || allowedOrigins(env).has(origin); // no Origin header = non-browser/dev client
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/room/')) {
      if (!roomOriginAllowed(request, env)) return new Response('Forbidden origin', { status: 403 });
      const roomId = decodeURIComponent(url.pathname.slice('/room/'.length));
      if (!roomId) return new Response('Missing room id', { status: 400 });
      const stub = env.ROOM_DO.get(env.ROOM_DO.idFromName(roomId));
      return stub.fetch(request);
    }

    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (!cors['Access-Control-Allow-Origin']) {
      return new Response('Forbidden origin', { status: 403 });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) {
      return jsonResponse({ error: 'TURN key not configured' }, 500, cors);
    }

    try {
      const iceServers = await mintIceServers(env);
      return jsonResponse(iceServers, 200, {
        ...cors,
        'Cache-Control': 'no-store',
      });
    } catch (err) {
      return jsonResponse({ error: 'TURN provider error', detail: err.message }, 502, cors);
    }
  },
};

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

export { RoomDO } from './room.js';

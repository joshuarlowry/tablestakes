/**
 * ICE-server providers.
 *
 * Every TURN option — static creds, a credential-minting Worker, a self-hosted
 * relay — reduces to the same output: an array of RTCIceServer entries. Each
 * provider below encapsulates *how* those are obtained. The transport layer only
 * ever sees the resulting array, so adding or swapping a provider is local to
 * this file.
 *
 * Provider shape:
 *   { id, label, async getIceServers(opts) -> RTCIceServer[] }
 */

// Legacy public relay. Kept as an explicit, selectable fallback — known to be
// unreliable (free tier frequently down), never a silent default.
const OPEN_RELAY_ICE_SERVERS = [
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:80?transport=tcp',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

function toIceServerArray(payload) {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : [payload];
}

export const iceProviders = {
  none: {
    id: 'none',
    label: 'Direct (no relay)',
    async getIceServers() {
      return [];
    },
  },

  openrelay: {
    id: 'openrelay',
    label: 'OpenRelay (public, unreliable)',
    async getIceServers() {
      return OPEN_RELAY_ICE_SERVERS;
    },
  },

  cloudflare: {
    id: 'cloudflare',
    label: 'Cloudflare TURN',
    async getIceServers({ endpoint } = {}) {
      if (!endpoint) {
        throw new Error('Cloudflare TURN endpoint is not configured');
      }
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        throw new Error(`TURN endpoint returned ${res.status}`);
      }
      return toIceServerArray(await res.json());
    },
  },
};

export function getProvider(id) {
  return iceProviders[id] || iceProviders.none;
}

export function providerIds() {
  return Object.keys(iceProviders);
}

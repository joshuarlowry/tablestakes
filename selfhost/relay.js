#!/usr/bin/env node
/**
 * Cloudflare-free relay for self-hosting / offline TableStakes.
 *
 * The hosted build routes game traffic through a Cloudflare Durable Object
 * (worker/src/room.js). That relay is a *dumb pipe*: it never inspects game
 * events, it only broadcasts opaque envelopes between the sockets in one room
 * and announces join/leave. This file re-implements that exact wire protocol
 * on plain Node + the `ws` package, so you can run the whole thing on a laptop,
 * a Raspberry Pi, or an air-gapped LAN with no cloud account of any kind.
 *
 * There is NO TURN/STUN/WebRTC anywhere — the relay is the transport. A single
 * process (this file) plus any static file server for the built `dist/` is the
 * entire backend.
 *
 * Wire protocol (JSON text frames), connect at:  ws(s)://HOST/room/<roomId>
 *   client -> { t:'hello', id, token, name }
 *   client -> { t:'evt', payload, target? }        // target = a peer id, else broadcast
 *   server -> { t:'welcome', peers:[id,...] }       // sent to the joiner
 *   server -> { t:'peer-join', id }                 // broadcast to the rest
 *   server -> { t:'peer-leave', id }
 *   server -> { t:'evt', from, payload }
 *
 * Access control mirrors the DO: the first socket to say hello in a room fixes
 * that room's invite token; later sockets must match or are closed with 4001.
 *
 * Run:  node selfhost/relay.js            (defaults to port 8787)
 *       PORT=9000 node selfhost/relay.js
 *
 * Only dependency:  npm install ws
 */
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 8787;

// roomId -> { token: string|null, peers: Map<ws, peerId> }
const rooms = new Map();

function roomFor(id) {
  let room = rooms.get(id);
  if (!room) { room = { token: null, peers: new Map() }; rooms.set(id, room); }
  return room;
}
function send(ws, obj) {
  try { ws.send(JSON.stringify(obj)); } catch { /* socket gone */ }
}

const wss = new WebSocketServer({ port: PORT });
console.log(`TableStakes relay listening on ws://0.0.0.0:${PORT}  (path: /room/<roomId>)`);

wss.on('connection', (ws, req) => {
  const match = /^\/room\/([^/?#]+)/.exec(req.url || '');
  if (!match) { ws.close(4002, 'bad path'); return; }
  const roomId = decodeURIComponent(match[1]);
  const room = roomFor(roomId);

  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }

    if (data.t === 'hello') {
      const peerId = typeof data.id === 'string' ? data.id.slice(0, 40) : '';
      const token = typeof data.token === 'string' ? data.token : '';
      if (!peerId || !token) { ws.close(4002, 'bad hello'); return; }
      if (room.token == null) room.token = token;
      else if (room.token !== token) { ws.close(4001, 'bad token'); return; }

      ws.peerId = peerId;
      const existing = [...room.peers.values()];
      room.peers.set(ws, peerId);
      send(ws, { t: 'welcome', peers: existing });
      for (const other of room.peers.keys()) {
        if (other !== ws) send(other, { t: 'peer-join', id: peerId });
      }
      return;
    }

    if (data.t === 'evt') {
      const from = room.peers.get(ws);
      if (!from) return; // never said hello
      const envelope = { t: 'evt', from, payload: data.payload };
      if (data.target) {
        for (const [other, id] of room.peers) {
          if (id === data.target && other !== ws) send(other, envelope);
        }
      } else {
        for (const other of room.peers.keys()) {
          if (other !== ws) send(other, envelope);
        }
      }
    }
  });

  const drop = () => {
    const peerId = room.peers.get(ws);
    if (!peerId) return;
    room.peers.delete(ws);
    for (const other of room.peers.keys()) send(other, { t: 'peer-leave', id: peerId });
    // Forget the room (and its token) once everyone has left, so it can be
    // re-created fresh — the hosted DO wipes idle rooms for the same reason.
    if (room.peers.size === 0) rooms.delete(roomId);
  };
  ws.on('close', drop);
  ws.on('error', drop);
});

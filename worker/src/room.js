/**
 * One Durable Object instance per game room. Pure relay: it does not
 * understand game events, it only routes opaque `evt` envelopes between
 * connected sockets (broadcast or targeted) and announces join/leave. The
 * client-side gossip/reducer/commit-reveal logic (unchanged from the P2P
 * build) treats this exactly like a mesh peer — same transport port shape.
 *
 * Access is gated by the room's invite token: the first socket to say hello
 * sets the expected token (persisted in DO storage); every later socket must
 * match it or gets rejected. This replaces the WebRTC-era per-pair HMAC
 * challenge, which doesn't apply to a star topology through a trusted relay.
 *
 * Uses the WebSocket Hibernation API, so DO memory (in particular JS fields on
 * `this`) MUST NOT be relied on across messages — the instance can be evicted
 * between them. Peer identity lives in `ws.serializeAttachment`, and the
 * current peer list is always recomputed via `state.getWebSockets()`.
 */
export class RoomDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  peers(exceptWs) {
    return this.state.getWebSockets().filter(ws => ws !== exceptWs);
  }
  peerId(ws) {
    return ws.deserializeAttachment()?.peerId || null;
  }
  send(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch { /* socket already gone */ }
  }
  broadcast(obj, exceptWs) {
    const msg = JSON.stringify(obj);
    for (const ws of this.peers(exceptWs)) {
      try { ws.send(msg); } catch { /* socket already gone */ }
    }
  }

  async webSocketMessage(ws, raw) {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    if (data.t === 'hello') {
      const peerId = typeof data.id === 'string' ? data.id.slice(0, 40) : '';
      const token = typeof data.token === 'string' ? data.token : '';
      if (!peerId || !token) { ws.close(4002, 'bad hello'); return; }

      const stored = await this.state.storage.get('token');
      if (stored == null) {
        await this.state.storage.put('token', token);
      } else if (stored !== token) {
        ws.close(4001, 'bad token');
        return;
      }

      ws.serializeAttachment({ peerId });
      const existing = this.peers(ws).map(other => this.peerId(other)).filter(Boolean);
      this.send(ws, { t: 'welcome', peers: existing });
      this.broadcast({ t: 'peer-join', id: peerId }, ws);
      return;
    }

    if (data.t === 'evt') {
      const from = this.peerId(ws);
      if (!from) return; // never said hello
      const envelope = { t: 'evt', from, payload: data.payload };
      if (data.target) {
        const targetWs = this.peers(ws).find(other => this.peerId(other) === data.target);
        if (targetWs) this.send(targetWs, envelope);
      } else {
        this.broadcast(envelope, ws);
      }
    }
  }

  async webSocketClose(ws) {
    const peerId = this.peerId(ws);
    if (peerId) this.broadcast({ t: 'peer-leave', id: peerId });
  }
  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }
}

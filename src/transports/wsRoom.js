/**
 * WebSocket room transport — talks to the Durable Object relay
 * (worker/src/room.js) instead of a WebRTC mesh. Implements the exact same
 * transport port as the old Trystero adapter ({ localPeerId, publish,
 * publishTo, onEvent, onPeerJoin, onPeerLeave, leave }), so gossip.js and
 * gameClient.js — and their whole test suite — are unchanged.
 *
 * Access is gated by the room's invite token, checked server-side by the DO
 * (first socket sets it, everyone else must match). Reconnects with backoff
 * on unexpected drops so a flaky network doesn't require manually rejoining.
 */

function randomId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function createRoomInvite() {
  return { roomId: randomId(), inviteToken: randomId() };
}

export function createWsRoomTransport({
  wsUrl,
  roomId,
  inviteToken,
  name,
  onHealth,
  onError,
}) {
  if (!wsUrl) throw new Error('A relay URL is required.');
  if (!roomId) throw new Error('A room ID is required.');
  if (!inviteToken) throw new Error('An invitation token is required.');

  const localPeerId = randomId();
  const eventCbs = [];
  const joinCbs = [];
  const leaveCbs = [];
  const outbox = [];
  let ws = null;
  let open = false;
  let leaving = false;
  let attempt = 0;
  let peerCount = 0;
  let reconnectAttempts = 0;
  let reconnectTimer = null;

  const emitHealth = (status) => onHealth?.({
    localPeerId,
    status,
    peerCount,
    reconnectAttempts,
    peers: [],
  });

  function send(obj) {
    const msg = JSON.stringify(obj);
    if (open && ws?.readyState === WebSocket.OPEN) ws.send(msg);
    else outbox.push(msg);
  }
  function flush() {
    while (outbox.length && ws?.readyState === WebSocket.OPEN) ws.send(outbox.shift());
  }

  function connect() {
    const url = `${wsUrl.replace(/\/$/, '')}/room/${encodeURIComponent(roomId)}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      open = true;
      attempt = 0;
      send({ t: 'hello', id: localPeerId, token: inviteToken, name });
      flush();
      emitHealth('connected');
    };

    ws.onmessage = (ev) => {
      let data;
      try { data = JSON.parse(ev.data); } catch { return; }
      if (data.t === 'welcome') {
        peerCount = data.peers.length;
        emitHealth('connected');
        data.peers.forEach(id => joinCbs.forEach(cb => cb(id)));
      } else if (data.t === 'peer-join') {
        peerCount += 1;
        emitHealth('connected');
        joinCbs.forEach(cb => cb(data.id));
      } else if (data.t === 'peer-leave') {
        peerCount = Math.max(0, peerCount - 1);
        emitHealth('connected');
        leaveCbs.forEach(cb => cb(data.id));
      } else if (data.t === 'evt') {
        eventCbs.forEach(cb => cb(data.payload, data.from));
      }
    };

    ws.onclose = (ev) => {
      open = false;
      if (leaving) { emitHealth('closed'); return; }
      const isAuthFailure = ev.code === 4001 || ev.code === 4002;
      if (isAuthFailure) {
        onError?.({ type: 'join-error', message: 'Could not join room (bad token).' });
        emitHealth('degraded');
        return;
      }
      reconnectAttempts += 1;
      emitHealth('reconnecting');
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      onError?.({ type: 'ws-error', message: 'Relay connection error.' });
    };
  }

  connect();

  return {
    localPeerId,
    publish: wire => send({ t: 'evt', payload: wire }),
    publishTo: (peerId, wire) => send({ t: 'evt', target: peerId, payload: wire }),
    onEvent: cb => { eventCbs.push(cb); },
    onPeerJoin: cb => joinCbs.push(cb),
    onPeerLeave: cb => leaveCbs.push(cb),
    getPeerIds: () => [],
    leave() {
      leaving = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws?.close(1000, 'leave'); } catch { /* already closed */ }
    },
  };
}

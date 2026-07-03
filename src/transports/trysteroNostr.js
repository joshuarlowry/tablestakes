import {joinRoom, selfId} from '@trystero-p2p/nostr';

// Public Nostr relays used only for WebRTC signaling/peer discovery. Some
// community relays now require NIP-13 proof-of-work to publish (e.g. nos.lol),
// which Trystero doesn't do and which silently breaks re-discovery on rejoin —
// so this list favors major, PoW-free relays with community ones as backup.
const NOSTR_RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
  'wss://nostr.mom',
  'wss://relay.nostr.place',
  'wss://relay.mostr.pub',
  'wss://purplerelay.com',
  'wss://relay.snort.social',
];

const now = () => performance.now();
const encoder = new TextEncoder();

const bytesToBase64Url = bytes =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');

const randomToken = byteLength => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
};

const importHmacKey = token =>
  crypto.subtle.importKey(
    'raw',
    encoder.encode(token),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign', 'verify']
  );

const signChallenge = async (key, challenge, roomId, appNamespace) => {
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${appNamespace}:${roomId}:${challenge}`)
  );
  return bytesToBase64Url(new Uint8Array(signature));
};

async function verifyChallenge(key, challenge, proof, roomId, appNamespace) {
  const expected = await signChallenge(key, challenge, roomId, appNamespace);
  return proof === expected;
}

export function createSecureNostrInvite() {
  return {
    roomId: randomToken(18),
    inviteToken: randomToken(32),
  };
}

/**
 * Adapts the Trystero transport to the gossip transport port
 * ({ localPeerId, publish, publishTo, onEvent, onPeerJoin, onPeerLeave }) that
 * `gossip.js` / `gameClient.js` consume. All game traffic rides one `evt`
 * action; peer join/leave are fanned out to multiple subscribers. Auth, TURN,
 * and health/error reporting are unchanged.
 */
export function createTrysteroGossipPort({
  roomId,
  inviteToken,
  appNamespace,
  rtcConfig,
  onHealth,
  onError,
}) {
  const joinCbs = [];
  const leaveCbs = [];
  const transport = createTrysteroNostrTransport({
    roomId,
    inviteToken,
    appNamespace,
    rtcConfig,
    onPeerJoin: peerId => joinCbs.forEach(cb => cb(peerId)),
    onPeerLeave: peerId => leaveCbs.forEach(cb => cb(peerId)),
    onHealth,
    onError,
  });

  let eventHandler = () => {};
  const send = transport.makeAction('evt', (payload, peerId) => eventHandler(payload, peerId));

  return {
    localPeerId: transport.localPeerId,
    publish: wire => send(wire),
    publishTo: (peerId, wire) => send(wire, peerId),
    onEvent: cb => { eventHandler = cb; },
    onPeerJoin: cb => joinCbs.push(cb),
    onPeerLeave: cb => leaveCbs.push(cb),
    getPeerIds: transport.getPeerIds,
    leave: transport.leave,
  };
}

export function createTrysteroNostrTransport({
  roomId,
  inviteToken,
  appNamespace,
  rtcConfig,
  onPeerJoin,
  onPeerLeave,
  onHealth,
  onError,
}) {
  const startedAt = now();
  const peerHealth = new Map();
  const pingTimers = new Map();
  let reconnectAttempts = 0;
  let closed = false;
  let room;

  const emitHealth = (patch = {}) => {
    onHealth?.({
      localPeerId: selfId,
      status: closed ? 'closed' : room ? 'connected' : 'connecting',
      startedAt,
      elapsedMs: Math.round(now() - startedAt),
      peerCount: peerHealth.size,
      reconnectAttempts,
      peers: [...peerHealth.entries()].map(([peerId, data]) => ({
        peerId,
        ...data,
      })),
      ...patch,
    });
  };

  const ensurePeer = peerId => {
    if (!peerHealth.has(peerId)) {
      peerHealth.set(peerId, {
        joinedAt: null,
        joinMs: null,
        lastRttMs: null,
        lastPingAt: null,
        pingFailures: 0,
        disconnects: 0,
        authenticated: false,
      });
    }
    return peerHealth.get(peerId);
  };

  const authenticatePeer = async (peerId, send, receive, isInitiator) => {
    const key = await importHmacKey(inviteToken);
    const ownChallenge = randomToken(24);

    if (isInitiator) {
      await send({type: 'challenge', value: ownChallenge});
      const {data: challengeReply} = await receive();
      if (
        challengeReply?.type !== 'challenge-reply' ||
        !(await verifyChallenge(key, ownChallenge, challengeReply.proof, roomId, appNamespace)) ||
        typeof challengeReply.challenge !== 'string'
      ) {
        throw new Error('peer failed invite-token proof');
      }

      await send({
        type: 'reply',
        proof: await signChallenge(key, challengeReply.challenge, roomId, appNamespace),
      });
    } else {
      const {data: challenge} = await receive();
      if (challenge?.type !== 'challenge' || typeof challenge.value !== 'string') {
        throw new Error('peer did not send authentication challenge');
      }

      await send({
        type: 'challenge-reply',
        challenge: ownChallenge,
        proof: await signChallenge(key, challenge.value, roomId, appNamespace),
      });

      const {data: reply} = await receive();
      if (
        reply?.type !== 'reply' ||
        !(await verifyChallenge(key, ownChallenge, reply.proof, roomId, appNamespace))
      ) {
        throw new Error('peer failed invite-token proof');
      }
    }

    ensurePeer(peerId).authenticated = true;
    emitHealth();
  };

  const pingPeer = async peerId => {
    const data = ensurePeer(peerId);
    try {
      const rtt = await room.ping(peerId);
      data.lastRttMs = Math.round(rtt);
      data.lastPingAt = Date.now();
      emitHealth();
    } catch (error) {
      data.pingFailures += 1;
      emitHealth();
      onError?.({
        type: 'ping-error',
        peerId,
        message: error?.message || String(error),
      });
    }
  };

  const startPinging = peerId => {
    stopPinging(peerId);
    pingPeer(peerId);
    pingTimers.set(peerId, setInterval(() => pingPeer(peerId), 3000));
  };

  const stopPinging = peerId => {
    const timer = pingTimers.get(peerId);
    if (timer) clearInterval(timer);
    pingTimers.delete(peerId);
  };

  if (!roomId) throw new Error('A room ID is required.');
  if (!inviteToken) throw new Error('An invitation token is required.');

  room = joinRoom(
    {
      appId: appNamespace,
      password: `${appNamespace}:${roomId}:${inviteToken}`,
      relayConfig: {
        manualReconnection: true,
        urls: NOSTR_RELAY_URLS,
      },
      rtcConfig,
    },
    roomId,
    {
      handshakeTimeoutMs: 8000,
      onPeerHandshake: authenticatePeer,
      onJoinError: details => {
        onError?.({
          type: 'join-error',
          peerId: details?.peerId,
          message: details?.error?.message || String(details?.error || details),
        });
        emitHealth({status: 'degraded'});
      },
    }
  );

  room.onPeerJoin = peerId => {
    const data = ensurePeer(peerId);
    data.joinedAt = Date.now();
    data.joinMs = Math.round(now() - startedAt);
    startPinging(peerId);
    emitHealth();
    onPeerJoin?.(peerId);
  };

  room.onPeerLeave = peerId => {
    const data = ensurePeer(peerId);
    data.disconnects += 1;
    data.leftAt = Date.now();
    reconnectAttempts += 1;
    stopPinging(peerId);
    emitHealth();
    onPeerLeave?.(peerId);
  };

  window.addEventListener('online', () => {
    reconnectAttempts += 1;
    emitHealth({status: 'reconnecting'});
  });
  window.addEventListener('offline', () => emitHealth({status: 'offline'}));

  emitHealth();

  return {
    localPeerId: selfId,
    makeAction(name, handler) {
      const action = room.makeAction(name);
      action.onMessage = (payload, {peerId}) => handler(payload, peerId);
      return (payload, target) =>
        action.send(payload, target ? {target} : undefined);
    },
    getPeerIds() {
      return Object.keys(room.getPeers());
    },
    leave() {
      closed = true;
      for (const peerId of pingTimers.keys()) stopPinging(peerId);
      room.leave();
      emitHealth();
    },
  };
}

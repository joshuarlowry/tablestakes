/**
 * Epidemic gossip over a transport port.
 *
 * Depends only on the port interface (not Trystero), so it runs against the
 * in-memory mesh simulator in tests. Every unseen event is applied locally and
 * re-broadcast to direct peers; dedup by event id bounds the flood and lets
 * state reach peers you have no direct connection to (routing around a dead
 * pair via a bridge). New peers are caught up with a one-shot snapshot.
 *
 * Transport port:
 *   { localPeerId, publish(wire), publishTo(peerId, wire),
 *     onEvent(cb), onPeerJoin(cb), onPeerLeave(cb) }
 */
export function createGossip(transport, { onDeliver }) {
  const seenIds = new Set();
  const log = [];

  function ingest(ev, rebroadcast) {
    if (!ev || typeof ev.id !== 'string' || seenIds.has(ev.id)) return;
    seenIds.add(ev.id);
    log.push(ev);
    onDeliver(ev);
    if (rebroadcast) transport.publish(ev);
  }

  transport.onEvent((wire, from) => {
    if (wire && Array.isArray(wire.__snapshot)) {
      for (const ev of wire.__snapshot) ingest(ev, false);
      return;
    }
    ingest(wire, true);
  });

  // Catch a newcomer up with everything we've seen. Idempotent on their end.
  transport.onPeerJoin(peerId => {
    transport.publishTo(peerId, { __snapshot: log });
  });

  return {
    publish(ev) { ingest(ev, true); },
    log,
    seenIds,
  };
}

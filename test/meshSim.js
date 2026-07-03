/**
 * In-memory mesh simulator implementing the transport port.
 *
 * Lets tests wire arbitrary topologies and, crucially, leave pairs *unconnected*
 * (or drop a link mid-session) to model the reported Safari↔Chrome ICE failure —
 * a partition Trystero cannot route around, so the app must via gossip.
 *
 * Delivery is queued; call `flush()` to settle. A step cap turns a gossip storm
 * (missing dedup) into a test failure instead of a hang.
 */
export function createMesh() {
  const nodes = new Map();
  const queue = [];
  const droppedLinks = new Set();
  const linkKey = (a, b) => [a, b].sort().join('|');

  function node(id) {
    if (!nodes.has(id)) {
      nodes.set(id, { evCbs: [], joinCbs: [], leaveCbs: [], links: new Set() });
    }
    return nodes.get(id);
  }
  const linked = (a, b) => node(a).links.has(b) && !droppedLinks.has(linkKey(a, b));

  function transportFor(id) {
    node(id);
    return {
      localPeerId: id,
      publish(wire) {
        for (const peer of node(id).links) {
          if (linked(id, peer)) queue.push({ to: peer, from: id, wire });
        }
      },
      publishTo(peer, wire) {
        if (linked(id, peer)) queue.push({ to: peer, from: id, wire });
      },
      onEvent(cb) { node(id).evCbs.push(cb); },
      onPeerJoin(cb) { node(id).joinCbs.push(cb); },
      onPeerLeave(cb) { node(id).leaveCbs.push(cb); },
    };
  }

  function connect(a, b) {
    node(a).links.add(b);
    node(b).links.add(a);
    node(a).joinCbs.forEach(cb => cb(b));
    node(b).joinCbs.forEach(cb => cb(a));
  }

  // Model a WebRTC ICE failure: the link stops carrying traffic but no clean
  // "leave" fires (peers still think they're in the room).
  function drop(a, b) {
    droppedLinks.add(linkKey(a, b));
  }

  // Clean departure (tab closed): fire onPeerLeave to former neighbours.
  function leave(a) {
    for (const peer of [...node(a).links]) {
      node(peer).links.delete(a);
      node(peer).leaveCbs.forEach(cb => cb(a));
    }
    node(a).links.clear();
  }

  function flush(maxSteps = 100000) {
    let steps = 0;
    while (queue.length) {
      if (++steps > maxSteps) throw new Error('mesh did not settle — possible gossip storm');
      const { to, from, wire } = queue.shift();
      node(to).evCbs.forEach(cb => cb(wire, from));
    }
  }

  const hasQueued = () => queue.length > 0;

  return { transportFor, connect, drop, leave, flush, hasQueued };
}

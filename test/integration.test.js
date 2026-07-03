import { describe, it, expect, beforeEach } from 'vitest';
import { createMesh } from './meshSim.js';
import { createGameClient } from '../src/game/gameClient.js';

let clock;
beforeEach(() => { clock = { t: 1000 }; });

function makeClient(mesh, id, name) {
  let n = 0;
  return createGameClient({
    transport: mesh.transportFor(id),
    name,
    now: () => clock.t,
    randomNonce: () => `${id}-nonce-${n++}`,
  });
}

async function settle(mesh, clients) {
  for (let i = 0; i < 200; i++) {
    mesh.flush();
    let changed = false;
    for (const c of clients) if (await c.processVerifications()) changed = true;
    if (!mesh.hasQueued() && !changed) return;
  }
  throw new Error('did not settle');
}

// Comparable projection of a client's view (order-normalized).
const snap = c => {
  const v = c.getView();
  return {
    phase: v.phase,
    round: v.round,
    game: v.game,
    facilitator: v.facilitator,
    outcome: v.result?.outcome ?? null,
    winners: v.result?.winners ? [...v.result.winners].sort() : null,
    avg: v.result?.avg ?? null,
  };
};

describe('3 fully-connected peers', () => {
  it('play a full RPS round to an identical synced verdict, then Fist-to-Five', async () => {
    const mesh = createMesh();
    const a = makeClient(mesh, 'a', 'Ana');
    const b = makeClient(mesh, 'b', 'Ben');
    const c = makeClient(mesh, 'c', 'Cy');
    mesh.connect('a', 'b'); mesh.connect('a', 'c'); mesh.connect('b', 'c');
    [a, b, c].forEach(x => x.join());
    await settle(mesh, [a, b, c]);

    expect(a.getView().facilitator).toBe('a');
    expect(a.getView().isFacilitator).toBe(true);
    expect(b.getView().isFacilitator).toBe(false);

    a.selectGame('rps');
    await settle(mesh, [a, b, c]);
    expect([a, b, c].every(x => x.getView().phase === 'pick')).toBe(true);

    await a.lock('rock');
    await b.lock('scissors');
    await c.lock('rock');
    await settle(mesh, [a, b, c]);

    const views = [snap(a), snap(b), snap(c)];
    expect(views[0]).toEqual(views[1]);
    expect(views[1]).toEqual(views[2]);
    expect(views[0].phase).toBe('reveal');
    expect(views[0].outcome).toBe('win');
    expect(views[0].winners).toEqual(['a', 'c']); // rock beats scissors

    // second round, Fist-to-Five
    a.selectGame('f2f');
    await settle(mesh, [a, b, c]);
    await a.lock(4); await b.lock(4); await c.lock(5);
    await settle(mesh, [a, b, c]);
    expect(snap(a)).toEqual(snap(c));
    expect(a.getView().phase).toBe('reveal');
    expect(a.getView().result.consensus).toBe(true);
  });
});

describe('partition (the reported bug)', () => {
  it('converges through a bridge when one pair never connects', async () => {
    const mesh = createMesh();
    const a = makeClient(mesh, 'a', 'Ana');
    const b = makeClient(mesh, 'b', 'Ben');
    const c = makeClient(mesh, 'c', 'Cy');
    // line topology: a <-> b <-> c, but a and c NEVER connect (ICE failure)
    mesh.connect('a', 'b'); mesh.connect('b', 'c');
    [a, b, c].forEach(x => x.join());
    await settle(mesh, [a, b, c]);

    // all three agree on one facilitator despite the partition
    expect(a.getView().facilitator).toBe('a');
    expect(b.getView().facilitator).toBe('a');
    expect(c.getView().facilitator).toBe('a');

    a.selectGame('rps');
    await settle(mesh, [a, b, c]);
    await a.lock('paper'); await b.lock('rock'); await c.lock('rock');
    await settle(mesh, [a, b, c]);

    // a's pick reached c (and c's reached a) only via b — state converges
    expect(snap(a)).toEqual(snap(c));
    expect(a.getView().phase).toBe('reveal');
    expect(a.getView().result.winners).toEqual(['a']); // paper beats rock
  });
});

describe('facilitator determinism', () => {
  it('re-derives the facilitator when the facilitator leaves — no election', async () => {
    const mesh = createMesh();
    const a = makeClient(mesh, 'a', 'Ana');
    const b = makeClient(mesh, 'b', 'Ben');
    const c = makeClient(mesh, 'c', 'Cy');
    mesh.connect('a', 'b'); mesh.connect('a', 'c'); mesh.connect('b', 'c');
    [a, b, c].forEach(x => x.join());
    await settle(mesh, [a, b, c]);
    expect(b.getView().facilitator).toBe('a');

    a.leave();
    await settle(mesh, [a, b, c]);
    expect(b.getView().facilitator).toBe('b');
    expect(b.getView().isFacilitator).toBe(true);
    expect(c.getView().facilitator).toBe('b');
  });
});

describe('late joiner', () => {
  it('is caught up by snapshot and finishes the round', async () => {
    const mesh = createMesh();
    const a = makeClient(mesh, 'a', 'Ana');
    const b = makeClient(mesh, 'b', 'Ben');
    mesh.connect('a', 'b');
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);

    a.selectGame('rps');
    await settle(mesh, [a, b]);
    await a.lock('rock');
    await settle(mesh, [a, b]);

    // c arrives mid-round via a bridge to b
    const c = makeClient(mesh, 'c', 'Cy');
    mesh.connect('b', 'c');
    c.join();
    await settle(mesh, [a, b, c]);
    expect(c.getView().game).toBe('rps');       // snapshot delivered the round

    await b.lock('scissors');
    await c.lock('paper');
    await settle(mesh, [a, b, c]);
    expect(snap(a)).toEqual(snap(c));
    expect(a.getView().phase).toBe('reveal');
    expect(Object.keys(a.getView().revealPicks).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('stuck peer', () => {
  it('does not deadlock: force-reveal releases the round', async () => {
    const mesh = createMesh();
    const a = makeClient(mesh, 'a', 'Ana');
    const b = makeClient(mesh, 'b', 'Ben');
    const c = makeClient(mesh, 'c', 'Cy');
    mesh.connect('a', 'b'); mesh.connect('a', 'c'); mesh.connect('b', 'c');
    [a, b, c].forEach(x => x.join());
    await settle(mesh, [a, b, c]);

    a.selectGame('rps');
    await settle(mesh, [a, b, c]);
    await a.lock('rock'); await b.lock('paper'); // c never locks
    await settle(mesh, [a, b, c]);
    expect(a.getView().phase).toBe('pick');
    expect(a.getView().remaining).toBe(1);

    a.forceReveal();
    await settle(mesh, [a, b, c]);
    expect(a.getView().phase).toBe('reveal');
    expect(Object.keys(a.getView().revealPicks).sort()).toEqual(['a', 'b']);
  });

  it('does not deadlock: a departing peer unblocks the reveal', async () => {
    const mesh = createMesh();
    const a = makeClient(mesh, 'a', 'Ana');
    const b = makeClient(mesh, 'b', 'Ben');
    const c = makeClient(mesh, 'c', 'Cy');
    mesh.connect('a', 'b'); mesh.connect('a', 'c'); mesh.connect('b', 'c');
    [a, b, c].forEach(x => x.join());
    await settle(mesh, [a, b, c]);

    a.selectGame('rps');
    await settle(mesh, [a, b, c]);
    await a.lock('rock'); await b.lock('scissors'); // c stuck
    await settle(mesh, [a, b, c]);
    expect(a.getView().phase).toBe('pick');

    c.leave();
    await settle(mesh, [a, b, c]);
    expect(a.getView().phase).toBe('reveal');
    expect(a.getView().result.winners).toEqual(['a']); // rock beats scissors, 1v1
  });
});

describe('gossip termination', () => {
  it('floods once over a triangle without a storm', async () => {
    const mesh = createMesh();
    const a = makeClient(mesh, 'a', 'Ana');
    const b = makeClient(mesh, 'b', 'Ben');
    const c = makeClient(mesh, 'c', 'Cy');
    mesh.connect('a', 'b'); mesh.connect('a', 'c'); mesh.connect('b', 'c');
    a.join();                              // single presence into a looped topology
    await settle(mesh, [a, b, c]);         // settle() throws if the flood doesn't dedup
    expect(b.getView().names.a).toBe('Ana');
    expect(c.getView().names.a).toBe('Ana');
  });
});

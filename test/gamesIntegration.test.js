import { describe, it, expect, beforeEach } from 'vitest';
import { createMesh } from './meshSim.js';
import { createGameClient } from '../src/game/gameClient.js';

let clock;
beforeEach(() => { clock = { t: 1000 }; });

function mk(mesh, id, name, isCreator = false) {
  let n = 0;
  return createGameClient({
    transport: mesh.transportFor(id), name, isCreator,
    now: () => clock.t, randomNonce: () => `${id}-nonce-${n++}`,
  });
}
async function settle(mesh, clients) {
  for (let i = 0; i < 200; i++) {
    mesh.flush();
    let ch = false;
    for (const c of clients) if (await c.processVerifications()) ch = true;
    if (!mesh.hasQueued() && !ch) return;
  }
  throw new Error('did not settle');
}
function trio({ partition = false } = {}) {
  const mesh = createMesh();
  const a = mk(mesh, 'a', 'Ana', true);
  const b = mk(mesh, 'b', 'Ben');
  const c = mk(mesh, 'c', 'Cy');
  mesh.connect('a', 'b'); mesh.connect('b', 'c');
  if (!partition) mesh.connect('a', 'c');
  return { mesh, a, b, c };
}

describe('ranked choice over the mesh', () => {
  it('config replicates, rankings stay blind, verdict converges — across a partition', async () => {
    const { mesh, a, b, c } = trio({ partition: true }); // a↔c only via b
    [a, b, c].forEach(x => x.join());
    await settle(mesh, [a, b, c]);

    a.selectGame('ranked', { options: ['Alpha', 'Beta', 'Gamma'] });
    await settle(mesh, [a, b, c]);
    expect(c.getView().config.options).toEqual(['Alpha', 'Beta', 'Gamma']); // config crossed the bridge

    await a.lock([0, 1, 2]);
    await b.lock([0, 2, 1]);
    expect(c.getView().phase).toBe('pick'); // blind until all in
    await c.lock([1, 0, 2]);
    await settle(mesh, [a, b, c]);

    const views = [a, b, c].map(x => x.getView());
    expect(views.every(v => v.phase === 'reveal')).toBe(true);
    expect(views[0].result.winner).toBe('Alpha'); // Borda: A=2+2+1=5, B=1+0+2=3, C=0+1+0=1
    expect(views[1].result.winner).toBe('Alpha');
    expect(views[2].result.winner).toBe('Alpha');
  });
});

describe('late joiner and config', () => {
  it('a snapshot catches a newcomer up with the motion question', async () => {
    const mesh = createMesh();
    const a = mk(mesh, 'a', 'Ana', true);
    const b = mk(mesh, 'b', 'Ben');
    mesh.connect('a', 'b');
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);

    a.selectGame('motion', { question: 'Ship it on Friday?' });
    await settle(mesh, [a, b]);

    const c = mk(mesh, 'c', 'Cy');
    mesh.connect('b', 'c');
    c.join();
    await settle(mesh, [a, b, c]);
    expect(c.getView().game).toBe('motion');
    expect(c.getView().config.question).toBe('Ship it on Friday?');

    await a.lock('yes'); await b.lock('yes'); await c.lock('no');
    await settle(mesh, [a, b, c]);
    expect(a.getView().result.passed).toBe(true);
    expect(c.getView().result.yes).toBe(2);
  });
});

describe('turn picker over the mesh', () => {
  it('converges to the same winner on every peer', async () => {
    const { mesh, a, b, c } = trio();
    [a, b, c].forEach(x => x.join());
    await settle(mesh, [a, b, c]);

    a.selectGame('turn', { excluded: [] });
    await settle(mesh, [a, b, c]);
    // each locks its random nonce (injected deterministic here)
    await a.lock('a-rand-1'); await b.lock('b-rand-1'); await c.lock('c-rand-1');
    await settle(mesh, [a, b, c]);

    const winners = [a, b, c].map(x => x.getView().result.winner);
    expect(winners[0]).toBe(winners[1]);
    expect(winners[1]).toBe(winners[2]);
    expect(['a', 'b', 'c']).toContain(winners[0]);
  });
});

describe('health check over the mesh', () => {
  it('one blind submission per player, converged category lights', async () => {
    const { mesh, a, b, c } = trio();
    [a, b, c].forEach(x => x.join());
    await settle(mesh, [a, b, c]);

    a.selectGame('health');
    await settle(mesh, [a, b, c]);
    const cats = a.getView().config.categories;
    expect(cats.length).toBe(5);
    const rate = light => Object.fromEntries(cats.map((_, i) => [i, light]));
    await a.lock(rate('g')); await b.lock(rate('g')); await c.lock({ ...rate('g'), 0: 'r' });
    await settle(mesh, [a, b, c]);

    const v = b.getView();
    expect(v.phase).toBe('reveal');
    expect(v.result.categories[0].light).toBe('g'); // 2g 1r → majority g
    expect(v.result.categories[1].light).toBe('g');
    expect(v.result.overall).toBe('g');
    expect(v.result).toEqual(c.getView().result);
  });
});

describe('hostile inputs', () => {
  it('a malformed reveal is excluded from the verdict without breaking it', async () => {
    const { mesh, a, b } = trio();
    const { c } = { c: null };
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);

    a.selectGame('points');
    await settle(mesh, [a, b]);
    await a.lock(5);
    await b.lock(999); // not on the scale — validatePick must reject at reveal
    await settle(mesh, [a, b]);

    const v = a.getView();
    expect(v.phase).toBe('reveal');
    expect(Object.keys(v.revealPicks)).toEqual(['a']); // b's garbage filtered
    expect(v.result.avg).toBe(5);
  });
});

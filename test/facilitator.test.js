import { describe, it, expect } from 'vitest';
import { createMesh } from './meshSim.js';
import { createGameClient } from '../src/game/gameClient.js';

function mk(mesh, id, name, isCreator = false) {
  let n = 0;
  return createGameClient({
    transport: mesh.transportFor(id), name, isCreator,
    now: () => 1000, randomNonce: () => `${id}-${n++}`,
  });
}
async function settle(mesh, clients) {
  for (let i = 0; i < 100; i++) {
    mesh.flush();
    let ch = false;
    for (const c of clients) if (await c.processVerifications()) ch = true;
    if (!mesh.hasQueued() && !ch) return;
  }
  throw new Error('did not settle');
}
// creator 'z' deliberately has the LARGEST id, to prove facilitator is NOT the
// smallest-id peer.
function trio() {
  const mesh = createMesh();
  const z = mk(mesh, 'z', 'Zoe', true);
  const a = mk(mesh, 'a', 'Ana');
  const b = mk(mesh, 'b', 'Ben');
  mesh.connect('z', 'a'); mesh.connect('z', 'b'); mesh.connect('a', 'b');
  return { mesh, z, a, b };
}

describe('facilitator register', () => {
  it('is the creator, not the smallest id, and sticks when smaller peers join', async () => {
    const { mesh, z, a, b } = trio();
    z.join();                       // creator seeds itself
    await settle(mesh, [z, a, b]);
    a.join(); b.join();             // smaller ids join afterwards
    await settle(mesh, [z, a, b]);

    for (const c of [z, a, b]) expect(c.getView().facilitator).toBe('z');
    expect(z.getView().isFacilitator).toBe(true);
    expect(a.getView().isFacilitator).toBe(false);
  });

  it('can be handed off and then sticks with the new holder', async () => {
    const { mesh, z, a, b } = trio();
    [z, a, b].forEach(c => c.join());
    await settle(mesh, [z, a, b]);
    expect(a.getView().facilitator).toBe('z');

    z.handOff('a');
    await settle(mesh, [z, a, b]);
    for (const c of [z, a, b]) expect(c.getView().facilitator).toBe('a');
    expect(a.getView().isFacilitator).toBe(true);
    expect(z.getView().isFacilitator).toBe(false);

    // a smaller peer id ('b' < ... ) still does not steal it — sticky
    expect(b.getView().facilitator).toBe('a');
  });

  it('recovers to the smallest live peer when the facilitator leaves', async () => {
    const { mesh, z, a, b } = trio();
    [z, a, b].forEach(c => c.join());
    await settle(mesh, [z, a, b]);
    expect(b.getView().facilitator).toBe('z');

    z.leave();
    await settle(mesh, [z, a, b]);
    for (const c of [a, b]) expect(c.getView().facilitator).toBe('a');
    expect(a.getView().isFacilitator).toBe(true);
    expect(b.getView().isFacilitator).toBe(false);
  });

  it('only the facilitator can hand off', async () => {
    const { mesh, z, a, b } = trio();
    [z, a, b].forEach(c => c.join());
    await settle(mesh, [z, a, b]);
    a.handOff('b');                 // a is not the facilitator → no-op
    await settle(mesh, [z, a, b]);
    expect(z.getView().facilitator).toBe('z');
  });
});

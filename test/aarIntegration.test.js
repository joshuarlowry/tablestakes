import { describe, it, expect } from 'vitest';
import { createMesh } from './meshSim.js';
import { createGameClient } from '../src/game/gameClient.js';

function mk(mesh, id, name, isCreator = false) {
  return createGameClient({
    transport: mesh.transportFor(id), name, isCreator,
    now: () => 1000, randomNonce: () => `${id}-nonce`, storage: null,
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
function pair() {
  const mesh = createMesh();
  const a = mk(mesh, 'a', 'Ana', true);
  const b = mk(mesh, 'b', 'Ben');
  mesh.connect('a', 'b');
  return { mesh, a, b };
}
const tl = view => view.board.columns.find(c => c.key === 'timeline').cards;

describe('AAR — live collaborative debrief', () => {
  it('cards are visible immediately (no blind step) and converge', async () => {
    const { mesh, a, b } = pair();
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('aar', { privacy: 'live' });
    await settle(mesh, [a, b]);

    a.addCard('planned', 'Ship the migration');
    b.addCard('happened', 'Relay flaked once');
    await settle(mesh, [a, b]);

    const planned = v => v.board.columns.find(c => c.key === 'planned').cards.map(c => c.text);
    const happened = v => v.board.columns.find(c => c.key === 'happened').cards.map(c => c.text);
    expect(planned(b.getView())).toEqual(['Ship the migration']);
    expect(happened(a.getView())).toEqual(['Relay flaked once']);
  });

  it('timeline sorts chronologically across authors and after a retime', async () => {
    const { mesh, a, b } = pair();
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('aar', { privacy: 'live' });
    await settle(mesh, [a, b]);

    a.addCard('timeline', 'Standup', { time: '9:00' });
    const incident = b.addCard('timeline', 'Incident', { time: '11:30' });
    a.addCard('timeline', 'Kickoff', { time: '8:00' });
    await settle(mesh, [a, b]);

    expect(tl(a.getView()).map(c => c.text)).toEqual(['Kickoff', 'Standup', 'Incident']);
    expect(tl(b.getView()).map(c => c.text)).toEqual(['Kickoff', 'Standup', 'Incident']);

    // Ana (not the author) retimes Ben's Incident to 07:30 — it must move to top
    // on both peers (retiming is open to everyone, and must survive dedup).
    a.retimeCard(incident, '7:30');
    await settle(mesh, [a, b]);
    expect(tl(a.getView()).map(c => c.text)).toEqual(['Incident', 'Kickoff', 'Standup']);
    expect(tl(b.getView()).map(c => c.text)).toEqual(['Incident', 'Kickoff', 'Standup']);

    // A second retime on the same card must not be swallowed by the dedup id.
    a.retimeCard(incident, '23:00');
    await settle(mesh, [a, b]);
    expect(tl(a.getView()).map(c => c.text)).toEqual(['Kickoff', 'Standup', 'Incident']);
    expect(tl(b.getView()).map(c => c.text)).toEqual(['Kickoff', 'Standup', 'Incident']);
  });

  it('a late joiner rebuilds the full timeline via snapshot', async () => {
    const { mesh, a, b } = pair();
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('aar', { privacy: 'live' });
    await settle(mesh, [a, b]);
    a.addCard('timeline', 'First', { time: '9:00' });
    b.addCard('timeline', 'Second', { time: '10:00' });
    await settle(mesh, [a, b]);

    const c = mk(mesh, 'c', 'Cy');
    mesh.connect('b', 'c');
    c.join();
    await settle(mesh, [a, b, c]);
    expect(tl(c.getView()).map(x => x.text)).toEqual(['First', 'Second']);
  });
});

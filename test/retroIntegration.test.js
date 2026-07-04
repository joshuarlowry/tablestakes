import { describe, it, expect } from 'vitest';
import { createMesh } from './meshSim.js';
import { createGameClient } from '../src/game/gameClient.js';
import { orderBetween } from '../src/game/order.js';

function mk(mesh, id, name, isCreator = false) {
  return createGameClient({
    transport: mesh.transportFor(id), name, isCreator,
    now: () => 1000, randomNonce: () => `${id}-nonce`,
    storage: null, // no localStorage in the test environment; irrelevant here
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
const wellCards = view => view.board.columns.find(c => c.key === 'well').cards;

describe('retro — live privacy', () => {
  it('cards appear to everyone immediately', async () => {
    const { mesh, a, b } = pair();
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('retro', { template: 'wwda', privacy: 'live' });
    await settle(mesh, [a, b]);

    a.addCard('well', 'Shipped on time');
    await settle(mesh, [a, b]);
    expect(wellCards(b.getView()).map(c => c.text)).toEqual(['Shipped on time']);
  });
});

describe('retro — blind privacy', () => {
  it('cards stay invisible to others until reveal, then converge', async () => {
    const { mesh, a, b } = pair();
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('retro', { template: 'wwda', privacy: 'blind' }); // a is facilitator (creator)
    await settle(mesh, [a, b]);

    a.addCard('well', "Ana's private note");
    b.addCard('not', "Ben's private gripe");
    await settle(mesh, [a, b]);

    // each author sees their own draft locally...
    expect(wellCards(a.getView()).map(c => c.text)).toEqual(["Ana's private note"]);
    // ...but not the other's
    expect(wellCards(b.getView())).toEqual([]);
    expect(b.getView().board.columns.find(c => c.key === 'not').cards.map(c => c.text)).toEqual(["Ben's private gripe"]);
    expect(a.getView().board.columns.find(c => c.key === 'not').cards).toEqual([]);

    a.revealCards();
    await settle(mesh, [a, b]);

    expect(wellCards(a.getView()).map(c => c.text)).toEqual(["Ana's private note"]);
    expect(wellCards(b.getView()).map(c => c.text)).toEqual(["Ana's private note"]);
    const notA = a.getView().board.columns.find(c => c.key === 'not').cards.map(c => c.text);
    const notB = b.getView().board.columns.find(c => c.key === 'not').cards.map(c => c.text);
    expect(notA).toEqual(["Ben's private gripe"]);
    expect(notB).toEqual(["Ben's private gripe"]);
  });

  it('only the facilitator can reveal', async () => {
    const { mesh, a, b } = pair();
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('retro', { template: 'wwda', privacy: 'blind' });
    await settle(mesh, [a, b]);
    b.addCard('well', 'hidden');
    b.revealCards(); // b is not facilitator — no-op
    await settle(mesh, [a, b]);
    expect(wellCards(a.getView())).toEqual([]);
  });
});

describe('retro — everyone can rearrange', () => {
  it('a non-author can move a published card, and it converges', async () => {
    const { mesh, a, b } = pair();
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('retro', { template: 'wwda', privacy: 'live' });
    await settle(mesh, [a, b]);
    const cardId = a.addCard('well', 'move me');
    await settle(mesh, [a, b]);

    b.moveCard(cardId, 'actions', 'm'); // Ben (not the author) moves Ana's card
    await settle(mesh, [a, b]);

    const inActions = view => view.board.columns.find(c => c.key === 'actions').cards.map(c => c.text);
    expect(inActions(a.getView())).toEqual(['move me']);
    expect(inActions(b.getView())).toEqual(['move me']);
  });

  it('a card can be moved more than once (regression: dedup id must advance)', async () => {
    // The reducer previously let the payload's stale ver override event.ver, so
    // stored ver stuck at 1 and every move re-emitted the same gossip id
    // `card:<id>:2` — dedup dropped every move after the first. This reproduces
    // the exact 2-tab failure: the second move silently did nothing.
    const { mesh, a, b } = pair();
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('retro', { template: 'wwda', privacy: 'live' });
    await settle(mesh, [a, b]);
    const cardId = a.addCard('well', 'wanderer');
    await settle(mesh, [a, b]);

    const colOf = (view, key) => view.board.columns.find(c => c.key === key).cards.map(c => c.text);
    b.moveCard(cardId, 'not', 'm');
    await settle(mesh, [a, b]);
    expect(colOf(b.getView(), 'not')).toEqual(['wanderer']);

    b.moveCard(cardId, 'actions', 'm'); // second move — must NOT be swallowed
    await settle(mesh, [a, b]);
    expect(colOf(a.getView(), 'actions')).toEqual(['wanderer']);
    expect(colOf(b.getView(), 'actions')).toEqual(['wanderer']);
    expect(colOf(a.getView(), 'not')).toEqual([]);
  });

  it('blind-mode cards from different authors get distinct keys and reorder cleanly', async () => {
    // Both authors draft into the same column starting from ''. Without
    // per-actor key tagging both first cards would be 'i' and collide on
    // reveal, making a move between them impossible.
    const { mesh, a, b } = pair();
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('retro', { template: 'wwda', privacy: 'blind' });
    await settle(mesh, [a, b]);
    a.addCard('well', 'A-card');
    const bCard = b.addCard('well', 'B-card');
    await settle(mesh, [a, b]);
    a.revealCards();
    await settle(mesh, [a, b]);

    const keys = wellCards(a.getView()).map(c => c.order);
    expect(new Set(keys).size).toBe(keys.length); // all distinct — no collision

    // Move B-card to the very top; it must land before A-card on both peers.
    const topKey = wellCards(a.getView())[0].order;
    b.moveCard(bCard, 'well', orderBetween('', topKey));
    await settle(mesh, [a, b]);
    expect(wellCards(a.getView()).map(c => c.text)).toEqual(['B-card', 'A-card']);
    expect(wellCards(b.getView()).map(c => c.text)).toEqual(['B-card', 'A-card']);
  });

  it('only the author can edit or delete a card', async () => {
    const { mesh, a, b } = pair();
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('retro', { template: 'wwda', privacy: 'live' });
    await settle(mesh, [a, b]);
    const cardId = a.addCard('well', 'original');
    await settle(mesh, [a, b]);

    b.editCard(cardId, 'hijacked');   // not the author — must be ignored
    b.deleteCard(cardId);             // not the author — must be ignored
    await settle(mesh, [a, b]);
    expect(wellCards(a.getView()).map(c => c.text)).toEqual(['original']);
  });
});

describe('retro — late joiner', () => {
  it('gets the full board via snapshot', async () => {
    const mesh = createMesh();
    const a = mk(mesh, 'a', 'Ana', true);
    const b = mk(mesh, 'b', 'Ben');
    mesh.connect('a', 'b');
    [a, b].forEach(x => x.join());
    await settle(mesh, [a, b]);
    a.selectGame('retro', { template: 'ssc', privacy: 'live' });
    await settle(mesh, [a, b]);
    a.addCard('start', 'pair more');
    await settle(mesh, [a, b]);

    const c = mk(mesh, 'c', 'Cy');
    mesh.connect('b', 'c');
    c.join();
    await settle(mesh, [a, b, c]);
    expect(c.getView().board.columns.find(col => col.key === 'start').cards.map(x => x.text)).toEqual(['pair more']);
  });
});

import { describe, it, expect } from 'vitest';
import { reduceAll, deriveView, initialState } from '../src/game/gameState.js';
import { boardToMarkdown } from '../src/game/exportMd.js';

const selectRetro = (from, round, template = 'wwda', privacy = 'live') =>
  ({ type: 'select-game', from, round, game: 'retro', config: { template, privacy } });
const card = (from, round, cardId, ver, c) =>
  ({ type: 'card', from, round, cardId, ver, card: c });

function shuffle(arr, seed = 3) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe('retro board reducer', () => {
  const events = [
    selectRetro('a', 1),
    card('a', 1, 'a:0', 1, { text: 'Shipped v2', col: 'well', order: 'm', author: 'a', deleted: false }),
    card('b', 1, 'b:0', 1, { text: 'Too many meetings', col: 'not', order: 'm', author: 'b', deleted: false }),
    card('a', 1, 'a:0', 2, { text: 'Shipped v2 on time', col: 'well', order: 'm', author: 'a', deleted: false }),
  ];

  it('converges regardless of event order (later version wins)', () => {
    const base = reduceAll(events);
    for (let s = 1; s <= 5; s++) {
      expect(reduceAll(shuffle(events, s))).toEqual(base);
    }
    expect(base.cards[1]['a:0'].text).toBe('Shipped v2 on time');
    expect(base.cards[1]['a:0'].ver).toBe(2);
  });

  it('is idempotent under duplicate delivery', () => {
    const once = reduceAll(events);
    const twice = reduceAll([...events, ...events]);
    expect(twice).toEqual(once);
  });

  it('a tombstoned card disappears from the board but stays deletable-idempotent', () => {
    const del = reduceAll([...events, card('b', 1, 'b:0', 2, { text: 'Too many meetings', col: 'not', order: 'm', author: 'b', deleted: true })]);
    const view = deriveView(del, 'a', ['a', 'b']);
    const notCol = view.board.columns.find(c => c.key === 'not');
    expect(notCol.cards).toEqual([]);
  });
});

describe('deriveView board derivation', () => {
  it('produces the WWDA template columns sorted by order', () => {
    const state = reduceAll([
      selectRetro('a', 1, 'wwda'),
      card('a', 1, 'x', 1, { text: 'second', col: 'well', order: 'n', author: 'a', deleted: false }),
      card('a', 1, 'y', 1, { text: 'first', col: 'well', order: 'a', author: 'a', deleted: false }),
    ]);
    const view = deriveView(state, 'a', ['a']);
    expect(view.phase).toBe('board');
    expect(view.board.columns.map(c => c.key)).toEqual(['well', 'not', 'actions']);
    const wellCards = view.board.columns[0].cards.map(c => c.text);
    expect(wellCards).toEqual(['first', 'second']);
  });

  it('SSC template has Start/Stop/Continue', () => {
    const state = reduceAll([selectRetro('a', 1, 'ssc')]);
    const view = deriveView(state, 'a', ['a']);
    expect(view.board.columns.map(c => c.key)).toEqual(['start', 'stop', 'continue']);
  });
});

describe('markdown export', () => {
  it('renders columns and cards, empty columns get a placeholder', () => {
    const state = reduceAll([
      selectRetro('a', 1, 'wwda'),
      card('a', 1, 'x', 1, { text: 'Great release', col: 'well', order: 'a', author: 'a', deleted: false }),
    ]);
    const view = deriveView(state, 'a', ['a']);
    view.names = { a: 'Ana' };
    const md = boardToMarkdown(view, { title: 'Sprint 12 Retro' });
    expect(md).toContain('# Sprint 12 Retro');
    expect(md).toContain('## Went Well');
    expect(md).toContain('- Great release — _Ana_');
    expect(md).toContain('## Didn’t Go Well');
    expect(md).toContain('_(empty)_');
  });
});

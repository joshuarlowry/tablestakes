import { describe, it, expect } from 'vitest';
import { reduceAll, deriveView } from '../src/game/gameState.js';
import { parseTime, compareTimeline } from '../src/games/aar.js';
import { timelineToMarkdown } from '../src/game/exportMd.js';

const selectAar = (from, round) =>
  ({ type: 'select-game', from, round, game: 'aar', config: { privacy: 'live' } });
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
const tl = view => view.board.columns.find(c => c.key === 'timeline').cards;

describe('parseTime', () => {
  it('parses a spread of forgiving formats to minutes-since-midnight', () => {
    expect(parseTime('9')).toBe(9 * 60);
    expect(parseTime('9:30')).toBe(9 * 60 + 30);
    expect(parseTime('09:05')).toBe(9 * 60 + 5);
    expect(parseTime('14:00')).toBe(14 * 60);
    expect(parseTime('9am')).toBe(9 * 60);
    expect(parseTime('12am')).toBe(0);
    expect(parseTime('12pm')).toBe(12 * 60);
    expect(parseTime('2:15pm')).toBe(14 * 60 + 15);
    expect(parseTime(' 2:15 pm ')).toBe(14 * 60 + 15);
  });
  it('returns null for unparseable / out-of-range input', () => {
    for (const bad of ['', 'noon', '25:00', '10:75', '13pm', 'abc', null, undefined, 42]) {
      expect(parseTime(bad)).toBeNull();
    }
  });
});

describe('compareTimeline', () => {
  it('orders parsed times chronologically, unparseable last, ties by order/cardId', () => {
    const cards = [
      { cardId: 'z', time: '', order: 'a' },       // unparseable → last
      { cardId: 'b', time: '9:00', order: 'm' },
      { cardId: 'a', time: '9:00', order: 'm' },    // same time+order → cardId breaks tie
      { cardId: 'c', time: '8:30', order: 'x' },
      { cardId: 'y', time: 'nope', order: 'b' },    // unparseable → last, order breaks tie
    ];
    const sorted = [...cards].sort(compareTimeline).map(c => c.cardId);
    expect(sorted).toEqual(['c', 'a', 'b', 'z', 'y']);
  });
});

describe('AAR board derivation', () => {
  const events = [
    selectAar('a', 1),
    card('a', 1, 'a:0', 1, { text: 'Standup', col: 'timeline', order: 'i', time: '9:00', author: 'a', deleted: false }),
    card('b', 1, 'b:0', 1, { text: 'Incident', col: 'timeline', order: 'i', time: '8:30', author: 'b', deleted: false }),
    card('a', 1, 'a:1', 1, { text: 'No timestamp yet', col: 'timeline', order: 'z', time: '', author: 'a', deleted: false }),
    card('a', 1, 'a:2', 1, { text: 'We planned a demo', col: 'planned', order: 'i', author: 'a', deleted: false }),
  ];

  it('sorts the timeline column chronologically regardless of insert/event order', () => {
    const base = reduceAll(events);
    const view = deriveView(base, 'a', ['a', 'b']);
    expect(tl(view).map(c => c.text)).toEqual(['Incident', 'Standup', 'No timestamp yet']);
    // Non-timeline columns still use plain order.
    expect(view.board.columns.find(c => c.key === 'planned').cards.map(c => c.text)).toEqual(['We planned a demo']);
    for (let s = 1; s <= 5; s++) {
      const shuffled = deriveView(reduceAll(shuffle(events, s)), 'a', ['a', 'b']);
      expect(tl(shuffled).map(c => c.text)).toEqual(['Incident', 'Standup', 'No timestamp yet']);
    }
  });

  it('a concurrent time edit converges under any event order (LWW by ver)', () => {
    const edited = [
      ...events,
      // b retimes a's Standup card to 7:00 (ver 2) — should win and re-sort first
      card('b', 1, 'a:0', 2, { text: 'Standup', col: 'timeline', order: 'i', time: '7:00', author: 'a', deleted: false }),
    ];
    const base = reduceAll(edited);
    for (let s = 1; s <= 5; s++) expect(reduceAll(shuffle(edited, s))).toEqual(base);
    const view = deriveView(base, 'a', ['a', 'b']);
    expect(tl(view).map(c => c.text)).toEqual(['Standup', 'Incident', 'No timestamp yet']);
    expect(view.board.columns.find(c => c.key === 'timeline').cards[0].time).toBe('7:00');
  });

  it('exports markdown with a chronological timeline', () => {
    const view = deriveView(reduceAll(events), 'a', ['a', 'b']);
    const md = timelineToMarkdown(view);
    expect(md).toContain('## What we planned\n- We planned a demo');
    expect(md).toContain('## Timeline\n- **8:30** — Incident\n- **9:00** — Standup\n- No timestamp yet');
    // Incident (8:30) precedes Standup (9:00); untimed card has no stamp.
    expect(md.indexOf('Incident')).toBeLessThan(md.indexOf('Standup'));
  });
});

import { describe, it, expect } from 'vitest';
import { reduceAll, reduce, deriveView, facilitatorOf, initialState } from '../src/game/gameState.js';

const presence = (from, name, seq = 0) => ({ type: 'presence', from, name, seq });
const commit = (from, round, hash) => ({ type: 'commit', from, round, hash });
const reveal = (from, round, pick, nonce) => ({ type: 'reveal', from, round, pick, nonce });

function shuffle(arr, seed = 7) {
  // deterministic shuffle (no Math.random)
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe('reduce — convergence', () => {
  const events = [
    presence('a', 'Ana'), presence('b', 'Ben'), presence('c', 'Cy'),
    { type: 'select-game', from: 'a', round: 1, game: 'rps' },
    commit('a', 1, 'ha'), commit('b', 1, 'hb'), commit('c', 1, 'hc'),
    reveal('a', 1, 'rock', 'na'), reveal('b', 1, 'scissors', 'nb'), reveal('c', 1, 'rock', 'nc'),
  ];

  it('is order-independent', () => {
    const base = reduceAll(events);
    for (let s = 1; s <= 5; s++) {
      expect(reduceAll(shuffle(events, s))).toEqual(base);
    }
  });

  it('is idempotent under duplicate delivery', () => {
    const once = reduceAll(events);
    const twice = reduceAll([...events, ...events]);
    expect(twice).toEqual(once);
  });
});

describe('reduce — facilitator actions', () => {
  it('adopts the highest round', () => {
    const s = reduceAll([
      { type: 'select-game', from: 'a', round: 1, game: 'rps' },
      { type: 'select-game', from: 'a', round: 2, game: 'f2f' },
    ]);
    expect(s.round).toBe(2);
    expect(s.game).toBe('f2f');
  });

  it('ignores a stale lower-round action', () => {
    const s = reduceAll([
      { type: 'select-game', from: 'a', round: 2, game: 'f2f' },
      { type: 'select-game', from: 'a', round: 1, game: 'rps' },
    ]);
    expect(s.round).toBe(2);
    expect(s.game).toBe('f2f');
  });

  it('breaks a same-round tie by lowest issuer id', () => {
    const s = reduceAll([
      { type: 'select-game', from: 'b', round: 1, game: 'rps' },
      { type: 'select-game', from: 'a', round: 1, game: 'f2f' },
    ]);
    expect(s.selectFrom).toBe('a');
    expect(s.game).toBe('f2f');
  });
});

describe('facilitatorOf', () => {
  it('is the lexicographically smallest live peer', () => {
    expect(facilitatorOf(['c', 'a', 'b'])).toBe('a');
  });
});

describe('deriveView', () => {
  const active = ['a', 'b', 'c'];

  it('reports lobby before a game is chosen', () => {
    const v = deriveView(initialState(), 'a', active);
    expect(v.phase).toBe('lobby');
    expect(v.facilitator).toBe('a');
    expect(v.isFacilitator).toBe(true);
  });

  it('stays in pick until every participant has committed', () => {
    const s = reduceAll([
      { type: 'select-game', from: 'a', round: 1, game: 'rps' },
      commit('a', 1, 'ha'), commit('b', 1, 'hb'),
    ]);
    const v = deriveView(s, 'b', active);
    expect(v.phase).toBe('pick');
    expect(v.remaining).toBe(1);
  });

  it('reveals with a verdict once all committed and reveals verified', () => {
    const s = reduceAll([
      { type: 'select-game', from: 'a', round: 1, game: 'rps' },
      commit('a', 1, 'ha'), commit('b', 1, 'hb'), commit('c', 1, 'hc'),
      reveal('a', 1, 'rock', 'na'), reveal('b', 1, 'scissors', 'nb'), reveal('c', 1, 'rock', 'nc'),
    ]);
    const verified = { 1: { a: 'rock', b: 'scissors', c: 'rock' } };
    const v = deriveView(s, 'a', active, verified);
    expect(v.phase).toBe('reveal');
    expect(v.result.outcome).toBe('win');
    expect(v.result.winners.sort()).toEqual(['a', 'c']);
  });

  it('drops a departed peer from participants so a round is not blocked by it', () => {
    const s = reduceAll([
      { type: 'select-game', from: 'a', round: 1, game: 'rps' },
      commit('a', 1, 'ha'), commit('b', 1, 'hb'),
      { type: 'leave', from: 'c' },
    ]);
    const v = deriveView(s, 'a', active); // c still in active list but departed
    expect(v.participants).toEqual(['a', 'b']);
    // a and b have committed → ready to reveal once reveals land
    expect(v.remaining).toBe(0);
  });

  it('force-reveal shows partial results without every commit', () => {
    const s = reduceAll([
      { type: 'select-game', from: 'a', round: 1, game: 'f2f' },
      commit('a', 1, 'ha'), commit('b', 1, 'hb'),
      reveal('a', 1, 3, 'na'), reveal('b', 1, 5, 'nb'),
      { type: 'force-reveal', from: 'a', round: 1 },
    ]);
    const verified = { 1: { a: 3, b: 5 } };
    const v = deriveView(s, 'a', active, verified); // c never committed
    expect(v.phase).toBe('reveal');
    expect(v.result.avg).toBe(4);
  });
});

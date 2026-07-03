import { describe, it, expect } from 'vitest';
import { gameList, getGame } from '../src/game/registry.js';
import points from '../src/games/points.js';
import motion from '../src/games/motion.js';
import ranked from '../src/games/ranked.js';
import health from '../src/games/health.js';
import turn from '../src/games/turn.js';

describe('registry contract', () => {
  it('every game has the required interface and survives garbage config', () => {
    for (const g of gameList) {
      expect(typeof g.id).toBe('string');
      expect(typeof g.label).toBe('string');
      expect(typeof g.validatePick).toBe('function');
      expect(typeof g.result).toBe('function');
      expect(typeof g.normalizeConfig).toBe('function');
      // Hostile-peer safety: normalizeConfig must never throw
      for (const garbage of [null, undefined, 42, 'x', [], { question: 9, options: 7, categories: null, excluded: 'no' }]) {
        expect(() => g.normalizeConfig(garbage)).not.toThrow();
      }
      // result must tolerate an empty pick set
      expect(() => g.result({}, g.normalizeConfig(g.defaultConfig({})), { round: 1, participants: ['a'] })).not.toThrow();
    }
  });

  it('resolves games by id', () => {
    expect(getGame('points').id).toBe('points');
    expect(getGame('nope')).toBe(null);
  });
});

describe('story pointing', () => {
  const cfg = {};
  it('computes avg and consensus within one scale step', () => {
    const r = points.result({ a: 5, b: 8, c: 5 }, cfg);
    expect(r.avg).toBe(6);
    expect(r.consensus).toBe(true);
    expect(r.outliers).toEqual([]);
  });
  it('flags outliers when spread exceeds one step', () => {
    const r = points.result({ a: 1, b: 13, c: 5 }, cfg);
    expect(r.consensus).toBe(false);
    expect(r.outliers.sort()).toEqual(['a', 'b']);
  });
  it('tracks abstainers (? and coffee) without breaking the average', () => {
    const r = points.result({ a: 3, b: '?', c: 'coffee' }, cfg);
    expect(r.avg).toBe(3);
    expect(r.abstained.sort()).toEqual(['b', 'c']);
    expect(r.numericCount).toBe(1);
  });
  it('validates picks against the scale', () => {
    expect(points.validatePick(5)).toBe(true);
    expect(points.validatePick('?')).toBe(true);
    expect(points.validatePick(4)).toBe(false);
  });
});

describe('motion vote', () => {
  it('passes when yes > no and detects unanimity', () => {
    const r = motion.result({ a: 'yes', b: 'yes', c: 'abstain' });
    expect(r.passed).toBe(true);
    expect(r.unanimous).toBe(true);
  });
  it('ties are not passed', () => {
    const r = motion.result({ a: 'yes', b: 'no' });
    expect(r.passed).toBe(false);
    expect(r.tied).toBe(true);
  });
  it('normalizes the question', () => {
    expect(motion.normalizeConfig({ question: `  ${'x'.repeat(300)}  ` }).question.length).toBe(200);
  });
});

describe('ranked choice (Borda)', () => {
  const cfg = ranked.normalizeConfig({ options: ['A', 'B', 'C'] });
  it('scores by Borda count', () => {
    // a: A>B>C, b: A>C>B  →  A:4 B:2 C:... n-1=2 points for first
    const r = ranked.result({ a: [0, 1, 2], b: [0, 2, 1] }, cfg);
    expect(r.winner).toBe('A');
    expect(r.scores[0].points).toBe(4);
  });
  it('breaks score ties by first-place count', () => {
    // a: A>B>C (A:2,B:1), b: B>A>C (B:2,A:1) → A=B=3 points, A firsts=1, B firsts=1 → tie
    const r = ranked.result({ a: [0, 1, 2], b: [1, 0, 2] }, cfg);
    expect(r.winner).toBe(null);
    expect(r.tie.sort()).toEqual(['A', 'B']);
  });
  it('rejects non-permutations', () => {
    expect(ranked.validatePick([0, 0, 1], cfg)).toBe(false);
    expect(ranked.validatePick([0, 1], cfg)).toBe(false);
    expect(ranked.validatePick([2, 0, 1], cfg)).toBe(true);
  });
  it('dedupes and trims options', () => {
    expect(ranked.normalizeConfig({ options: [' A ', 'A', 'B', ''] }).options).toEqual(['A', 'B']);
  });
});

describe('health check', () => {
  const cfg = health.normalizeConfig({});
  const allG = Object.fromEntries(cfg.categories.map((_, i) => [i, 'g']));
  it('computes majority lights and overall', () => {
    const r = health.result({ a: allG, b: allG }, cfg);
    expect(r.categories.every(c => c.light === 'g')).toBe(true);
    expect(r.overall).toBe('g');
  });
  it('ties darken (g/r tie → y, y/r tie → r)', () => {
    const gr = health.result({ a: allG, b: { ...allG, 0: 'r' } }, cfg);
    expect(gr.categories[0].light).toBe('y');
    const yr = health.result({ a: { ...allG, 0: 'y' }, b: { ...allG, 0: 'r' } }, cfg);
    expect(yr.categories[0].light).toBe('r');
  });
  it('requires every category rated', () => {
    expect(health.validatePick({ 0: 'g' }, cfg)).toBe(false);
    expect(health.validatePick(allG, cfg)).toBe(true);
  });
});

describe('turn picker', () => {
  const ctx = { round: 1, participants: ['a', 'b', 'c'] };
  const picks = { a: 'nonce-a', b: 'nonce-b', c: 'nonce-c' };
  it('is deterministic for the same reveals', () => {
    const r1 = turn.result(picks, { excluded: [] }, ctx);
    const r2 = turn.result(picks, { excluded: [] }, ctx);
    expect(r1.winner).toBe(r2.winner);
    expect(ctx.participants).toContain(r1.winner);
  });
  it('changes with different nonces (not degenerate)', () => {
    const winners = new Set();
    for (let i = 0; i < 30; i++) {
      winners.add(turn.result({ a: `n${i}`, b: 'x', c: 'y' }, { excluded: [] }, ctx).winner);
    }
    expect(winners.size).toBeGreaterThan(1);
  });
  it('respects exclusions', () => {
    const r = turn.result(picks, { excluded: ['a', 'b'] }, ctx);
    expect(r.winner).toBe('c');
  });
  it('resets when everyone has been picked', () => {
    const r = turn.result(picks, { excluded: ['a', 'b', 'c'] }, ctx);
    expect(r.exhausted).toBe(true);
    expect(ctx.participants).toContain(r.winner);
  });
});

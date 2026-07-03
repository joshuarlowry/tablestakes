import { describe, it, expect } from 'vitest';
import { rpsResult, f2fResult } from '../src/game/rules.js';

describe('rpsResult', () => {
  it('resolves a two-player win by beats-relation', () => {
    const r = rpsResult({ a: 'rock', b: 'scissors' });
    expect(r.outcome).toBe('win');
    expect(r.winners).toEqual(['a']);
    expect(r.winningThrow).toBe('rock');
  });

  it('calls a two-player tie a draw', () => {
    expect(rpsResult({ a: 'rock', b: 'rock' }).outcome).toBe('draw');
  });

  it('picks the winning side when a group throws exactly two distinct throws', () => {
    const r = rpsResult({ a: 'rock', b: 'rock', c: 'scissors' });
    expect(r.outcome).toBe('win');
    expect(r.winningThrow).toBe('rock');
    expect(r.winners.sort()).toEqual(['a', 'b']);
  });

  it('is a draw when everyone throws the same', () => {
    expect(rpsResult({ a: 'paper', b: 'paper', c: 'paper' }).outcome).toBe('draw');
  });

  it('is a stalemate when all three throws are present', () => {
    expect(rpsResult({ a: 'rock', b: 'paper', c: 'scissors' }).outcome).toBe('stalemate');
  });
});

describe('f2fResult', () => {
  it('computes average and spread', () => {
    const r = f2fResult({ a: 2, b: 4 });
    expect(r.avg).toBe(3);
    expect(r.spread).toBe(2);
    expect(r.consensus).toBe(false);
  });

  it('flags consensus when spread <= 1', () => {
    expect(f2fResult({ a: 4, b: 5, c: 4 }).consensus).toBe(true);
  });

  it('flags a hard no when anyone throws a fist (0)', () => {
    expect(f2fResult({ a: 0, b: 5 }).hardNo).toBe(true);
  });
});

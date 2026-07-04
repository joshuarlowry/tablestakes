import { describe, it, expect } from 'vitest';
import { orderBetween } from '../src/game/order.js';

describe('orderBetween', () => {
  it('produces a key between two existing keys', () => {
    const mid = orderBetween('a', 'b');
    expect(mid > 'a').toBe(true);
    expect(mid < 'b').toBe(true);
  });

  it('appends past the end when b is empty', () => {
    const k1 = orderBetween('', '');
    const k2 = orderBetween(k1, '');
    const k3 = orderBetween(k2, '');
    expect(k1 < k2).toBe(true);
    expect(k2 < k3).toBe(true);
  });

  it('prepends before the start when a is empty', () => {
    const k1 = orderBetween('', '');
    const k0 = orderBetween('', k1);
    expect(k0 < k1).toBe(true);
  });

  it('keeps prepending correctly across repeated moves to the top', () => {
    // Regression: real "move to top" flows call orderBetween('', currentTop)
    // repeatedly. Each result must sort strictly before the prior top, even
    // as keys grow a '0…' prefix (e.g. 'i' → '9' → '4' → '1' → '0i' → '09').
    let top = orderBetween('', '');
    for (let i = 0; i < 30; i++) {
      const next = orderBetween('', top);
      expect(next < top).toBe(true);
      top = next;
    }
  });

  it('survives many repeated inserts at the same position without colliding or hanging', () => {
    let a = 'a';
    let b = 'b';
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      const mid = orderBetween(a, b);
      expect(mid > a).toBe(true);
      expect(mid < b).toBe(true);
      expect(seen.has(mid)).toBe(false);
      seen.add(mid);
      b = mid; // keep narrowing the same gap, worst case for the algorithm
    }
  });

  it('produces a strictly increasing sequence when always appending', () => {
    let prev = '';
    for (let i = 0; i < 30; i++) {
      const next = orderBetween(prev, '');
      expect(next > prev).toBe(true);
      prev = next;
    }
  });
});

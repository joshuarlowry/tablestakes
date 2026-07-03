import { describe, it, expect } from 'vitest';
import { canonicalize } from '../src/game/canonical.js';
import { commit, verify } from '../src/game/commitReveal.js';

describe('canonicalize', () => {
  it('is key-order independent', () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
  });

  it('sorts nested object keys', () => {
    expect(canonicalize({ x: { b: [1, { z: 0, a: 1 }], a: 'y' } }))
      .toBe('{"x":{"a":"y","b":[1,{"a":1,"z":0}]}}');
  });

  it('preserves array order', () => {
    expect(canonicalize([2, 1])).not.toBe(canonicalize([1, 2]));
  });

  it('distinguishes types that String() would conflate', () => {
    expect(canonicalize('3')).not.toBe(canonicalize(3));
    expect(canonicalize([1, 2])).not.toBe(canonicalize('1,2'));
  });

  it('rejects undefined, non-finite numbers, and functions', () => {
    expect(() => canonicalize(undefined)).toThrow();
    expect(() => canonicalize(NaN)).toThrow();
    expect(() => canonicalize(Infinity)).toThrow();
    expect(() => canonicalize(() => {})).toThrow();
  });
});

describe('commit-reveal with structured picks', () => {
  it('round-trips a ranking array', async () => {
    const pick = [2, 0, 1];
    const h = await commit(pick, 'n1');
    expect(await verify([2, 0, 1], 'n1', h)).toBe(true);
    expect(await verify([0, 2, 1], 'n1', h)).toBe(false);
  });

  it('round-trips an object pick regardless of key order', async () => {
    const h = await commit({ pace: 'g', fun: 'y' }, 'n1');
    expect(await verify({ fun: 'y', pace: 'g' }, 'n1', h)).toBe(true);
    expect(await verify({ fun: 'g', pace: 'g' }, 'n1', h)).toBe(false);
  });
});

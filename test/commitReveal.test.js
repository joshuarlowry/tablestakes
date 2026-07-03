import { describe, it, expect } from 'vitest';
import { commit, verify } from '../src/game/commitReveal.js';

// A deterministic stub hasher keeps these tests independent of Web Crypto while
// still exercising the commit/verify contract. Web Crypto is covered end-to-end
// by the gameClient integration tests.
const stubHash = async s => `h(${s})`;

describe('commit / verify', () => {
  it('an honest reveal verifies', async () => {
    const h = await commit('rock', 'nonce-1', stubHash);
    expect(await verify('rock', 'nonce-1', h, stubHash)).toBe(true);
  });

  it('a tampered pick fails', async () => {
    const h = await commit('rock', 'nonce-1', stubHash);
    expect(await verify('paper', 'nonce-1', h, stubHash)).toBe(false);
  });

  it('a tampered nonce fails', async () => {
    const h = await commit('rock', 'nonce-1', stubHash);
    expect(await verify('rock', 'nonce-2', h, stubHash)).toBe(false);
  });

  it('a missing nonce fails closed', async () => {
    const h = await commit('rock', 'nonce-1', stubHash);
    expect(await verify('rock', '', h, stubHash)).toBe(false);
  });

  it('real Web Crypto SHA-256 round-trips and hides the pick (blindness)', async () => {
    const h = await commit('scissors', 'abc123');
    expect(h).toMatch(/^[0-9a-f]{64}$/);       // opaque digest, not the plaintext pick
    expect(h).not.toContain('scissors');
    expect(await verify('scissors', 'abc123', h)).toBe(true);
    expect(await verify('rock', 'abc123', h)).toBe(false);
  });
});

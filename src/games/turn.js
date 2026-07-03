/**
 * Turn picker — chooses a random participant fairly.
 *
 * Reuses commit-reveal for rig-proof shared randomness: everyone's "pick" is a
 * random nonce string, committed blind then revealed. The winner is a
 * deterministic FNV-1a fold over the canonicalized (id-sorted) reveals, mod
 * the eligible list — unpredictable at commit time (nobody knows others'
 * nonces), identical on every peer at reveal. A facilitator-announces design
 * was rejected as riggable.
 *
 * `excluded` carries already-picked peers forward for around-the-room use.
 */
import { canonicalize } from '../game/canonical.js';

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export default {
  id: 'turn',
  label: 'Turn Picker',
  description: 'Fairly picks who goes next. Nobody can rig it — randomness comes from everyone.',
  glyphs: '🎯',
  blind: true,   // commit-reveal supplies the fairness, not secrecy
  needsConfig: false,
  minPlayers: 1,
  defaultConfig: () => ({ excluded: [] }),
  normalizeConfig(raw) {
    const list = Array.isArray(raw?.excluded) ? raw.excluded : [];
    return { excluded: list.filter(x => typeof x === 'string').slice(0, 100) };
  },
  validatePick: pick => typeof pick === 'string' && pick.length > 0 && pick.length <= 64,
  result(picks, config, ctx) {
    const excluded = new Set(config.excluded);
    let eligible = ctx.participants.filter(id => !excluded.has(id));
    const exhausted = eligible.length === 0;
    if (exhausted) eligible = [...ctx.participants]; // everyone's been picked: reset
    if (!eligible.length) return { winner: null, eligible: [], exhausted };
    const sortedIds = Object.keys(picks).sort();
    const material = canonicalize(sortedIds.map(id => [id, picks[id]]));
    const winner = eligible.sort()[fnv1a(material) % eligible.length];
    return { winner, eligible, exhausted };
  },
};

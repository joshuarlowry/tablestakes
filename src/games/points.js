/** Story pointing — modified-Fibonacci scale plus ? (unsure) and ☕ (break). */
const SCALE = [0, 1, 2, 3, 5, 8, 13];
const SPECIAL = ['?', 'coffee'];

export default {
  id: 'points',
  label: 'Story Pointing',
  description: 'Estimate together, anchor-free. Fibonacci scale, reveal when all hands are in.',
  glyphs: '1 3 5 8 13',
  blind: true,
  needsConfig: false,
  minPlayers: 1,
  defaultConfig: () => ({}),
  normalizeConfig: () => ({}),
  validatePick: pick => SCALE.includes(pick) || SPECIAL.includes(pick),
  result(picks) {
    const entries = Object.entries(picks);
    const numeric = entries.filter(([, v]) => typeof v === 'number');
    const abstained = entries.filter(([, v]) => !SCALE.includes(v) || typeof v !== 'number')
      .map(([id]) => id);
    const vals = numeric.map(([, v]) => v);
    if (!vals.length) {
      return { avg: null, min: null, max: null, consensus: false, outliers: [], abstained, numericCount: 0 };
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    // Consensus: everyone within one step of each other on the scale.
    const consensus = SCALE.indexOf(max) - SCALE.indexOf(min) <= 1;
    const outliers = consensus ? [] : numeric
      .filter(([, v]) => v === min || v === max)
      .map(([id]) => id);
    return { avg, min, max, consensus, outliers, abstained, numericCount: vals.length };
  },
  scale: SCALE,
  special: SPECIAL,
};

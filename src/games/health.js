/**
 * Team health check — everyone rates every category 🔴/🟡/🟢 in one blind
 * submission; reveal shows the distribution and a majority traffic light per
 * category (ties darken: g/y → y, y/r → r, g/r → y).
 */
export const DEFAULT_CATEGORIES = [
  'Mission & Purpose',
  'Pace & Sustainability',
  'Process & Tools',
  'Support & Safety',
  'Fun & Energy',
];
const LIGHTS = ['r', 'y', 'g'];

function majorityLight(counts) {
  const { r, y, g } = counts;
  if (g > y && g > r) return 'g';
  if (y > g && y > r) return 'y';
  if (r > y && r > g) return 'r';
  // Ties darken: y/r → r, g/r → y, g/y → y (and a 3-way tie → r).
  if (r === y && r >= g) return 'r';
  return 'y';
}

export default {
  id: 'health',
  label: 'Health Check',
  description: 'Rate the team red / yellow / green across five dimensions, blind, then compare.',
  glyphs: '🔴 🟡 🟢',
  blind: true,
  needsConfig: false,
  minPlayers: 1,
  defaultConfig: () => ({ categories: DEFAULT_CATEGORIES }),
  normalizeConfig(raw) {
    const list = Array.isArray(raw?.categories) ? raw.categories : [];
    const categories = list.filter(c => typeof c === 'string').map(c => c.trim().slice(0, 60)).filter(Boolean).slice(0, 10);
    return { categories: categories.length >= 2 ? categories : DEFAULT_CATEGORIES };
  },
  validatePick(pick, config) {
    if (!pick || typeof pick !== 'object' || Array.isArray(pick)) return false;
    return config.categories.every((_, i) => LIGHTS.includes(pick[i]));
  },
  result(picks, config) {
    const categories = config.categories.map((name, i) => {
      const counts = { r: 0, y: 0, g: 0 };
      for (const pick of Object.values(picks)) counts[pick[i]] += 1;
      return { name, ...counts, light: majorityLight(counts) };
    });
    const overallCounts = { r: 0, y: 0, g: 0 };
    for (const c of categories) overallCounts[c.light] += 1;
    return { categories, overall: majorityLight(overallCounts), raterCount: Object.keys(picks).length };
  },
  lights: LIGHTS,
};

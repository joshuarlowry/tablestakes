/**
 * Ranked choice — everyone privately ranks all options; tally is Borda count.
 *
 * Why Borda over instant-runoff: with team-sized electorates (3–10 voters) IRV
 * constantly hits arbitrary elimination ties, while Borda produces a smooth
 * per-option score that doubles as the tally display, is order-independent,
 * and is explainable in a sentence. First-place counts break score ties;
 * a residual tie is reported as a tie.
 */
function isPermutation(pick, n) {
  if (!Array.isArray(pick) || pick.length !== n) return false;
  const seen = new Set(pick);
  if (seen.size !== n) return false;
  return pick.every(v => Number.isInteger(v) && v >= 0 && v < n);
}

export default {
  id: 'ranked',
  label: 'Ranked Choice',
  description: 'Everyone privately ranks the options. Borda-count scores, revealed together.',
  glyphs: '🥇 🥈 🥉',
  blind: true,
  needsConfig: true,
  minPlayers: 1,
  defaultConfig: () => ({ options: [] }),
  normalizeConfig(raw) {
    const list = Array.isArray(raw?.options) ? raw.options : [];
    const options = [...new Set(
      list.filter(o => typeof o === 'string').map(o => o.trim().slice(0, 100)).filter(Boolean),
    )].slice(0, 10);
    return { options };
  },
  validatePick: (pick, config) => isPermutation(pick, config.options.length) && config.options.length >= 2,
  result(picks, config) {
    const n = config.options.length;
    const points = new Array(n).fill(0);
    const firsts = new Array(n).fill(0);
    for (const ranking of Object.values(picks)) {
      ranking.forEach((optionIdx, rankPos) => {
        points[optionIdx] += n - 1 - rankPos;   // Borda: first gets n-1 ... last gets 0
        if (rankPos === 0) firsts[optionIdx] += 1;
      });
    }
    const scores = config.options.map((option, i) => ({ option, index: i, points: points[i], firsts: firsts[i] }))
      .sort((a, b) => b.points - a.points || b.firsts - a.firsts || a.index - b.index);
    const top = scores[0];
    const tied = scores.filter(s => s.points === top.points && s.firsts === top.firsts);
    return {
      scores,
      winner: tied.length === 1 ? top.option : null,
      tie: tied.length > 1 ? tied.map(s => s.option) : [],
      voterCount: Object.keys(picks).length,
    };
  },
};

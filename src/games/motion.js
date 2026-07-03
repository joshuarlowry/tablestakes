/** Motion vote — facilitator poses a question; blind yes/no/abstain. */
const OPTIONS = ['yes', 'no', 'abstain'];

export default {
  id: 'motion',
  label: 'Motion Vote',
  description: 'Pose a question, vote blind. Yes, no, or abstain — revealed together.',
  glyphs: '👍 👎',
  blind: true,
  needsConfig: true,
  minPlayers: 1,
  defaultConfig: () => ({ question: '' }),
  normalizeConfig(raw) {
    const question = typeof raw?.question === 'string' ? raw.question.trim().slice(0, 200) : '';
    return { question };
  },
  validatePick: pick => OPTIONS.includes(pick),
  result(picks) {
    const counts = { yes: 0, no: 0, abstain: 0 };
    for (const v of Object.values(picks)) counts[v] += 1;
    const voted = counts.yes + counts.no;
    return {
      ...counts,
      passed: counts.yes > counts.no,
      tied: counts.yes === counts.no && voted > 0,
      unanimous: voted > 0 && (counts.yes === 0 || counts.no === 0),
    };
  },
  options: OPTIONS,
};

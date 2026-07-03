import { RPS, rpsResult } from '../game/rules.js';

const KEYS = Object.keys(RPS);

export default {
  id: 'rps',
  label: 'Rock · Paper · Scissors',
  description: 'The classic settler of disputes. Head-to-head or whole-team throwdown.',
  glyphs: '✊ ✋ ✌️',
  blind: true,
  needsConfig: false,
  minPlayers: 2,
  defaultConfig: () => ({}),
  normalizeConfig: () => ({}),
  validatePick: pick => KEYS.includes(pick),
  result: picks => rpsResult(picks),
};

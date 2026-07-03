import { f2fResult } from '../game/rules.js';

export default {
  id: 'f2f',
  label: 'Fist to Five',
  description: 'Gauge the room. Zero is a hard no, five is full-throated support.',
  glyphs: '☝️ 🖐',
  blind: true,
  needsConfig: false,
  minPlayers: 1,
  defaultConfig: () => ({}),
  normalizeConfig: () => ({}),
  validatePick: pick => Number.isInteger(pick) && pick >= 0 && pick <= 5,
  result: picks => f2fResult(picks),
};

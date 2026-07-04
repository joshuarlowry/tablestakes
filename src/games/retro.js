/**
 * Retrospective board — a persistent collaborative document, not a one-shot
 * blind pick. `mode: 'board'` tells the reducer/registry to skip the
 * commit-reveal pick/reveal machinery entirely; state.cards is the whole
 * story (see gameState.js's board branch).
 *
 * Card privacy (blind vs. live) is facilitator-chosen per session and
 * enforced client-side in gameClient.js (see its "local draft" buffer) — the
 * reducer only ever sees cards after they've been published, so a peer with
 * unrevealed drafts simply hasn't gossiped them yet.
 */
export const TEMPLATES = {
  wwda: {
    label: 'Went Well / Didn’t / Actions',
    columns: [
      { key: 'well', title: 'Went Well' },
      { key: 'not', title: 'Didn’t Go Well' },
      { key: 'actions', title: 'Actions' },
    ],
  },
  ssc: {
    label: 'Start / Stop / Continue',
    columns: [
      { key: 'start', title: 'Start' },
      { key: 'stop', title: 'Stop' },
      { key: 'continue', title: 'Continue' },
    ],
  },
};

export default {
  id: 'retro',
  label: 'Retrospective',
  description: 'Reflect as a team. Cards in columns, blind or live, everyone can rearrange.',
  glyphs: '\u{1F5C2}️',
  mode: 'board',
  needsConfig: true,
  minPlayers: 1,
  defaultConfig: () => ({ template: 'wwda', privacy: 'blind' }),
  normalizeConfig(raw) {
    const template = raw && TEMPLATES[raw.template] ? raw.template : 'wwda';
    const privacy = raw && raw.privacy === 'live' ? 'live' : 'blind';
    return { template, privacy };
  },
  columnsFor(config) {
    return TEMPLATES[config.template] ? TEMPLATES[config.template].columns : TEMPLATES.wwda.columns;
  },
  // Board-mode games don't use the commit-reveal pick machinery, but keep
  // these as harmless no-ops so the registry contract stays uniform.
  validatePick: () => false,
  result: () => null,
};

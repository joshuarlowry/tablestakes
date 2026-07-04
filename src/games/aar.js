/**
 * After-Action Review — a persistent collaborative document (like retro,
 * `mode: 'board'`), organised around the standard four AAR questions plus a
 * time-ordered Timeline section.
 *
 * AARs are discussion-driven, so this game is always LIVE (no blind buffering);
 * defaultConfig fixes privacy to 'live' and there's no setup form.
 *
 * The card CRDT is reused wholesale from Phase 2 — `time` is just another field
 * in the open `card` bag, so the reducer needs ZERO new logic. The only
 * AAR-specific behaviour is how the Timeline column is *sorted*, which this
 * module supplies via `cardComparatorFor` (see gameState.deriveBoard).
 */
export const COLUMNS = [
  { key: 'planned', title: 'What we planned' },
  { key: 'happened', title: 'What actually happened' },
  { key: 'why', title: 'Why — what worked & what didn’t' },
  { key: 'next', title: 'What we’ll do next time' },
  { key: 'timeline', title: 'Timeline', timeline: true },
];

/**
 * Forgiving clock parse → minutes since midnight, or null when unparseable.
 * Accepts "9", "9:30", "09:05", "9am", "2:15pm", "14:00". Anything else sorts
 * last (by order key) so bad input can never break sort determinism.
 */
export function parseTime(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3];
  if (min > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap[0] === 'p' && h !== 12) h += 12;
    if (ap[0] === 'a' && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }
  return h * 60 + min;
}

// Inlined order/cardId tiebreak — can't import compareCards from gameState
// without a circular dependency (gameState → registry → this module).
function byOrder(a, b) {
  if (a.order < b.order) return -1;
  if (a.order > b.order) return 1;
  return a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0;
}

/** Chronological, with parsed times before unparseable ones; order/cardId breaks ties. */
export function compareTimeline(a, b) {
  const ta = parseTime(a.time);
  const tb = parseTime(b.time);
  if (ta !== null && tb !== null) return ta !== tb ? ta - tb : byOrder(a, b);
  if (ta !== null) return -1;
  if (tb !== null) return 1;
  return byOrder(a, b);
}

export default {
  id: 'aar',
  label: 'After-Action Review',
  description: 'Debrief as a team: what was planned, what happened, why, and a shared timeline.',
  glyphs: '\u{1F4CB}',
  mode: 'board',
  needsConfig: false,
  minPlayers: 1,
  defaultConfig: () => ({ privacy: 'live' }),
  normalizeConfig() {
    return { privacy: 'live' }; // AARs are always live — ignore any hostile override
  },
  columnsFor() {
    return COLUMNS;
  },
  // Timeline column sorts chronologically; every other column keeps the plain
  // fractional-index order. Returned to gameState.deriveBoard per column.
  cardComparatorFor(col) {
    return col.timeline ? compareTimeline : byOrder;
  },
  validatePick: () => false,
  result: () => null,
};

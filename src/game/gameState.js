/**
 * Pure, time-free, network-free reducer for replicated game state.
 *
 * Every client feeds the same gossiped events through `reduce()` and converges
 * to identical state regardless of arrival order or duplication. `deriveView()`
 * turns that state (plus the caller's notion of which peers are live, and which
 * reveals it has cryptographically verified) into what the UI shows.
 *
 * `round` is a logical clock for facilitator actions (select-game / back-to-lobby):
 * highest round wins, ties broken by lowest issuer id. commits/reveals are keyed
 * by round, so stale-round events are naturally inert.
 */

import { getGame } from './registry.js';

export function initialState() {
  return {
    round: 0,
    game: null,
    config: {},
    selectFrom: null,
    names: {},
    departed: {},
    commits: {},   // round -> { peerId -> hash }
    reveals: {},    // round -> { peerId -> {pick, nonce} }
    forced: {},     // round -> true
    presenceSeq: {}, // peerId -> highest seq seen
    cards: {},          // round -> { cardId -> {ver, from, text, col, order, author, deleted, time?} }
    cardsRevealed: {},  // round -> true (blind-mode retro/AAR boards)
    // Facilitator is an explicit last-writer-wins register: creator seeds it,
    // handoff/recovery bump the term. Higher term wins; ties broken by smaller
    // holder id — so every peer converges without an election race.
    facilitator: { holder: null, term: -1 },
  };
}

const clone = obj => ({ ...obj });
function setIn(map, round, key, value) {
  const next = { ...map };
  next[round] = { ...(next[round] || {}), [key]: value };
  return next;
}

// A facilitator action (select-game / back-to-lobby) wins if it has a higher
// round, or an equal round from a lexicographically smaller issuer.
function actionWins(state, event) {
  if (event.round > state.round) return true;
  if (event.round === state.round) {
    return state.selectFrom == null || event.from < state.selectFrom;
  }
  return false;
}

export function reduce(state, event) {
  if (!event || typeof event !== 'object') return state;
  switch (event.type) {
    case 'presence': {
      const seq = Number(event.seq) || 0;
      if ((state.presenceSeq[event.from] ?? -1) >= seq && state.names[event.from]) {
        return state;
      }
      return {
        ...state,
        names: { ...state.names, [event.from]: String(event.name || '').slice(0, 20) || 'peer' },
        departed: dropKey(state.departed, event.from),
        presenceSeq: { ...state.presenceSeq, [event.from]: seq },
      };
    }
    case 'select-game': {
      if (!actionWins(state, event)) return state;
      const config = event.config && typeof event.config === 'object' ? event.config : {};
      return { ...state, round: event.round, game: event.game, config, selectFrom: event.from };
    }
    case 'back-to-lobby': {
      if (!actionWins(state, event)) return state;
      return { ...state, round: event.round, game: null, config: {}, selectFrom: event.from };
    }
    case 'commit':
      return { ...state, commits: setIn(state.commits, event.round, event.from, event.hash) };
    case 'reveal':
      return {
        ...state,
        reveals: setIn(state.reveals, event.round, event.from, {
          pick: event.pick,
          nonce: event.nonce,
        }),
      };
    case 'force-reveal':
      return { ...state, forced: { ...state.forced, [event.round]: true } };
    case 'facilitator': {
      const cur = state.facilitator;
      const wins = event.term > cur.term ||
        (event.term === cur.term && (cur.holder == null || event.holder < cur.holder));
      return wins ? { ...state, facilitator: { holder: event.holder, term: event.term } } : state;
    }
    case 'card': {
      const roundCards = state.cards[event.round] || {};
      const cur = roundCards[event.cardId];
      // Whole-card last-writer-wins by an explicit version counter (same
      // pattern as the facilitator register) — ties broken by smaller issuer.
      const wins = !cur || event.ver > cur.ver || (event.ver === cur.ver && event.from < cur.from);
      if (!wins) return state;
      const card = event.card && typeof event.card === 'object' ? event.card : {};
      return {
        ...state,
        cards: {
          ...state.cards,
          [event.round]: { ...roundCards, [event.cardId]: { ver: event.ver, from: event.from, ...card } },
        },
      };
    }
    case 'reveal-cards':
      return { ...state, cardsRevealed: { ...state.cardsRevealed, [event.round]: true } };
    case 'leave':
      return { ...state, departed: { ...state.departed, [event.from]: true } };
    default:
      return state;
  }
}

function dropKey(obj, key) {
  if (!(key in obj)) return obj;
  const next = { ...obj };
  delete next[key];
  return next;
}

export function reduceAll(events, state = initialState()) {
  return events.reduce(reduce, state);
}

export function compareCards(a, b) {
  if (a.order < b.order) return -1;
  if (a.order > b.order) return 1;
  return a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0; // defensive tiebreak
}

function deriveBoard(state, gameDef, config, round) {
  const roundCards = state.cards[round] || {};
  const columns = gameDef.columnsFor(config).map(col => ({
    ...col,
    cards: Object.entries(roundCards)
      .filter(([, c]) => c.col === col.key && !c.deleted)
      .map(([cardId, c]) => ({ cardId, ...c }))
      .sort(compareCards),
  }));
  return { columns, cardsRevealed: !!state.cardsRevealed[round], privacy: config.privacy };
}

/** Facilitator is deterministic: smallest live peer id. Everyone computes it identically. */
export function facilitatorOf(activeIds) {
  return [...activeIds].sort()[0] ?? null;
}

/**
 * @param {object} state
 * @param {string} selfId
 * @param {string[]} activeIds  peers the caller considers live (incl. self)
 * @param {Record<number,Record<string,any>>} verified  round -> peerId -> pick (hash-verified reveals)
 */
export function deriveView(state, selfId, activeIds, verified = {}) {
  const participants = [...new Set(activeIds)].filter(id => !state.departed[id]);
  participants.sort();
  // Registered facilitator rules while its holder is live (picked/sticky/handoff/
  // recovery); otherwise fall back to smallest live peer for display + gating.
  const registered = state.facilitator.holder;
  const registeredLive = registered && participants.includes(registered);
  const facilitator = registeredLive ? registered : facilitatorOf(participants);
  const r = state.round;
  const commitsR = state.commits[r] || {};
  const verifiedR = verified[r] || {};

  const committedIds = participants.filter(id => id in commitsR);
  const allCommitted = participants.length > 0 && committedIds.length === participants.length;
  const forced = !!state.forced[r];
  const revealReady = forced || allCommitted;

  const gameDef = state.game ? getGame(state.game) : null;
  const config = gameDef ? gameDef.normalizeConfig(state.config) : {};

  if (gameDef && gameDef.mode === 'board') {
    return {
      round: r,
      game: state.game,
      config,
      phase: 'board',
      participants,
      names: state.names,
      facilitator,
      isFacilitator: selfId === facilitator,
      committedIds: [],
      lockedCount: 0,
      remaining: participants.length,
      iAmCommitted: false,
      revealPicks: null,
      result: null,
      board: deriveBoard(state, gameDef, config, r),
    };
  }

  // Unknown game id (garbage or newer client version) renders as lobby rather
  // than a permanently stuck pick phase.
  let phase = gameDef ? 'pick' : 'lobby';
  let result = null;
  let revealPicks = null;

  if (gameDef && revealReady) {
    const picks = {};
    for (const id of committedIds) {
      // Filter both unverified and malformed picks — a hostile peer's garbage
      // reveal must not throw the (pure, total) result computation.
      if (id in verifiedR && gameDef.validatePick(verifiedR[id], config)) {
        picks[id] = verifiedR[id];
      }
    }
    const ready = forced
      ? Object.keys(picks).length > 0
      : committedIds.every(id => id in verifiedR);
    if (ready) {
      phase = 'reveal';
      revealPicks = picks;
      result = gameDef.result(picks, config, { round: r, participants });
    }
  }

  return {
    round: r,
    game: state.game,
    config,
    phase,
    participants,
    names: state.names,
    facilitator,
    isFacilitator: selfId === facilitator,
    committedIds,
    lockedCount: committedIds.length,
    remaining: participants.length - committedIds.length,
    iAmCommitted: committedIds.includes(selfId),
    revealPicks,
    result,
  };
}

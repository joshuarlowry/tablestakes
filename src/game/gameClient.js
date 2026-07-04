/**
 * Headless game controller. All logic, zero DOM.
 *
 * Wires the pure reducer, gossip, and commit-reveal behind injected ports
 * (transport, hasher, clock, randomness) so the entire app runs in tests against
 * the mesh simulator. main.js is a thin DOM binding over this.
 *
 * Timers are NOT owned here — the caller drives `heartbeat()` and `tick(now)` —
 * keeping the controller deterministic and testable.
 */
import { reduce, initialState, deriveView, facilitatorOf, compareCards } from './gameState.js';
import { createGossip } from '../net/gossip.js';
import { commit as makeCommit, verify, sha256Hex } from './commitReveal.js';
import { canonicalize } from './canonical.js';
import { orderBetween } from './order.js';

const LIVENESS_MS = 15000;

function defaultNonce() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function createGameClient({
  transport,
  name,
  hasher = sha256Hex,
  now = () => Date.now(),
  randomNonce = defaultNonce,
  livenessMs = LIVENESS_MS,
  autoVerify = false,
  isCreator = false,
  roomId = 'default',
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
}) {
  const self = transport.localPeerId;
  let state = initialState();
  const verified = {};            // round -> peerId -> pick
  const lastHeard = new Map();    // peerId -> timestamp
  const pendingReveals = [];      // reveals awaiting their commit / verification
  const revealedRounds = new Set();
  let myCommit = null;            // { round, pick, nonce } for auto-reveal
  let presenceSeq = 0;
  let cardCounter = 0;
  const listeners = new Set();
  let lastNotifiedJson = null;    // skip no-op notifies so the UI doesn't re-render

  // Blind-mode board cards not yet published (see games/retro.js docs). Only
  // ever holds this client's own drafts; stashed to `storage` so a refresh
  // doesn't lose an unrevealed retro card mid-session.
  const localDraftCards = new Map(); // cardId -> {text, col, order, author, deleted}
  const draftStashKey = `tablestakes:drafts:${roomId}`;
  function saveDraftStash() {
    if (!storage) return;
    try { storage.setItem(draftStashKey, JSON.stringify([...localDraftCards])); } catch { /* best effort */ }
  }
  function loadDraftStash() {
    if (!storage) return;
    try {
      const raw = storage.getItem(draftStashKey);
      if (raw) for (const [id, card] of JSON.parse(raw)) localDraftCards.set(id, card);
    } catch { /* best effort */ }
  }
  function clearDraftStash() {
    localDraftCards.clear();
    try { storage?.removeItem(draftStashKey); } catch { /* best effort */ }
  }
  loadDraftStash();

  const gossip = createGossip(transport, { onDeliver: apply });
  transport.onPeerLeave(peerId => { apply({ id: `leave:${peerId}`, type: 'leave', from: peerId }); });

  lastHeard.set(self, now());

  function activeIds() {
    const t = now();
    const ids = new Set([self]);
    for (const [id, ts] of lastHeard) {
      if (id !== self && t - ts <= livenessMs && !state.departed[id]) ids.add(id);
    }
    return [...ids];
  }

  function participants() {
    return activeIds().filter(id => !state.departed[id]);
  }

  // Heartbeats (every 5s) and ticks (every 2s) call notify() far more often
  // than the game state actually changes. Re-rendering on a no-op notify
  // would blow away live DOM (e.g. a focused input mid-keystroke, dropping
  // mobile keyboards) for no reason, so skip the callback unless the derived
  // view actually differs from what listeners last saw.
  function notify() {
    const view = getView();
    let json;
    try { json = canonicalize(view); } catch { json = null; } // never block a real update on this
    if (json !== null && json === lastNotifiedJson) return;
    lastNotifiedJson = json;
    for (const fn of listeners) fn(view);
  }

  function publish(ev) { gossip.publish(ev); }

  function apply(ev) {
    state = reduce(state, ev);
    if (ev.from) lastHeard.set(ev.from, now());
    if (ev.type === 'reveal' && ev.from !== self) {
      pendingReveals.push({ round: ev.round, from: ev.from, pick: ev.pick, nonce: ev.nonce });
    }
    if (ev.type === 'reveal-cards' && ev.round === state.round) {
      // Publish every local draft now that the facilitator has revealed —
      // fires for the facilitator's own reveal too (gossip echoes locally).
      for (const [cardId, card] of localDraftCards) {
        publish({ id: `card:${cardId}:1`, type: 'card', from: self, round: ev.round, cardId, ver: 1, card });
      }
      clearDraftStash();
    }
    maybeAutoReveal();
    maybeRecoverFacilitator();
    notify();
    // Re-verify after ANY event: a reveal may have arrived before its commit,
    // so a later commit needs to retrigger verification of a still-pending reveal.
    if (autoVerify && pendingReveals.length) queueMicrotask(runVerify);
  }

  // Release my reveal once every live participant has committed (or the
  // facilitator forced it). Depends only on commits, not on verification.
  function maybeAutoReveal() {
    if (!state.game || !myCommit || myCommit.round !== state.round) return;
    if (revealedRounds.has(state.round)) return;
    const parts = participants();
    const commitsR = state.commits[state.round] || {};
    const allCommitted = parts.length > 0 && parts.every(id => id in commitsR);
    if (state.forced[state.round] || allCommitted) {
      revealedRounds.add(state.round);
      publish({
        id: `reveal:${self}:${state.round}`,
        type: 'reveal',
        from: self,
        round: state.round,
        pick: myCommit.pick,
        nonce: myCommit.nonce,
      });
    }
  }

  let verifying = false;
  function runVerify() {
    if (verifying) return;
    verifying = true;
    Promise.resolve(processVerifications()).finally(() => { verifying = false; });
  }

  /** Verify any reveals whose commit is now known. Async (hashing). */
  async function processVerifications() {
    let changed = false;
    const still = [];
    for (const pr of pendingReveals) {
      const hash = state.commits[pr.round]?.[pr.from];
      if (!hash) { still.push(pr); continue; }           // commit not here yet — retry later
      if (await verify(pr.pick, pr.nonce, hash, hasher)) {
        verified[pr.round] ??= {};
        // Structured picks (arrays/objects) break reference equality — compare
        // canonical forms so duplicate reveals don't re-notify forever.
        const prev = verified[pr.round][pr.from];
        if (prev === undefined || canonicalize(prev) !== canonicalize(pr.pick)) {
          verified[pr.round][pr.from] = pr.pick;
          changed = true;
        }
      }
      // invalid (tampered/equivocation) → dropped
    }
    pendingReveals.length = 0;
    pendingReveals.push(...still);
    if (changed) notify();
    return changed;
  }

  function getView() {
    const view = deriveView(state, self, activeIds(), verified);
    if (view.board) {
      // Merge in this client's own unrevealed drafts (never gossiped, so
      // deriveView can't see them — that's the entire blind-mode mechanism)
      // and stamp `mine` on every card so the UI can gate edit/delete to the
      // author while leaving move/reorder open to everyone.
      const draftsByCol = new Map();
      if (!view.board.cardsRevealed) {
        for (const [cardId, card] of localDraftCards) {
          const list = draftsByCol.get(card.col) || [];
          list.push({ cardId, from: self, ver: 0, pending: true, ...card });
          draftsByCol.set(card.col, list);
        }
      }
      view.board = {
        ...view.board,
        columns: view.board.columns.map(col => ({
          ...col,
          cards: [...col.cards, ...(draftsByCol.get(col.key) || [])]
            .map(c => ({ ...c, mine: c.author === self }))
            .sort(compareCards),
        })),
      };
    }
    return view;
  }

  /* ---- facilitator register ---- */
  function claimFacilitator(holder, term) {
    publish({ id: `fac:${term}:${holder}`, type: 'facilitator', from: self, holder, term });
  }
  // Recover a lost facilitator: if the registered holder is gone, the smallest
  // live peer re-claims (term+1). Termed register → converges, no cycle. A null
  // holder (no explicit facilitator ever set) is left to the deterministic
  // fallback in deriveView, so this never races the creator's initial seed.
  function maybeRecoverFacilitator() {
    const reg = state.facilitator.holder;
    if (reg == null) return;
    const parts = participants();
    if (!parts.length || parts.includes(reg)) return;
    if (facilitatorOf(parts) === self && reg !== self) {
      claimFacilitator(self, state.facilitator.term + 1);
    }
  }
  function handOff(toId) {
    if (!getView().isFacilitator || toId === self) return;
    if (!state.names[toId] || state.departed[toId]) return;
    claimFacilitator(toId, state.facilitator.term + 1);
  }

  /* ---- driven by the caller ---- */
  function join() {
    heartbeat();                          // announce presence
    if (isCreator) claimFacilitator(self, 0);  // creator is facilitator by default
  }
  function heartbeat() {
    lastHeard.set(self, now());
    publish({ id: `presence:${self}:${presenceSeq}`, type: 'presence', from: self, name, seq: presenceSeq });
    presenceSeq += 1;
  }
  function tick() {
    // recompute (liveness may have dropped a stuck peer → unblock reveal or
    // trigger facilitator recovery)
    maybeAutoReveal();
    maybeRecoverFacilitator();
    if (autoVerify && pendingReveals.length) runVerify();
    notify();
  }

  /* ---- user actions ---- */
  async function lock(pick) {
    if (!state.game || revealedRounds.has(state.round)) return;
    const commitsR = state.commits[state.round] || {};
    if (self in commitsR) return;                        // already committed
    const nonce = randomNonce();
    const hash = await makeCommit(pick, nonce, hasher);
    myCommit = { round: state.round, pick, nonce };
    verified[state.round] ??= {};
    verified[state.round][self] = pick;                  // I trust my own pick
    publish({ id: `commit:${self}:${state.round}`, type: 'commit', from: self, round: state.round, hash });
  }

  function selectGame(game, config = {}) {
    if (!getView().isFacilitator) return;
    const round = state.round + 1;
    myCommit = null;
    publish({ id: `select:${round}:${self}`, type: 'select-game', from: self, round, game, config });
  }

  function backToLobby() {
    if (!getView().isFacilitator) return;
    const round = state.round + 1;
    myCommit = null;
    publish({ id: `lobby:${round}:${self}`, type: 'back-to-lobby', from: self, round });
  }

  function forceReveal() {
    if (!getView().isFacilitator) return;
    publish({ id: `force:${state.round}:${self}`, type: 'force-reveal', from: self, round: state.round });
  }

  function leave() {
    publish({ id: `leave:${self}`, type: 'leave', from: self });
  }

  /* ---- board (retro/AAR) cards ---- */
  function isBlindPreReveal(view) {
    return view.board && view.board.privacy === 'blind' && !view.board.cardsRevealed;
  }
  function publishCard(cardId, ver, card) {
    publish({ id: `card:${cardId}:${ver}`, type: 'card', from: self, round: state.round, cardId, ver, card });
  }

  function addCard(col, text, extra = {}) {
    const view = getView();
    if (!view.board) return null;
    const cardId = `${self}:${cardCounter++}`;
    const colCards = view.board.columns.find(c => c.key === col)?.cards || [];
    const order = orderBetween(colCards.length ? colCards[colCards.length - 1].order : '', '');
    const card = { text: String(text).slice(0, 280), col, order, author: self, deleted: false, ...extra };
    if (isBlindPreReveal(view)) {
      localDraftCards.set(cardId, card);
      saveDraftStash();
      notify();
    } else {
      publishCard(cardId, 1, card);
    }
    return cardId;
  }

  function editCard(cardId, text) {
    if (localDraftCards.has(cardId)) {
      const d = localDraftCards.get(cardId);
      if (d.author !== self) return;
      localDraftCards.set(cardId, { ...d, text: String(text).slice(0, 280) });
      saveDraftStash();
      notify();
      return;
    }
    const existing = state.cards[state.round]?.[cardId];
    if (!existing || existing.author !== self) return;
    publishCard(cardId, existing.ver + 1, { ...existing, text: String(text).slice(0, 280) });
  }

  function moveCard(cardId, col, order) {
    if (localDraftCards.has(cardId)) {
      const d = localDraftCards.get(cardId);
      localDraftCards.set(cardId, { ...d, col, order });
      saveDraftStash();
      notify();
      return;
    }
    const existing = state.cards[state.round]?.[cardId];
    if (!existing) return;
    publishCard(cardId, existing.ver + 1, { ...existing, col, order });
  }

  function deleteCard(cardId) {
    if (localDraftCards.has(cardId)) {
      const d = localDraftCards.get(cardId);
      if (d.author !== self) return;
      localDraftCards.delete(cardId);
      saveDraftStash();
      notify();
      return;
    }
    const existing = state.cards[state.round]?.[cardId];
    if (!existing || existing.author !== self) return;
    publishCard(cardId, existing.ver + 1, { ...existing, deleted: true });
  }

  function revealCards() {
    const view = getView();
    if (!view.isFacilitator || !view.board) return;
    publish({ id: `reveal-cards:${state.round}`, type: 'reveal-cards', from: self, round: state.round });
  }

  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  return {
    self,
    join, heartbeat, tick,
    lock, selectGame, backToLobby, forceReveal, leave, handOff,
    addCard, editCard, moveCard, deleteCard, revealCards,
    processVerifications, getView, onChange,
    _debug: () => ({ state, verified }),
  };
}

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
import { reduce, initialState, deriveView, facilitatorOf } from './gameState.js';
import { createGossip } from '../net/gossip.js';
import { commit as makeCommit, verify, sha256Hex } from './commitReveal.js';
import { canonicalize } from './canonical.js';

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
}) {
  const self = transport.localPeerId;
  let state = initialState();
  const verified = {};            // round -> peerId -> pick
  const lastHeard = new Map();    // peerId -> timestamp
  const pendingReveals = [];      // reveals awaiting their commit / verification
  const revealedRounds = new Set();
  let myCommit = null;            // { round, pick, nonce } for auto-reveal
  let presenceSeq = 0;
  const listeners = new Set();
  let lastNotifiedJson = null;    // skip no-op notifies so the UI doesn't re-render

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
    return deriveView(state, self, activeIds(), verified);
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

  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  return {
    self,
    join, heartbeat, tick,
    lock, selectGame, backToLobby, forceReveal, leave, handOff,
    processVerifications, getView, onChange,
    _debug: () => ({ state, verified }),
  };
}

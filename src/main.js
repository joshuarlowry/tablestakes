import { createRoomInvite, createWsRoomTransport } from './transports/wsRoom.js';
import { createGameClient } from './game/gameClient.js';
import { RPS } from './game/rules.js';
import './style.css';

/* ============ config & helpers ============ */
const RELAY_URL = import.meta.env.VITE_RELAY_URL || 'wss://tablestakes-turn.joshuarlowry.workers.dev';
const $ = id => document.getElementById(id);
const hashParams = () => new URLSearchParams(location.hash.replace(/^#/, ''));
const inviteUrl = () =>
  `${location.origin}${location.pathname}?room=${encodeURIComponent(roomCode)}#token=${encodeURIComponent(inviteToken)}`;

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ============ state ============ */
let client = null;
let roomCode = null;
let inviteToken = '';
let createdRoom = false;
let myChoice = null;
let lastRound = -1;
let heartbeatTimer = null;
let tickTimer = null;

/* ============ boot ============ */
const params = new URLSearchParams(location.search);
roomCode = params.get('room');
createdRoom = !roomCode;
inviteToken = hashParams().get('token') || params.get('token') || '';

if (inviteToken) $('inviteTokenInput').value = inviteToken;

if (roomCode) {
  $('createBtn').textContent = 'Join room';
  const note = $('joinNote');
  note.style.display = 'inline';
  note.textContent = `joining ${roomCode}`;
}

$('createBtn').addEventListener('click', enter);
$('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') enter(); });
$('copyBtn').addEventListener('click', async () => {
  syncInviteLink();
  const url = $('inviteLinkInput').value;
  try { await navigator.clipboard.writeText(url); } catch { prompt('Copy this link:', url); }
  const t = $('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
});
$('leaveBtn').addEventListener('click', leaveRoom);

async function enter() {
  const name = $('nameInput').value.trim();
  if (!name) { $('nameInput').focus(); return; }

  if (!roomCode) {
    const invite = createRoomInvite();
    roomCode = invite.roomId;
    inviteToken = invite.inviteToken;
    $('inviteTokenInput').value = inviteToken;
    history.replaceState(null, '', inviteUrl());
  } else {
    inviteToken = $('inviteTokenInput').value.trim() || inviteToken;
    if (!inviteToken) { $('transportError').textContent = 'This room needs an invitation token.'; return; }
    history.replaceState(null, '', inviteUrl());
  }

  $('createBtn').disabled = true;
  const port = createWsRoomTransport({
    wsUrl: RELAY_URL,
    roomId: roomCode,
    inviteToken,
    name,
    onHealth: renderHealth,
    onError: renderTransportError,
  });
  $('createBtn').disabled = false;

  client = createGameClient({ transport: port, name, autoVerify: true, isCreator: createdRoom });
  client.onChange(render);
  client.join();
  heartbeatTimer = setInterval(() => client.heartbeat(), 5000);
  tickTimer = setInterval(() => client.tick(Date.now()), 2000);

  $('entry').classList.add('hidden');
  $('room').classList.add('visible');
  $('roomCodeText').textContent = roomCode;
  syncInviteLink();
  render(client.getView());
}

function syncInviteLink() {
  if (!roomCode || !inviteToken) return;
  $('inviteLinkInput').value = inviteUrl();
}

function leaveRoom() {
  client?.leave();
  client = null;
  clearInterval(heartbeatTimer);
  clearInterval(tickTimer);
  roomCode = null;
  inviteToken = '';
  myChoice = null;
  lastRound = -1;
  history.replaceState(null, '', location.pathname);
  $('room').classList.remove('visible');
  $('entry').classList.remove('hidden');
  $('createBtn').textContent = 'Start a room';
  $('joinNote').style.display = 'none';
  $('joinNote').textContent = '';
  $('roomCodeText').textContent = '';
  $('inviteLinkInput').value = '';
  $('inviteTokenInput').value = '';
  $('transportError').textContent = '';
  $('healthErrors').textContent = '';
  $('localPeerId').textContent = 'pending';
  $('transportStatus').textContent = 'idle';
  $('peerCount').textContent = '0';
  $('reconnectAttempts').textContent = '0';
  $('players').innerHTML = '';
  $('stage').innerHTML = '';
  setConn(false, 0);
}

/* ============ health panel ============ */
function renderTransportError(error) {
  $('healthErrors').textContent = error.message || String(error);
}
function renderHealth(health) {
  $('localPeerId').textContent = health.localPeerId || 'pending';
  $('transportStatus').textContent = health.status;
  $('peerCount').textContent = String(health.peerCount);
  $('reconnectAttempts').textContent = String(health.reconnectAttempts);
}
function setConn(live, count) {
  $('conn').classList.toggle('live', live);
  $('connText').textContent = live ? `${count} connected` : client ? 'waiting for peers' : 'offline';
}

/* ============ rendering ============ */
function render(view) {
  if (view.round !== lastRound) { myChoice = null; lastRound = view.round; }
  renderPlayers(view);
  const stage = $('stage');
  if (view.phase === 'lobby') stage.innerHTML = viewLobby(view);
  else if (view.phase === 'pick') stage.innerHTML = viewPick(view);
  else stage.innerHTML = viewReveal(view);
  bindStage(view);
  setConn(view.participants.length > 1, view.participants.length);
}

function renderPlayers(view) {
  $('players').innerHTML = view.participants.map(id => `
    <div class="player ${view.committedIds.includes(id) ? 'locked' : ''} ${id === client.self ? 'me' : ''}">
      <span class="pip"></span>
      <span>${esc(view.names[id] || '…')}</span>
      ${id === view.facilitator ? '<span class="tag">FACILITATOR</span>' : ''}
      ${view.isFacilitator && id !== client.self && id !== view.facilitator
        ? `<button class="mini-action" data-facilitator="${esc(id)}">Make facilitator</button>` : ''}
    </div>`).join('');
}

function viewLobby(view) {
  if (view.isFacilitator) return `
    <div class="stage-kicker">Round table</div>
    <div class="stage-title">Pick a <em>game</em></div>
    <p class="stage-sub">You're facilitating. Everyone locks in blind — nothing is shown until all hands are in.</p>
    <div class="game-cards">
      <button class="game-card" data-game="rps">
        <div class="gc-glyphs">✊ ✋ ✌️</div>
        <div class="gc-name">Rock · Paper · Scissors</div>
        <div class="gc-desc">The classic settler of disputes. Head-to-head or whole-team throwdown.</div>
      </button>
      <button class="game-card" data-game="f2f">
        <div class="gc-glyphs">☝️ 🖐</div>
        <div class="gc-name">Fist to Five</div>
        <div class="gc-desc">Gauge the room. Zero is a hard no, five is full-throated support.</div>
      </button>
    </div>`;
  return `
    <div class="stage-kicker">Round table</div>
    <div class="stage-title">Waiting on the <em>facilitator</em></div>
    <p class="waiting-host">${esc(view.names[view.facilitator] || 'The facilitator')} is choosing a game…</p>`;
}

function viewPick(view) {
  const locked = view.iAmCommitted;
  const choices = view.game === 'rps'
    ? Object.entries(RPS).map(([k, v]) => `
        <button class="choice ${myChoice === k ? 'selected' : ''}" data-pick="${k}" ${locked ? 'disabled' : ''}>
          <span class="glyph">${v.glyph}</span>
          <span class="lbl">${k}</span>
        </button>`).join('')
    : [0, 1, 2, 3, 4, 5].map(n => `
        <button class="choice ${myChoice === n ? 'selected' : ''}" data-pick="${n}" ${locked ? 'disabled' : ''}>
          <span class="num">${n}</span>
          <span class="lbl">${n === 0 ? 'fist' : n === 5 ? 'all in' : '&nbsp;'}</span>
        </button>`).join('');
  const title = view.game === 'rps'
    ? `Round ${view.round} — Rock Paper Scissors</div><div class="stage-title">Make your <em>throw</em>`
    : `Round ${view.round} — Fist to Five</div><div class="stage-title">How do you <em>really</em> feel?`;
  return `
    <div class="stage-kicker">${title}</div>
    <div class="choices">${choices}</div>
    ${lockLine(locked, view.remaining)}
    ${view.isFacilitator && locked && view.remaining > 0
      ? `<div class="stage-actions"><button class="btn-ghost" id="forceBtn">Reveal now</button></div>` : ''}`;
}

function lockLine(locked, remaining) {
  if (!locked) return `<div class="lock-note">Your pick locks in immediately — choose with intent.</div>`;
  return `<div class="lock-note"><strong>Locked in.</strong> Waiting on ${remaining} player${remaining === 1 ? '' : 's'}…</div>`;
}

function viewReveal(view) {
  const picks = view.revealPicks || {};
  const ids = Object.keys(picks);
  return view.game === 'rps' ? revealRps(view, picks, ids) : revealF2f(view, picks, ids);
}

function revealRps(view, picks, ids) {
  const res = view.result;
  const winners = new Set(res.winners);
  let verdict;
  if (res.outcome === 'draw') verdict = ids.length === 2 ? `A <em>draw.</em> Run it back.` : `Everyone threw the same. A <em>draw.</em>`;
  else if (res.outcome === 'stalemate') verdict = `All three throws on the table — <em>stalemate.</em>`;
  else if (ids.length === 2) {
    const w = res.winners[0];
    const l = ids.find(i => i !== w);
    verdict = `<em>${esc(view.names[w] || 'Someone')}</em> takes it — ${picks[w]} beats ${picks[l]}.`;
  } else {
    const t = res.winningThrow;
    verdict = `<em>${t[0].toUpperCase() + t.slice(1)}</em> wins the round.`;
  }
  return `
    <div class="stage-kicker">Round ${view.round} — the reveal</div>
    <div class="verdict">${verdict}</div>
    <div class="results">
      ${ids.map((id, i) => `
        <div class="result-row ${winners.has(id) ? 'winner' : ''}" style="animation-delay:${i * 90}ms">
          <span class="r-glyph">${RPS[picks[id]]?.glyph || '?'}</span>
          <span class="r-name">${esc(view.names[id] || 'departed player')}</span>
          <span class="r-choice">${esc(picks[id])}${winners.has(id) ? ' · win' : ''}</span>
        </div>`).join('')}
    </div>
    ${facilitatorActions(view, 'Throw again')}`;
}

function revealF2f(view, picks, ids) {
  const res = view.result;
  let verdict;
  if (res.hardNo) verdict = `A fist on the table — <em>someone is blocking.</em> Talk it out.`;
  else if (res.consensus && res.avg >= 4) verdict = `<span class="consensus">Strong consensus.</span> Ship it.`;
  else if (res.consensus) verdict = `<span class="consensus">Aligned</span> — the room agrees.`;
  else verdict = `The room is <em>split.</em> Hear from the ${res.min}s and the ${res.max}s.`;
  const sorted = [...ids].sort((a, b) => Number(picks[a]) - Number(picks[b]));
  return `
    <div class="stage-kicker">Round ${view.round} — the reveal</div>
    <div class="verdict">${verdict}</div>
    <div class="stat-strip">
      <div class="stat"><div class="s-val">${res.avg.toFixed(1)}</div><div class="s-lbl">average</div></div>
      <div class="stat"><div class="s-val">${res.spread}</div><div class="s-lbl">spread</div></div>
    </div>
    <div class="results">
      ${sorted.map((id, i) => `
        <div class="result-row" style="animation-delay:${i * 90}ms">
          <span class="r-num">${esc(picks[id])}</span>
          <span class="r-name">${esc(view.names[id] || 'departed player')}</span>
          <span class="r-choice">${Number(picks[id]) === 0 ? 'block' : Number(picks[id]) >= 4 ? 'support' : 'reserved'}</span>
        </div>`).join('')}
    </div>
    ${facilitatorActions(view, 'Vote again')}`;
}

function facilitatorActions(view, againLabel) {
  if (!view.isFacilitator) return `<div class="lock-note">Waiting on ${esc(view.names[view.facilitator] || 'the facilitator')} for the next round…</div>`;
  return `
    <div class="stage-actions">
      <button class="btn-primary" id="againBtn">${againLabel}</button>
      <button class="btn-ghost" id="lobbyBtn">Change game</button>
    </div>`;
}

function bindStage(view) {
  document.querySelectorAll('[data-game]').forEach(b =>
    b.addEventListener('click', () => client.selectGame(b.dataset.game)));
  document.querySelectorAll('[data-pick]').forEach(b =>
    b.addEventListener('click', () => {
      const v = view.game === 'f2f' ? Number(b.dataset.pick) : b.dataset.pick;
      myChoice = v;
      client.lock(v);
      render(client.getView());
    }));
  const again = $('againBtn');
  if (again) again.addEventListener('click', () => client.selectGame(view.game));
  const lobby = $('lobbyBtn');
  if (lobby) lobby.addEventListener('click', () => client.backToLobby());
  const force = $('forceBtn');
  if (force) force.addEventListener('click', () => client.forceReveal());
  document.querySelectorAll('[data-facilitator]').forEach(b =>
    b.addEventListener('click', () => client.handOff(b.dataset.facilitator)));
}

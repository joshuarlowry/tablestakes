import { createRoomInvite, createWsRoomTransport } from './transports/wsRoom.js';
import { createGameClient } from './game/gameClient.js';
import { $, esc } from './ui/dom.js';
import { renderLobby, bindLobby } from './ui/lobby.js';
import { uiFor } from './ui/registry.js';
import './style.css';

/* ============ config & helpers ============ */
const RELAY_URL = import.meta.env.VITE_RELAY_URL || 'wss://tablestakes-turn.joshuarlowry.workers.dev';
const hashParams = () => new URLSearchParams(location.hash.replace(/^#/, ''));
const inviteUrl = () =>
  `${location.origin}${location.pathname}?room=${encodeURIComponent(roomCode)}#token=${encodeURIComponent(inviteToken)}`;

/* ============ state ============ */
let client = null;
let roomCode = null;
let inviteToken = '';
let createdRoom = false;
let uiLocal = {};      // per-round local UI state (draft picks, config forms)
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

  const port = createWsRoomTransport({
    wsUrl: RELAY_URL,
    roomId: roomCode,
    inviteToken,
    name,
    onHealth: renderHealth,
    onError: renderTransportError,
  });

  client = createGameClient({ transport: port, name, autoVerify: true, isCreator: createdRoom, roomId: roomCode });
  client.onChange(render);
  client.join();
  heartbeatTimer = setInterval(() => client.heartbeat(), 5000);
  tickTimer = setInterval(() => client.tick(), 2000);

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
  uiLocal = {};
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
  if (view.round !== lastRound) { uiLocal = {}; lastRound = view.round; }
  renderPlayers(view);
  const stage = $('stage');
  const gameUi = view.game ? uiFor(view.game) : null;

  if (view.phase === 'lobby' || !gameUi) {
    stage.innerHTML = renderLobby(view, uiLocal);
  } else if (view.phase === 'board') {
    stage.innerHTML = gameUi.renderBoard(view, uiLocal);
  } else if (view.phase === 'pick') {
    stage.innerHTML = gameUi.renderPick(view, uiLocal) + forceRevealAction(view);
  } else {
    stage.innerHTML = gameUi.renderReveal(view);
  }
  bindStage(view, gameUi);
  setConn(view.participants.length > 1, view.participants.length);
}

function forceRevealAction(view) {
  if (!(view.isFacilitator && view.iAmCommitted && view.remaining > 0)) return '';
  return `<div class="stage-actions"><button class="btn-ghost" id="forceBtn">Reveal now</button></div>`;
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

function rerender() { render(client.getView()); }

function bindStage(view, gameUi) {
  if (view.phase === 'lobby' || !gameUi) {
    bindLobby(view, client, uiLocal, rerender);
  } else if (view.phase === 'board') {
    gameUi.bindBoard(view, client, uiLocal, rerender);
  } else if (view.phase === 'pick') {
    gameUi.bind(view, client, uiLocal, rerender);
    const force = $('forceBtn');
    if (force) force.addEventListener('click', () => client.forceReveal());
  } else {
    gameUi.bind(view, client, uiLocal, rerender);
    const again = $('againBtn');
    if (again) again.addEventListener('click', () => {
      if (gameUi.againOpensConfig) {
        // Reopen the config step (e.g. a new motion needs a new question).
        // backToLobby() renders (and resets uiLocal) synchronously, so set the
        // config state afterwards and re-render.
        client.backToLobby();
        uiLocal.configGame = view.game;
        uiLocal.configDraft = {};
        rerender();
      } else {
        client.selectGame(view.game, view.config);
      }
    });
    const lobby = $('lobbyBtn');
    if (lobby) lobby.addEventListener('click', () => client.backToLobby());
  }
  document.querySelectorAll('[data-facilitator]').forEach(b =>
    b.addEventListener('click', () => client.handOff(b.dataset.facilitator)));
}

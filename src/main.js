import {
  createSecureNostrInvite,
  createTrysteroNostrTransport,
} from './transports/trysteroNostr.js';
import './style.css';

/* ============ config & helpers ============ */
const APP_NAMESPACE = 'tablestakes-v1';
const $ = id => document.getElementById(id);
const hashParams = () => new URLSearchParams(location.hash.replace(/^#/, ''));
const inviteUrl = () =>
  `${location.origin}${location.pathname}?room=${encodeURIComponent(roomCode)}#token=${encodeURIComponent(inviteToken)}`;

const RPS = {
  rock:     {glyph:'✊', beats:'scissors'},
  paper:    {glyph:'✋', beats:'rock'},
  scissors: {glyph:'✌️', beats:'paper'},
};

/* ============ state ============ */
let transport = null;
let localPeerId = null;
let myName = '';
let hostId = null;                 // lowest peer id = host
const names = {};                  // peerId -> name (includes self)
let sendHello, sendPick, sendState;

// host-authoritative game state (mirrored to peers via 'state')
let G = {
  phase: 'lobby',        // lobby | pick | reveal
  game: null,            // rps | f2f
  round: 0,
  locked: [],            // peerIds locked in
  results: null,         // peerId -> choice (only present in reveal)
};
const hostPicks = {};    // host-only: peerId -> choice
let myPick = null;

/* ============ boot ============ */
const params = new URLSearchParams(location.search);
let roomCode = params.get('room');
const createdRoom = !roomCode;
let inviteToken = hashParams().get('token') || params.get('token') || '';

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

function enter() {
  myName = $('nameInput').value.trim();
  if (!myName) { $('nameInput').focus(); return; }
  if (!roomCode) {
    const invite = createSecureNostrInvite();
    roomCode = invite.roomId;
    inviteToken = invite.inviteToken;
    $('inviteTokenInput').value = inviteToken;
    history.replaceState(null, '', inviteUrl());
  } else {
    inviteToken = $('inviteTokenInput').value.trim() || inviteToken;
    if (!inviteToken) {
      $('transportError').textContent = 'This room needs an invitation token.';
      return;
    }
    history.replaceState(null, '', inviteUrl());
  }
  try {
    connect();
  } catch (error) {
    $('transportError').textContent = error.message;
    return;
  }
  names[localPeerId] = myName;
  $('entry').classList.add('hidden');
  $('room').classList.add('visible');
  $('roomCodeText').textContent = roomCode;
  syncInviteLink();
  render();
}

function syncInviteLink() {
  if (!roomCode || !inviteToken) return;
  $('inviteLinkInput').value = inviteUrl();
}

/* ============ networking ============ */
function connect() {
  transport = createTrysteroNostrTransport({
    roomId: roomCode,
    inviteToken,
    appNamespace: APP_NAMESPACE,
    onPeerJoin: handlePeerJoin,
    onPeerLeave: handlePeerLeave,
    onHealth: renderHealth,
    onError: renderTransportError,
  });
  localPeerId = transport.localPeerId;
  if (createdRoom) hostId = localPeerId;

  sendHello = transport.makeAction('hello', (payload, peerId) => {
    const hello = normalizeHello(payload);
    names[peerId] = hello.name;
    acceptHost(hello.hostId);
    render();
  });

  sendPick = transport.makeAction('pick', (choice, peerId) => {
    if (!iAmHost()) return;               // only host records picks
    hostRecordPick(peerId, choice);
  });

  sendState = transport.makeAction('state', (message) => {
    if (iAmHost()) return;                // host is the source of truth
    const state = normalizeState(message);
    acceptHost(state.hostId);
    G = state.gameState;
    if (G.phase !== 'pick') myPick = null;
    if (G.phase === 'pick' && !G.locked.includes(localPeerId)) {/* keep my un-locked pick */}
    render();
  });

  setConn(false); // until first peer arrives
}

function handlePeerJoin(peerId) {
  if (!sendHello || !sendState) {
    setTimeout(() => handlePeerJoin(peerId), 0);
    return;
  }
  sendHello(makeHello(), peerId);
  if (iAmHost()) sendState(makeStateMessage(), peerId);  // catch the newcomer up
  setConn(true);
  render();
}

function handlePeerLeave(peerId) {
  delete names[peerId];
  delete hostPicks[peerId];
  const wasHost = peerId === hostId;
  if (wasHost) electFallbackHost();
  if (iAmHost()) {
    G.locked = G.locked.filter(id => id !== peerId);
    if (wasHost && G.phase === 'pick') {
      // host changed mid-round: keep it simple, restart the round
      startRound(G.game);
    } else {
      hostCheckAllIn();
      broadcast();
    }
  }
  if (Object.keys(names).length === 1) setConn(false);
  render();
}

function playerIds() { return Object.keys(names).sort(); }
function makeHello() {
  return {name: myName, hostId};
}
function normalizeHello(payload) {
  if (payload && typeof payload === 'object') {
    return {
      name: String(payload.name || '').slice(0, 20) || 'peer',
      hostId: typeof payload.hostId === 'string' ? payload.hostId : null,
    };
  }
  return {name: String(payload).slice(0, 20) || 'peer', hostId: null};
}
function makeStateMessage() {
  return {hostId, gameState: G};
}
function normalizeState(message) {
  if (message && typeof message === 'object' && 'gameState' in message) {
    return {
      hostId: typeof message.hostId === 'string' ? message.hostId : null,
      gameState: message.gameState,
    };
  }
  return {hostId: null, gameState: message};
}
function acceptHost(candidateHostId) {
  if (!candidateHostId || hostId) return;
  hostId = candidateHostId;
}
function electFallbackHost() {
  hostId = playerIds()[0] ?? localPeerId;
}
function iAmHost() { return hostId === localPeerId; }
function setConn(live) {
  $('conn').classList.toggle('live', live);
  $('connText').textContent = live ? `${playerIds().length} connected` : 'waiting for peers';
}

function renderTransportError(error) {
  $('healthErrors').textContent = error.message || String(error);
}

function renderHealth(health) {
  $('localPeerId').textContent = health.localPeerId || 'pending';
  $('transportStatus').textContent = health.status;
  $('peerCount').textContent = String(health.peerCount);
  $('reconnectAttempts').textContent = String(health.reconnectAttempts);
  $('healthPeers').innerHTML = health.peers.length
    ? health.peers.map(peer => `
      <div class="health-peer">
        <span class="mono">${esc(shortId(peer.peerId))}</span>
        <span>${peer.joinMs == null ? 'joining' : `${peer.joinMs}ms join`}</span>
        <span>${peer.lastRttMs == null ? 'rtt --' : `${peer.lastRttMs}ms rtt`}</span>
        <span>${peer.authenticated ? 'auth ok' : 'auth pending'}</span>
        <span>${peer.disconnects} drop${peer.disconnects === 1 ? '' : 's'}</span>
      </div>`).join('')
    : '<div class="health-empty">No remote peers yet.</div>';
}

function shortId(peerId) {
  return `${String(peerId).slice(0, 6)}...${String(peerId).slice(-4)}`;
}

/* ============ host logic ============ */
function broadcast() { if (transport) sendState(makeStateMessage()); render(); }

function selectGame(game) {
  if (!iAmHost()) return;
  startRound(game);
}

function startRound(game) {
  G = {phase: 'pick', game, round: G.round + 1, locked: [], results: null};
  for (const k of Object.keys(hostPicks)) delete hostPicks[k];
  myPick = null;
  broadcast();
}

function hostRecordPick(peerId, choice) {
  if (G.phase !== 'pick') return;
  hostPicks[peerId] = choice;
  if (!G.locked.includes(peerId)) G.locked = [...G.locked, peerId];
  hostCheckAllIn();
  broadcast();
}

function hostCheckAllIn() {
  if (G.phase !== 'pick') return;
  const ids = playerIds();
  if (ids.length > 1 && ids.every(id => G.locked.includes(id))) {
    G.phase = 'reveal';
    G.results = {...hostPicks};
  }
}

function backToLobby() {
  if (!iAmHost()) return;
  G = {...G, phase: 'lobby', game: null, locked: [], results: null};
  broadcast();
}

/* ============ my actions ============ */
function lockPick(choice) {
  if (G.phase !== 'pick' || G.locked.includes(localPeerId)) return;
  myPick = choice;
  if (iAmHost()) hostRecordPick(localPeerId, choice);
  else if (!hostId) render();
  else { sendPick(choice, hostId); render(); }
}

/* ============ rendering ============ */
function render() {
  renderPlayers();
  const stage = $('stage');
  if (G.phase === 'lobby') stage.innerHTML = viewLobby();
  else if (G.phase === 'pick') stage.innerHTML = viewPick();
  else stage.innerHTML = viewReveal();
  bindStage();
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderPlayers() {
  $('players').innerHTML = playerIds().map(id => `
    <div class="player ${G.locked.includes(id) ? 'locked' : ''} ${id === localPeerId ? 'me' : ''}">
      <span class="pip"></span>
      <span>${esc(names[id] || '…')}</span>
      ${id === hostId ? '<span class="tag">HOST</span>' : ''}
    </div>`).join('');
  setConn(playerIds().length > 1);
}

function viewLobby() {
  if (iAmHost()) return `
    <div class="stage-kicker">Round table</div>
    <div class="stage-title">Pick a <em>game</em></div>
    <p class="stage-sub">You're hosting. Everyone locks in blind — nothing is shown until all hands are in.</p>
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
    <div class="stage-title">Waiting on the <em>host</em></div>
    <p class="waiting-host">${esc(names[hostId] || 'The host')} is choosing a game…</p>`;
}

function viewPick() {
  const locked = G.locked.includes(localPeerId);
  const remaining = playerIds().length - G.locked.length;

  if (G.game === 'rps') {
    return `
      <div class="stage-kicker">Round ${G.round} — Rock Paper Scissors</div>
      <div class="stage-title">Make your <em>throw</em></div>
      <div class="choices">
        ${Object.entries(RPS).map(([k, v]) => `
          <button class="choice ${myPick === k ? 'selected' : ''}" data-pick="${k}" ${locked ? 'disabled' : ''}>
            <span class="glyph">${v.glyph}</span>
            <span class="lbl">${k}</span>
          </button>`).join('')}
      </div>
      ${lockLine(locked, remaining)}`;
  }
  return `
    <div class="stage-kicker">Round ${G.round} — Fist to Five</div>
    <div class="stage-title">How do you <em>really</em> feel?</div>
    <div class="choices">
      ${[0,1,2,3,4,5].map(n => `
        <button class="choice ${myPick === n ? 'selected' : ''}" data-pick="${n}" ${locked ? 'disabled' : ''}>
          <span class="num">${n}</span>
          <span class="lbl">${n === 0 ? 'fist' : n === 5 ? 'all in' : '&nbsp;'}</span>
        </button>`).join('')}
    </div>
    ${lockLine(locked, remaining)}`;
}

function lockLine(locked, remaining) {
  if (!locked) return `<div class="lock-note">Your pick locks in immediately — choose with intent.</div>`;
  return `<div class="lock-note"><strong>Locked in.</strong> Waiting on ${remaining} player${remaining === 1 ? '' : 's'}…</div>`;
}

function viewReveal() {
  const R = G.results || {};
  const ids = Object.keys(R);

  if (G.game === 'rps') return viewRevealRPS(R, ids);
  return viewRevealF2F(R, ids);
}

function viewRevealRPS(R, ids) {
  let verdict = '';
  let winners = new Set();

  const thrown = new Set(Object.values(R));
  if (ids.length === 2) {
    const [a, b] = ids;
    if (R[a] === R[b]) verdict = `A <em>draw.</em> Run it back.`;
    else {
      const w = RPS[R[a]].beats === R[b] ? a : b;
      winners.add(w);
      const l = w === a ? b : a;
      verdict = `<em>${esc(names[w] || 'Someone')}</em> takes it — ${R[w]} beats ${R[l]}.`;
    }
  } else if (thrown.size === 2) {
    // group rules: with exactly two throws present, one side wins
    const [t1, t2] = [...thrown];
    const winning = RPS[t1].beats === t2 ? t1 : t2;
    ids.forEach(id => { if (R[id] === winning) winners.add(id); });
    verdict = `<em>${winning[0].toUpperCase() + winning.slice(1)}</em> wins the round.`;
  } else if (thrown.size === 1) {
    verdict = `Everyone threw the same. A <em>draw.</em>`;
  } else {
    verdict = `All three throws on the table — <em>stalemate.</em>`;
  }

  return `
    <div class="stage-kicker">Round ${G.round} — the reveal</div>
    <div class="verdict">${verdict}</div>
    <div class="results">
      ${ids.map((id, i) => `
        <div class="result-row ${winners.has(id) ? 'winner' : ''}" style="animation-delay:${i * 90}ms">
          <span class="r-glyph">${RPS[R[id]]?.glyph || '?'}</span>
          <span class="r-name">${esc(names[id] || 'departed player')}</span>
          <span class="r-choice">${esc(R[id])}${winners.has(id) ? ' · win' : ''}</span>
        </div>`).join('')}
    </div>
    ${hostActions('Throw again')}`;
}

function viewRevealF2F(R, ids) {
  const vals = ids.map(id => Number(R[id]));
  const avg = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  const spread = vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
  const consensus = spread <= 1;
  const hardNo = vals.some(v => v === 0);

  let verdict;
  if (hardNo) verdict = `A fist on the table — <em>someone is blocking.</em> Talk it out.`;
  else if (consensus && avg >= 4) verdict = `<span class="consensus">Strong consensus.</span> Ship it.`;
  else if (consensus) verdict = `<span class="consensus">Aligned</span> — the room agrees.`;
  else verdict = `The room is <em>split.</em> Hear from the ${Math.min(...vals)}s and the ${Math.max(...vals)}s.`;

  const sorted = [...ids].sort((a, b) => Number(R[a]) - Number(R[b]));

  return `
    <div class="stage-kicker">Round ${G.round} — the reveal</div>
    <div class="verdict">${verdict}</div>
    <div class="stat-strip">
      <div class="stat"><div class="s-val">${avg.toFixed(1)}</div><div class="s-lbl">average</div></div>
      <div class="stat"><div class="s-val">${spread}</div><div class="s-lbl">spread</div></div>
    </div>
    <div class="results">
      ${sorted.map((id, i) => `
        <div class="result-row" style="animation-delay:${i * 90}ms">
          <span class="r-num">${esc(R[id])}</span>
          <span class="r-name">${esc(names[id] || 'departed player')}</span>
          <span class="r-choice">${Number(R[id]) === 0 ? 'block' : Number(R[id]) >= 4 ? 'support' : 'reserved'}</span>
        </div>`).join('')}
    </div>
    ${hostActions('Vote again')}`;
}

function hostActions(againLabel) {
  if (!iAmHost()) return `<div class="lock-note">Waiting on ${esc(names[hostId] || 'the host')} for the next round…</div>`;
  return `
    <div class="stage-actions">
      <button class="btn-primary" id="againBtn">${againLabel}</button>
      <button class="btn-ghost" id="lobbyBtn">Change game</button>
    </div>`;
}

function bindStage() {
  document.querySelectorAll('[data-game]').forEach(b =>
    b.addEventListener('click', () => selectGame(b.dataset.game)));
  document.querySelectorAll('[data-pick]').forEach(b =>
    b.addEventListener('click', () => {
      const v = b.dataset.pick;
      lockPick(G.game === 'f2f' ? Number(v) : v);
    }));
  const again = $('againBtn');
  if (again) again.addEventListener('click', () => startRound(G.game));
  const lobby = $('lobbyBtn');
  if (lobby) lobby.addEventListener('click', backToLobby);
}

render();

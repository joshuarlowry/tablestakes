import { joinRoom, selfId } from '@trystero-p2p/torrent';
import './style.css';

/* ============ config & helpers ============ */
const APP_ID = 'tablestakes-v1';
const $ = id => document.getElementById(id);

const WORDS_A = ['amber','brass','cedar','delta','ember','flint','grove','harbor','iron','juniper','koa','lumen','marble','noir','onyx','pine'];
const WORDS_B = ['anvil','banner','circuit','dial','engine','fable','gambit','helm','index','jetty','kiln','ledger','meridian','needle','orbit','prism'];
const makeCode = () =>
  WORDS_A[Math.floor(Math.random()*WORDS_A.length)] + '-' +
  WORDS_B[Math.floor(Math.random()*WORDS_B.length)] + '-' +
  Math.floor(Math.random()*90+10);

const RPS = {
  rock:     {glyph:'✊', beats:'scissors'},
  paper:    {glyph:'✋', beats:'rock'},
  scissors: {glyph:'✌️', beats:'paper'},
};

/* ============ state ============ */
let room = null;
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

if (roomCode) {
  $('createBtn').textContent = 'Join room';
  const note = $('joinNote');
  note.style.display = 'inline';
  note.textContent = `joining ${roomCode}`;
}

$('createBtn').addEventListener('click', enter);
$('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') enter(); });
$('copyBtn').addEventListener('click', async () => {
  const url = `${location.origin}${location.pathname}?room=${roomCode}`;
  try { await navigator.clipboard.writeText(url); } catch { prompt('Copy this link:', url); }
  const t = $('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
});

function enter() {
  myName = $('nameInput').value.trim();
  if (!myName) { $('nameInput').focus(); return; }
  if (!roomCode) {
    roomCode = makeCode();
    history.replaceState(null, '', `?room=${roomCode}`);
  }
  names[selfId] = myName;
  connect();
  $('entry').classList.add('hidden');
  $('room').classList.add('visible');
  $('roomCodeText').textContent = roomCode;
  render();
}

/* ============ networking ============ */
function connect() {
  room = joinRoom({appId: APP_ID}, roomCode);

  [sendHello] = wire('hello', (name, peerId) => {
    names[peerId] = String(name).slice(0, 20);
    render();
  });

  [sendPick] = wire('pick', (choice, peerId) => {
    if (!iAmHost()) return;               // only host records picks
    hostRecordPick(peerId, choice);
  });

  [sendState] = wire('state', (state) => {
    if (iAmHost()) return;                // host is the source of truth
    G = state;
    if (G.phase !== 'pick') myPick = null;
    if (G.phase === 'pick' && !G.locked.includes(selfId)) {/* keep my un-locked pick */}
    render();
  });

  room.onPeerJoin = peerId => {
    sendHello(myName, peerId);
    electHost();
    if (iAmHost()) sendState(G, peerId);  // catch the newcomer up
    setConn(true);
    render();
  };

  room.onPeerLeave = peerId => {
    delete names[peerId];
    delete hostPicks[peerId];
    const wasHost = peerId === hostId;
    electHost();
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
  };

  electHost();
  setConn(false); // until first peer arrives
}

function wire(name, handler) {
  const action = room.makeAction(name);
  action.onMessage = (payload, {peerId}) => handler(payload, peerId);
  return [(payload, target) => action.send(payload, target ? {target} : undefined)];
}

function playerIds() { return Object.keys(names).sort(); }
function electHost() { hostId = playerIds()[0] ?? selfId; }
function iAmHost() { return hostId === selfId; }
function setConn(live) {
  $('conn').classList.toggle('live', live);
  $('connText').textContent = live ? `${playerIds().length} connected` : 'waiting for peers';
}

/* ============ host logic ============ */
function broadcast() { if (room) sendState(G); render(); }

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
  if (G.phase !== 'pick' || G.locked.includes(selfId)) return;
  myPick = choice;
  if (iAmHost()) hostRecordPick(selfId, choice);
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
    <div class="player ${G.locked.includes(id) ? 'locked' : ''} ${id === selfId ? 'me' : ''}">
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
  const locked = G.locked.includes(selfId);
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

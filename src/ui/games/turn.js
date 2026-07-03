import { esc, lockLine, facilitatorActions, kicker } from '../dom.js';

function randomToken() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  renderPick(view, ui) {
    const locked = view.iAmCommitted;
    const excludedNames = (view.config.excluded || [])
      .filter(id => view.names[id]).map(id => view.names[id]);
    return `
      ${kicker(view, 'Turn Picker')}
      <div class="stage-title">Who goes <em>next?</em></div>
      <p class="stage-sub">Everyone contributes randomness — nobody can rig the draw. ${excludedNames.length ? `Already picked: ${excludedNames.map(esc).join(', ')}.` : ''}</p>
      <div class="stage-actions">
        <button class="btn-primary" id="drawBtn" ${locked ? 'disabled' : ''}>${locked ? 'In the hat' : 'Throw in the hat'}</button>
      </div>
      ${lockLine(locked, view.remaining)}`;
  },

  renderReveal(view) {
    const res = view.result;
    const name = res.winner ? (view.names[res.winner] || 'a departed player') : 'nobody';
    return `
      ${kicker(view, 'the draw')}
      <div class="verdict"><em>${esc(name)}</em> — you're up.</div>
      ${res.exhausted ? `<div class="lock-note">Everyone had a turn — the exclusion list reset.</div>` : ''}
      ${view.isFacilitator ? `
        <div class="stage-actions">
          <button class="btn-primary" id="againExcludeBtn">Pick again (skip ${esc(name)})</button>
          <button class="btn-ghost" id="lobbyBtn">Change game</button>
        </div>`
        : facilitatorActions(view, 'Pick again')}`;
  },

  bind(view, client, ui, rerender) {
    const draw = document.getElementById('drawBtn');
    if (draw) draw.addEventListener('click', () => { client.lock(randomToken()); rerender(); });
    const again = document.getElementById('againExcludeBtn');
    if (again) again.addEventListener('click', () => {
      const res = view.result;
      const prev = res.exhausted ? [] : (view.config.excluded || []);
      const excluded = res.winner ? [...new Set([...prev, res.winner])] : prev;
      client.selectGame('turn', { excluded });
    });
  },
};

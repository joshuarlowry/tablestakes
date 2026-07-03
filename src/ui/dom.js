/** Shared DOM helpers for the hand-rolled template-string UI. */
export const $ = id => document.getElementById(id);

export const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function lockLine(locked, remaining) {
  if (!locked) return `<div class="lock-note">Your pick locks in immediately — choose with intent.</div>`;
  return `<div class="lock-note"><strong>Locked in.</strong> Waiting on ${remaining} player${remaining === 1 ? '' : 's'}…</div>`;
}

export function facilitatorActions(view, againLabel) {
  if (!view.isFacilitator) {
    return `<div class="lock-note">Waiting on ${esc(view.names[view.facilitator] || 'the facilitator')} for the next round…</div>`;
  }
  return `
    <div class="stage-actions">
      <button class="btn-primary" id="againBtn">${esc(againLabel)}</button>
      <button class="btn-ghost" id="lobbyBtn">Change game</button>
    </div>`;
}

export function kicker(view, suffix) {
  return `<div class="stage-kicker">Round ${view.round} — ${esc(suffix)}</div>`;
}

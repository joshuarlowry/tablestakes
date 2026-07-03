import { esc, lockLine, facilitatorActions, kicker } from '../dom.js';
import { RPS } from '../../game/rules.js';

export default {
  renderPick(view, ui) {
    const locked = view.iAmCommitted;
    return `
      ${kicker(view, 'Rock Paper Scissors')}
      <div class="stage-title">Make your <em>throw</em></div>
      <div class="choices">
        ${Object.entries(RPS).map(([k, v]) => `
          <button class="choice ${ui.choice === k ? 'selected' : ''}" data-pick="${k}" ${locked ? 'disabled' : ''}>
            <span class="glyph">${v.glyph}</span>
            <span class="lbl">${k}</span>
          </button>`).join('')}
      </div>
      ${lockLine(locked, view.remaining)}`;
  },

  renderReveal(view) {
    const picks = view.revealPicks || {};
    const ids = Object.keys(picks);
    const res = view.result;
    const winners = new Set(res.winners);
    let verdict;
    if (res.outcome === 'draw') verdict = ids.length === 2 ? `A <em>draw.</em> Run it back.` : `Everyone threw the same. A <em>draw.</em>`;
    else if (res.outcome === 'stalemate') verdict = `All three throws on the table — <em>stalemate.</em>`;
    else if (res.outcome === 'incomplete') verdict = `Not enough throws to call it.`;
    else if (ids.length === 2) {
      const w = res.winners[0];
      const l = ids.find(i => i !== w);
      verdict = `<em>${esc(view.names[w] || 'Someone')}</em> takes it — ${esc(picks[w])} beats ${esc(picks[l])}.`;
    } else {
      const t = res.winningThrow;
      verdict = `<em>${esc(t[0].toUpperCase() + t.slice(1))}</em> wins the round.`;
    }
    return `
      ${kicker(view, 'the reveal')}
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
  },

  bind(view, client, ui, rerender) {
    document.querySelectorAll('[data-pick]').forEach(b =>
      b.addEventListener('click', () => {
        ui.choice = b.dataset.pick;
        client.lock(ui.choice);
        rerender();
      }));
  },
};

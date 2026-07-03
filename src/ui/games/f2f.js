import { esc, lockLine, facilitatorActions, kicker } from '../dom.js';

export default {
  renderPick(view, ui) {
    const locked = view.iAmCommitted;
    return `
      ${kicker(view, 'Fist to Five')}
      <div class="stage-title">How do you <em>really</em> feel?</div>
      <div class="choices">
        ${[0, 1, 2, 3, 4, 5].map(n => `
          <button class="choice ${ui.choice === n ? 'selected' : ''}" data-pick="${n}" ${locked ? 'disabled' : ''}>
            <span class="num">${n}</span>
            <span class="lbl">${n === 0 ? 'fist' : n === 5 ? 'all in' : '&nbsp;'}</span>
          </button>`).join('')}
      </div>
      ${lockLine(locked, view.remaining)}`;
  },

  renderReveal(view) {
    const picks = view.revealPicks || {};
    const ids = Object.keys(picks);
    const res = view.result;
    let verdict;
    if (res.hardNo) verdict = `A fist on the table — <em>someone is blocking.</em> Talk it out.`;
    else if (res.consensus && res.avg >= 4) verdict = `<span class="consensus">Strong consensus.</span> Ship it.`;
    else if (res.consensus) verdict = `<span class="consensus">Aligned</span> — the room agrees.`;
    else verdict = `The room is <em>split.</em> Hear from the ${res.min}s and the ${res.max}s.`;
    const sorted = [...ids].sort((a, b) => Number(picks[a]) - Number(picks[b]));
    return `
      ${kicker(view, 'the reveal')}
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
  },

  bind(view, client, ui, rerender) {
    document.querySelectorAll('[data-pick]').forEach(b =>
      b.addEventListener('click', () => {
        ui.choice = Number(b.dataset.pick);
        client.lock(ui.choice);
        rerender();
      }));
  },
};

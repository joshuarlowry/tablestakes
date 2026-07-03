import { esc, lockLine, facilitatorActions, kicker } from '../dom.js';
import points from '../../games/points.js';

const DISPLAY = { '?': '?', coffee: '☕' };

export default {
  renderPick(view, ui) {
    const locked = view.iAmCommitted;
    const all = [...points.scale, ...points.special];
    return `
      ${kicker(view, 'Story Pointing')}
      <div class="stage-title">Size it <em>blind</em></div>
      <div class="choices">
        ${all.map(v => `
          <button class="choice ${ui.choice === v ? 'selected' : ''}" data-pick="${esc(String(v))}" ${locked ? 'disabled' : ''}>
            <span class="num">${DISPLAY[v] ?? v}</span>
            <span class="lbl">${v === '?' ? 'unsure' : v === 'coffee' ? 'break' : '&nbsp;'}</span>
          </button>`).join('')}
      </div>
      ${lockLine(locked, view.remaining)}`;
  },

  renderReveal(view) {
    const picks = view.revealPicks || {};
    const res = view.result;
    const ids = Object.keys(picks).sort((a, b) => {
      const na = typeof picks[a] === 'number' ? picks[a] : Infinity;
      const nb = typeof picks[b] === 'number' ? picks[b] : Infinity;
      return na - nb;
    });
    const outliers = new Set(res.outliers);
    let verdict;
    if (res.numericCount === 0) verdict = `No estimates on the table — <em>coffee first?</em>`;
    else if (res.consensus) verdict = `<span class="consensus">Converged.</span> Call it a ${Math.round(res.avg)}.`;
    else verdict = `The room is <em>split</em> — hear from the ${res.min}s and the ${res.max}s.`;
    return `
      ${kicker(view, 'the reveal')}
      <div class="verdict">${verdict}</div>
      ${res.numericCount ? `
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${res.avg.toFixed(1)}</div><div class="s-lbl">average</div></div>
        <div class="stat"><div class="s-val">${res.min}–${res.max}</div><div class="s-lbl">range</div></div>
      </div>` : ''}
      <div class="results">
        ${ids.map((id, i) => `
          <div class="result-row ${outliers.has(id) ? 'winner' : ''}" style="animation-delay:${i * 90}ms">
            <span class="r-num">${DISPLAY[picks[id]] ?? esc(picks[id])}</span>
            <span class="r-name">${esc(view.names[id] || 'departed player')}</span>
            <span class="r-choice">${outliers.has(id) ? 'outlier · speak up' : res.abstained.includes(id) ? 'abstained' : ''}</span>
          </div>`).join('')}
      </div>
      ${facilitatorActions(view, 'Point again')}`;
  },

  bind(view, client, ui, rerender) {
    document.querySelectorAll('[data-pick]').forEach(b =>
      b.addEventListener('click', () => {
        const raw = b.dataset.pick;
        const v = raw === '?' || raw === 'coffee' ? raw : Number(raw);
        ui.choice = v;
        client.lock(v);
        rerender();
      }));
  },
};

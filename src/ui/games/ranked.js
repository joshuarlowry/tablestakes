import { esc, lockLine, facilitatorActions, kicker } from '../dom.js';

export default {
  configForm(draft) {
    return `
      <div class="field">
        <label for="cfgOptions">Options — one per line (2–10)</label>
        <textarea id="cfgOptions" rows="4" placeholder="Option A&#10;Option B&#10;Option C">${esc(draft.optionsText || '')}</textarea>
      </div>`;
  },
  readConfig() {
    const text = document.getElementById('cfgOptions')?.value || '';
    // Keep the raw text alongside the parsed list so this round-trips through
    // configForm(draft) unchanged if a re-render happens mid-edit.
    return { optionsText: text, options: text.split('\n').map(s => s.trim()).filter(Boolean) };
  },
  configValid: cfg => cfg.options.length >= 2,

  renderPick(view, ui) {
    const locked = view.iAmCommitted;
    const rank = ui.rank || [];
    const options = view.config.options;
    const complete = rank.length === options.length;
    return `
      ${kicker(view, 'Ranked Choice')}
      <div class="stage-title">Rank them <em>all</em></div>
      <p class="stage-sub">Tap in order of preference — first tap is your top pick.</p>
      <div class="choices">
        ${options.map((opt, i) => {
          const pos = rank.indexOf(i);
          return `
            <button class="choice ${pos >= 0 ? 'selected' : ''}" data-rank="${i}" ${locked || pos >= 0 ? 'disabled' : ''}>
              <span class="num">${pos >= 0 ? pos + 1 : '·'}</span>
              <span class="lbl">${esc(opt)}</span>
            </button>`;
        }).join('')}
      </div>
      ${locked ? '' : `
      <div class="stage-actions">
        <button class="btn-primary" id="lockRankBtn" ${complete ? '' : 'disabled'}>Lock ranking</button>
        <button class="btn-ghost" id="resetRankBtn" ${rank.length ? '' : 'disabled'}>Reset</button>
      </div>`}
      ${lockLine(locked, view.remaining)}`;
  },

  renderReveal(view) {
    const res = view.result;
    let verdict;
    if (res.winner) verdict = `<em>${esc(res.winner)}</em> takes it.`;
    else if (res.tie.length) verdict = `A tie between <em>${res.tie.map(esc).join('</em> and <em>')}</em>.`;
    else verdict = `No clear result.`;
    return `
      ${kicker(view, 'the reveal')}
      <div class="verdict">${verdict}</div>
      <div class="results">
        ${res.scores.map((s, i) => `
          <div class="result-row ${s.option === res.winner ? 'winner' : ''}" style="animation-delay:${i * 90}ms">
            <span class="r-num">${i + 1}</span>
            <span class="r-name">${esc(s.option)}</span>
            <span class="r-choice">${s.points} pts · ${s.firsts} first${s.firsts === 1 ? '' : 's'}</span>
          </div>`).join('')}
      </div>
      <div class="lock-note">Borda count across ${res.voterCount} ballot${res.voterCount === 1 ? '' : 's'}.</div>
      ${facilitatorActions(view, 'Vote again')}`;
  },

  bind(view, client, ui, rerender) {
    document.querySelectorAll('[data-rank]').forEach(b =>
      b.addEventListener('click', () => {
        ui.rank = [...(ui.rank || []), Number(b.dataset.rank)];
        rerender();
      }));
    const reset = document.getElementById('resetRankBtn');
    if (reset) reset.addEventListener('click', () => { ui.rank = []; rerender(); });
    const lock = document.getElementById('lockRankBtn');
    if (lock) lock.addEventListener('click', () => {
      if ((ui.rank || []).length === view.config.options.length) {
        client.lock(ui.rank);
        rerender();
      }
    });
  },
};

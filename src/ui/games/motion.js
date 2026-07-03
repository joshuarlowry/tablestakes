import { esc, lockLine, facilitatorActions, kicker } from '../dom.js';

const GLYPH = { yes: '👍', no: '👎', abstain: '🤷' };

export default {
  configForm(draft) {
    return `
      <div class="field">
        <label for="cfgQuestion">The question</label>
        <input type="text" id="cfgQuestion" maxlength="200" placeholder="e.g. Ship it on Friday?" value="${esc(draft.question || '')}" autocomplete="off">
      </div>`;
  },
  readConfig() {
    return { question: document.getElementById('cfgQuestion')?.value || '' };
  },
  configValid: cfg => cfg.question.trim().length > 0,

  renderPick(view, ui) {
    const locked = view.iAmCommitted;
    return `
      ${kicker(view, 'Motion Vote')}
      <div class="stage-title">${esc(view.config.question || 'The motion')}</div>
      <div class="choices">
        ${['yes', 'no', 'abstain'].map(k => `
          <button class="choice ${ui.choice === k ? 'selected' : ''}" data-pick="${k}" ${locked ? 'disabled' : ''}>
            <span class="glyph">${GLYPH[k]}</span>
            <span class="lbl">${k}</span>
          </button>`).join('')}
      </div>
      ${lockLine(locked, view.remaining)}`;
  },

  renderReveal(view) {
    const picks = view.revealPicks || {};
    const res = view.result;
    const ids = Object.keys(picks).sort();
    let verdict;
    if (res.tied) verdict = `Dead <em>even.</em> Keep talking.`;
    else if (res.passed) verdict = `<span class="consensus">Carried${res.unanimous ? ', unanimously' : ''}.</span> ${res.yes}–${res.no}.`;
    else verdict = `<em>Does not carry.</em> ${res.yes}–${res.no}.`;
    return `
      ${kicker(view, 'the reveal')}
      <p class="stage-sub">${esc(view.config.question || '')}</p>
      <div class="verdict">${verdict}</div>
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${res.yes}</div><div class="s-lbl">yes</div></div>
        <div class="stat"><div class="s-val">${res.no}</div><div class="s-lbl">no</div></div>
        <div class="stat"><div class="s-val">${res.abstain}</div><div class="s-lbl">abstain</div></div>
      </div>
      <div class="results">
        ${ids.map((id, i) => `
          <div class="result-row" style="animation-delay:${i * 90}ms">
            <span class="r-glyph">${GLYPH[picks[id]]}</span>
            <span class="r-name">${esc(view.names[id] || 'departed player')}</span>
            <span class="r-choice">${esc(picks[id])}</span>
          </div>`).join('')}
      </div>
      ${facilitatorActions(view, 'New motion')}`;
  },

  // "New motion" should reopen config, not silently reuse the old question.
  againOpensConfig: true,

  bind(view, client, ui, rerender) {
    document.querySelectorAll('[data-pick]').forEach(b =>
      b.addEventListener('click', () => {
        ui.choice = b.dataset.pick;
        client.lock(ui.choice);
        rerender();
      }));
  },
};

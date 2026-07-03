import { esc, lockLine, facilitatorActions, kicker } from '../dom.js';

const LIGHT = { r: '🔴', y: '🟡', g: '🟢' };

export default {
  renderPick(view, ui) {
    const locked = view.iAmCommitted;
    const ratings = ui.ratings || {};
    const cats = view.config.categories;
    const complete = cats.every((_, i) => ratings[i]);
    return `
      ${kicker(view, 'Health Check')}
      <div class="stage-title">How's the <em>team?</em></div>
      <div class="health-rate">
        ${cats.map((cat, i) => `
          <div class="health-row">
            <span class="hc-name">${esc(cat)}</span>
            <span class="hc-lights">
              ${['r', 'y', 'g'].map(l => `
                <button class="hc-light ${ratings[i] === l ? 'selected' : ''}" data-cat="${i}" data-light="${l}" ${locked ? 'disabled' : ''}>${LIGHT[l]}</button>`).join('')}
            </span>
          </div>`).join('')}
      </div>
      ${locked ? '' : `
      <div class="stage-actions">
        <button class="btn-primary" id="lockHealthBtn" ${complete ? '' : 'disabled'}>Lock ratings</button>
      </div>`}
      ${lockLine(locked, view.remaining)}`;
  },

  renderReveal(view) {
    const res = view.result;
    const verdict = res.overall === 'g'
      ? `<span class="consensus">Healthy.</span> Keep going.`
      : res.overall === 'y'
        ? `Some <em>yellow flags</em> — worth a conversation.`
        : `<em>Red flags on the table.</em> Make time for this.`;
    return `
      ${kicker(view, 'the reveal')}
      <div class="verdict">${verdict}</div>
      <div class="results">
        ${res.categories.map((c, i) => `
          <div class="result-row" style="animation-delay:${i * 90}ms">
            <span class="r-glyph">${LIGHT[c.light]}</span>
            <span class="r-name">${esc(c.name)}</span>
            <span class="r-choice">${c.g}🟢 ${c.y}🟡 ${c.r}🔴</span>
          </div>`).join('')}
      </div>
      <div class="lock-note">${res.raterCount} rating${res.raterCount === 1 ? '' : 's'} · lights are the majority, ties darken.</div>
      ${facilitatorActions(view, 'Check again')}`;
  },

  bind(view, client, ui, rerender) {
    document.querySelectorAll('[data-cat]').forEach(b =>
      b.addEventListener('click', () => {
        ui.ratings = { ...(ui.ratings || {}), [b.dataset.cat]: b.dataset.light };
        rerender();
      }));
    const lock = document.getElementById('lockHealthBtn');
    if (lock) lock.addEventListener('click', () => {
      const cats = view.config.categories;
      const ratings = ui.ratings || {};
      if (cats.every((_, i) => ratings[i])) {
        client.lock(Object.fromEntries(cats.map((_, i) => [i, ratings[i]])));
        rerender();
      }
    });
  },
};

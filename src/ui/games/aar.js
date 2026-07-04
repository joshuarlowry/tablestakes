import { esc } from '../dom.js';
import { timelineToMarkdown } from '../../game/exportMd.js';
import { downloadText, copyText } from '../export.js';
import { orderBetween as orderMidpoint } from '../../game/order.js';

/**
 * After-Action Review board UI. Always live (no blind reveal step). The
 * Timeline column is special: each card carries an editable time, and the add
 * form takes a time alongside the text. Reordering (move buttons) and retiming
 * are open to everyone; edit/delete stay author-only (delete shown via `mine`).
 */
export default {
  renderBoard(view) {
    return `
      <div class="stage-kicker">After-Action Review</div>
      <div class="stage-title">The <em>debrief</em></div>
      <p class="stage-sub">Capture what happened together. The Timeline sorts itself by clock time.</p>
      <div class="board board-aar">
        ${view.board.columns.map(col => this.renderColumn(view, col)).join('')}
      </div>
      <div class="stage-actions">
        ${view.isFacilitator ? `<button class="btn-ghost" id="lobbyBtn">Change game</button>` : ''}
        <button class="btn-ghost" id="exportMdBtn">Copy markdown</button>
        <button class="btn-ghost" id="downloadMdBtn">Download .md</button>
      </div>`;
  },

  renderColumn(view, col) {
    const isTl = !!col.timeline;
    return `
      <div class="board-col ${isTl ? 'board-col-timeline' : ''}">
        <div class="board-col-title">${esc(col.title)}</div>
        <div class="board-cards" data-col="${esc(col.key)}">
          ${col.cards.map((c, i) => `
            <div class="board-card" data-card="${esc(c.cardId)}">
              ${isTl ? `<input class="bc-time" type="text" maxlength="20" placeholder="hh:mm"
                          value="${esc(c.time || '')}" data-card="${esc(c.cardId)}" aria-label="Time">` : ''}
              <div class="bc-text">${esc(c.text)}</div>
              <div class="bc-meta">
                <span class="bc-author">${esc(view.names[c.author] || 'departed')}</span>
                <span class="bc-actions">
                  ${i > 0 ? `<button class="bc-btn" data-act="up" data-card="${esc(c.cardId)}">↑</button>` : ''}
                  ${i < col.cards.length - 1 ? `<button class="bc-btn" data-act="down" data-card="${esc(c.cardId)}">↓</button>` : ''}
                  <button class="bc-btn" data-act="left" data-card="${esc(c.cardId)}">←</button>
                  <button class="bc-btn" data-act="right" data-card="${esc(c.cardId)}">→</button>
                  ${c.mine ? `<button class="bc-btn" data-act="delete" data-card="${esc(c.cardId)}">✕</button>` : ''}
                </span>
              </div>
            </div>`).join('')}
          <form class="bc-add" data-col="${esc(col.key)}">
            ${isTl ? `<input class="bc-add-time" type="text" maxlength="20" placeholder="hh:mm" autocomplete="off">` : ''}
            <input class="bc-add-text" type="text" maxlength="280" placeholder="Add a card…" autocomplete="off">
          </form>
        </div>
      </div>`;
  },

  bindBoard(view, client) {
    const cols = view.board.columns.map(c => c.key);

    document.querySelectorAll('.board-cards').forEach(el => {
      const col = el.dataset.col;
      el.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
        const cardId = btn.dataset.card;
        const act = btn.dataset.act;
        const colCards = view.board.columns.find(c => c.key === col).cards;
        const idx = colCards.findIndex(c => c.cardId === cardId);
        if (act === 'delete') { client.deleteCard(cardId); return; }
        if (act === 'up' && idx > 0) {
          const before = idx >= 2 ? colCards[idx - 2].order : '';
          client.moveCard(cardId, col, orderMidpoint(before, colCards[idx - 1].order));
        } else if (act === 'down' && idx < colCards.length - 1) {
          const after = idx + 2 < colCards.length ? colCards[idx + 2].order : '';
          client.moveCard(cardId, col, orderMidpoint(colCards[idx + 1].order, after));
        } else if (act === 'left' || act === 'right') {
          const nextCol = cols[(cols.indexOf(col) + (act === 'right' ? 1 : cols.length - 1)) % cols.length];
          const destCards = view.board.columns.find(c => c.key === nextCol).cards;
          const lastOrder = destCards.length ? destCards[destCards.length - 1].order : '';
          client.moveCard(cardId, nextCol, orderMidpoint(lastOrder, ''));
        }
      }));
    });

    // Retime timeline cards (open to everyone) — commit on change/blur.
    document.querySelectorAll('.bc-time').forEach(input =>
      input.addEventListener('change', () => client.retimeCard(input.dataset.card, input.value.trim())));

    document.querySelectorAll('.bc-add').forEach(form =>
      form.addEventListener('submit', e => {
        e.preventDefault();
        const textInput = form.querySelector('.bc-add-text');
        const timeInput = form.querySelector('.bc-add-time');
        const text = textInput.value.trim();
        if (!text) return;
        const extra = timeInput && timeInput.value.trim() ? { time: timeInput.value.trim() } : {};
        client.addCard(form.dataset.col, text, extra);
        textInput.value = '';
        if (timeInput) timeInput.value = '';
      }));

    const lobby = document.getElementById('lobbyBtn');
    if (lobby) lobby.addEventListener('click', () => client.backToLobby());
    const exportBtn = document.getElementById('exportMdBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => copyText(timelineToMarkdown(view)));
    const downloadBtn = document.getElementById('downloadMdBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', () =>
      downloadText(timelineToMarkdown(view), 'aar.md'));
  },
};

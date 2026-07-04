import { esc } from '../dom.js';
import { TEMPLATES } from '../../games/retro.js';
import { boardToMarkdown } from '../../game/exportMd.js';
import { downloadText, copyText } from '../export.js';
import { orderBetween as orderMidpoint } from '../../game/order.js';

export default {
  configForm(draft) {
    const template = draft.template || 'wwda';
    const privacy = draft.privacy || 'blind';
    return `
      <div class="field">
        <label>Template</label>
        <div class="choice-row">
          ${Object.entries(TEMPLATES).map(([key, t]) => `
            <label class="check-row">
              <input type="radio" name="cfgTemplate" value="${key}" ${template === key ? 'checked' : ''}>
              <span>${esc(t.label)}</span>
            </label>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Card privacy</label>
        <div class="choice-row">
          <label class="check-row">
            <input type="radio" name="cfgPrivacy" value="blind" ${privacy === 'blind' ? 'checked' : ''}>
            <span>Blind — hidden until you reveal</span>
          </label>
          <label class="check-row">
            <input type="radio" name="cfgPrivacy" value="live" ${privacy === 'live' ? 'checked' : ''}>
            <span>Live — visible as written</span>
          </label>
        </div>
      </div>`;
  },
  readConfig() {
    const template = document.querySelector('input[name="cfgTemplate"]:checked')?.value || 'wwda';
    const privacy = document.querySelector('input[name="cfgPrivacy"]:checked')?.value || 'blind';
    return { template, privacy };
  },
  configValid: () => true,

  renderBoard(view) {
    const blindPending = view.board.privacy === 'blind' && !view.board.cardsRevealed;
    return `
      <div class="stage-kicker">Retrospective</div>
      <div class="stage-title">${blindPending ? 'Write it <em>down</em>' : 'The <em>board</em>'}</div>
      ${blindPending ? '<p class="stage-sub">Your cards are private until the facilitator reveals the board.</p>' : ''}
      <div class="board">
        ${view.board.columns.map(col => `
          <div class="board-col">
            <div class="board-col-title">${esc(col.title)}</div>
            <div class="board-cards" data-col="${esc(col.key)}">
              ${col.cards.map((c, i) => `
                <div class="board-card ${c.pending ? 'pending' : ''}" data-card="${esc(c.cardId)}">
                  <div class="bc-text">${esc(c.text)}</div>
                  <div class="bc-meta">
                    <span class="bc-author">${esc(view.names[c.author] || (c.pending ? 'you' : 'departed'))}${c.pending ? ' · private' : ''}</span>
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
                <input type="text" maxlength="280" placeholder="Add a card…" autocomplete="off">
              </form>
            </div>
          </div>`).join('')}
      </div>
      <div class="stage-actions">
        ${view.isFacilitator && blindPending ? `<button class="btn-primary" id="revealCardsBtn">Reveal cards</button>` : ''}
        ${view.isFacilitator ? `<button class="btn-ghost" id="lobbyBtn">Change game</button>` : ''}
        <button class="btn-ghost" id="exportMdBtn">Copy markdown</button>
        <button class="btn-ghost" id="downloadMdBtn">Download .md</button>
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
    document.querySelectorAll('.bc-add').forEach(form =>
      form.addEventListener('submit', e => {
        e.preventDefault();
        const input = form.querySelector('input');
        const text = input.value.trim();
        if (text) client.addCard(form.dataset.col, text);
        input.value = '';
      }));
    const reveal = document.getElementById('revealCardsBtn');
    if (reveal) reveal.addEventListener('click', () => client.revealCards());
    const lobby = document.getElementById('lobbyBtn');
    if (lobby) lobby.addEventListener('click', () => client.backToLobby());
    const exportBtn = document.getElementById('exportMdBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => copyText(boardToMarkdown(view)));
    const downloadBtn = document.getElementById('downloadMdBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', () =>
      downloadText(boardToMarkdown(view), 'retro.md'));
  },
};

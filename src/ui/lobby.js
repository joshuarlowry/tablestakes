import { esc } from './dom.js';
import { gameList, getGame } from '../game/registry.js';
import { uiFor } from './registry.js';

export function renderLobby(view, ui) {
  if (!view.isFacilitator) {
    return `
      <div class="stage-kicker">Round table</div>
      <div class="stage-title">Waiting on the <em>facilitator</em></div>
      <p class="waiting-host">${esc(view.names[view.facilitator] || 'The facilitator')} is choosing a game…</p>`;
  }

  // Config step for games that need facilitator input before the round starts.
  if (ui.configGame) {
    const game = getGame(ui.configGame);
    const gameUi = uiFor(ui.configGame);
    return `
      <div class="stage-kicker">Set up</div>
      <div class="stage-title">${esc(game.label)}</div>
      <p class="stage-sub">${esc(game.description)}</p>
      ${gameUi.configForm(ui.configDraft || {})}
      <div class="stage-actions">
        <button class="btn-primary" id="startConfiguredBtn">Start round</button>
        <button class="btn-ghost" id="cancelConfigBtn">Back</button>
      </div>
      <div class="transport-error" id="configError"></div>`;
  }

  return `
    <div class="stage-kicker">Round table</div>
    <div class="stage-title">Pick a <em>game</em></div>
    <p class="stage-sub">You're facilitating. Everyone locks in blind — nothing is shown until all hands are in.</p>
    <div class="game-cards">
      ${gameList.map(g => `
        <button class="game-card" data-game="${esc(g.id)}">
          <div class="gc-glyphs">${g.glyphs}</div>
          <div class="gc-name">${esc(g.label)}</div>
          <div class="gc-desc">${esc(g.description)}</div>
        </button>`).join('')}
    </div>`;
}

export function bindLobby(view, client, ui, rerender) {
  document.querySelectorAll('[data-game]').forEach(b =>
    b.addEventListener('click', () => {
      const id = b.dataset.game;
      const game = getGame(id);
      if (!game) return;
      if (game.needsConfig) {
        ui.configGame = id;
        ui.configDraft = {};
        rerender();
      } else {
        client.selectGame(id, game.defaultConfig(view));
      }
    }));

  const start = document.getElementById('startConfiguredBtn');
  if (start) start.addEventListener('click', () => {
    const id = ui.configGame;
    const game = getGame(id);
    const gameUi = uiFor(id);
    const cfg = game.normalizeConfig(gameUi.readConfig());
    if (!gameUi.configValid(cfg)) {
      const err = document.getElementById('configError');
      if (err) err.textContent = 'That setup isn’t complete yet.';
      return;
    }
    ui.configGame = null;
    ui.configDraft = null;
    client.selectGame(id, cfg);
  });

  const cancel = document.getElementById('cancelConfigBtn');
  if (cancel) cancel.addEventListener('click', () => {
    ui.configGame = null;
    ui.configDraft = null;
    rerender();
  });
}

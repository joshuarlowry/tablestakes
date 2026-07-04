/**
 * Game registry — logic only, no DOM (headlessly testable; UI counterparts
 * live in src/ui/games/). Each entry:
 *   id, label, description, glyphs   — lobby display
 *   blind                            — uses commit-reveal picks (turn picker does too,
 *                                      for rig-proof shared randomness)
 *   needsConfig                      — facilitator fills a form before the round starts
 *   defaultConfig(view)              — initial config (may derive from view, e.g. exclusions)
 *   normalizeConfig(raw)             — clamp/validate; MUST never throw (configs arrive
 *                                      from the network; the pure reducer can't blow up)
 *   validatePick(pick, config)       — reject malformed picks before result computation
 *   result(picks, config, ctx)       — pure verdict; ctx = {round, participants}
 *   minPlayers
 *   exportMarkdown(view)             — optional per-round markdown export
 */
import rps from '../games/rps.js';
import f2f from '../games/f2f.js';
import points from '../games/points.js';
import motion from '../games/motion.js';
import ranked from '../games/ranked.js';
import health from '../games/health.js';
import turn from '../games/turn.js';
import retro from '../games/retro.js';

const entries = [points, f2f, motion, ranked, health, turn, retro, rps];

export const registry = Object.fromEntries(entries.map(g => [g.id, g]));
export const gameList = entries;
export const getGame = id => registry[id] || null;

export function registerGame(game) {
  registry[game.id] = game;
  gameList.push(game);
}

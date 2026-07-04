import rps from './games/rps.js';
import f2f from './games/f2f.js';
import points from './games/points.js';
import motion from './games/motion.js';
import ranked from './games/ranked.js';
import health from './games/health.js';
import turn from './games/turn.js';
import retro from './games/retro.js';
import aar from './games/aar.js';

export const uiRegistry = { rps, f2f, points, motion, ranked, health, turn, retro, aar };
export const uiFor = id => uiRegistry[id] || null;

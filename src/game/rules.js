/**
 * Pure game-result logic. No DOM, no network, no time.
 *
 * Each client computes the identical verdict from the same set of revealed
 * picks — this is what makes a facilitator/tallier unnecessary. main.js renders
 * HTML from these structured results.
 */

export const RPS = {
  rock: { glyph: '✊', beats: 'scissors' },
  paper: { glyph: '✋', beats: 'rock' },
  scissors: { glyph: '✌️', beats: 'paper' },
};

/**
 * @param {Record<string,'rock'|'paper'|'scissors'>} picks  peerId -> throw
 * @returns {{outcome:string, winners:string[], winningThrow:string|null}}
 */
export function rpsResult(picks) {
  const ids = Object.keys(picks);
  const winners = new Set();
  const thrown = new Set(ids.map(id => picks[id]));

  if (ids.length < 2) {
    return { outcome: 'incomplete', winners: [], winningThrow: null };
  }

  if (ids.length === 2) {
    const [a, b] = ids;
    if (picks[a] === picks[b]) {
      return { outcome: 'draw', winners: [], winningThrow: null };
    }
    const w = RPS[picks[a]].beats === picks[b] ? a : b;
    winners.add(w);
    return { outcome: 'win', winners: [...winners], winningThrow: picks[w] };
  }

  if (thrown.size === 2) {
    const [t1, t2] = [...thrown];
    const winning = RPS[t1].beats === t2 ? t1 : t2;
    ids.forEach(id => { if (picks[id] === winning) winners.add(id); });
    return { outcome: 'win', winners: [...winners], winningThrow: winning };
  }
  if (thrown.size === 1) {
    return { outcome: 'draw', winners: [], winningThrow: null };
  }
  return { outcome: 'stalemate', winners: [], winningThrow: null };
}

/**
 * @param {Record<string,number>} picks  peerId -> 0..5
 * @returns {{avg:number, spread:number, consensus:boolean, hardNo:boolean, min:number, max:number}}
 */
export function f2fResult(picks) {
  const vals = Object.values(picks).map(Number);
  if (!vals.length) {
    return { avg: 0, spread: 0, consensus: true, hardNo: false, min: 0, max: 0 };
  }
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const spread = max - min;
  return {
    avg,
    spread,
    consensus: spread <= 1,
    hardNo: vals.some(v => v === 0),
    min,
    max,
  };
}

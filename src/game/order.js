/**
 * Fractional-index ordering for drag-free reordering: every card gets a
 * base-36 string key; moving a card just needs a key strictly between its two
 * new neighbors, so reordering never touches any other card's key.
 *
 * `orderBetween(a, b)` returns a key with a < key < b (treating '' as -infinity
 * when passed as `a`, and +infinity when passed as `b`). Ties in the final
 * comparator (equal keys, which this never produces on its own but a hostile
 * peer could replicate) are broken by cardId — see games/retro.js.
 */
const BASE = 36;
const MAX_DIGIT = BASE - 1; // 'z'

function digit(s, i) {
  return i < s.length ? parseInt(s[i], BASE) : 0;
}

export function orderBetween(a = '', b = '') {
  let result = '';
  let i = 0;
  // Cap depth so a pathological run of same-position inserts can't loop
  // forever; degrades to "close enough" rather than hanging.
  while (i < 200) {
    const da = digit(a, i);
    const db = i < b.length ? digit(b, i) : MAX_DIGIT + 1; // unbounded above when b is ''
    if (db - da > 1) {
      const mid = da + Math.floor((db - da) / 2);
      return result + mid.toString(BASE);
    }
    // Digits adjacent (or equal): carry this digit forward and go deeper.
    result += da.toString(BASE);
    i += 1;
  }
  return result + '1';
}

/** First key with no lower bound (prepend). */
export const FIRST_KEY = () => orderBetween('', '');

/**
 * A short, stable base-36 suffix derived from an actor id. In blind mode every
 * client drafts cards locally starting from '', so each client's Nth card in a
 * column independently gets the SAME fractional key ('i','r',…). On reveal those
 * keys collide, and orderBetween(K, K) can't produce a value strictly between
 * two equal keys — so "move past a same-keyed neighbor" silently no-ops. Tagging
 * every freshly-created key with the author's suffix keeps them distinct so
 * reordering always has room. Deterministic (no RNG) → convergence is preserved.
 */
function actorSuffix(actorId = '') {
  let h = 0;
  for (let i = 0; i < actorId.length; i++) h = (h * 31 + actorId.charCodeAt(i)) & 0xffff;
  return (h % 1296).toString(BASE).padStart(2, '0');
}

/** Fractional key for a newly-created item after `prevOrder`, tagged per-actor. */
export function orderForNew(prevOrder = '', actorId = '') {
  return orderBetween(prevOrder, '') + actorSuffix(actorId);
}

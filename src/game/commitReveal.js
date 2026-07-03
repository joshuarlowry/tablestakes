/**
 * Commit-reveal so picks stay blind until everyone has locked in — without a
 * trusted tallier. On lock a peer broadcasts commit = hash(pick|nonce); only
 * after all commits are visible does it broadcast (pick, nonce). Everyone
 * verifies hash === hash(pick|nonce) and computes the result locally.
 *
 * The hasher is injected (Web Crypto in the browser, same in Node 20+) so this
 * module is pure and testable.
 */

/** Default hasher: SHA-256 hex via Web Crypto (available in browsers and Node 20+). */
export async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const encode = (pick, nonce) => `${String(pick)}|${nonce}`;

/**
 * @param {string|number} pick
 * @param {string} nonce  high-entropy random string
 * @param {(s:string)=>Promise<string>} [hasher]
 * @returns {Promise<string>} commitment hash
 */
export function commit(pick, nonce, hasher = sha256Hex) {
  return hasher(encode(pick, nonce));
}

/**
 * @returns {Promise<boolean>} true iff (pick, nonce) matches the commitment.
 */
export async function verify(pick, nonce, hash, hasher = sha256Hex) {
  if (typeof nonce !== 'string' || !nonce) return false;
  return (await hasher(encode(pick, nonce))) === hash;
}

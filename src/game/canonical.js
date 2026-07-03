/**
 * Deterministic JSON serialization for commit-reveal hashing of structured
 * picks (arrays for rankings, objects for health checks). Object keys are
 * sorted recursively so two peers hashing the same logical value always get
 * the same string. Values that can't round-trip deterministically are
 * rejected loudly rather than silently coerced.
 */
export function canonicalize(value) {
  if (value === undefined) throw new Error('cannot canonicalize undefined');
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    throw new Error(`cannot canonicalize ${typeof value}`);
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('cannot canonicalize non-finite number');
  }
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map(k => `${JSON.stringify(k)}:${canonicalize(value[k])}`);
  return `{${parts.join(',')}}`;
}

/**
 * Inline Levenshtein for did-you-mean suggestions on unknown ID references.
 * Kept small and dependency-free; we don't need the speed of `fastest-levenshtein`
 * for the ~tens-to-hundreds-of-IDs scale the lint operates at.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  // Two-row rolling DP — O(min(m,n)) memory.
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/**
 * Return the closest match from `candidates` for `query`, or `undefined` if no
 * candidate is within an acceptable distance. The distance threshold scales
 * with input length so very short ids don't get spurious matches.
 */
export function nearestMatch(query: string, candidates: Iterable<string>): string | undefined {
  const cutoff = Math.max(1, Math.min(3, Math.floor(query.length / 3)));
  let best: string | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
    if (c === query) continue;
    const d = levenshtein(query, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  if (best !== undefined && bestDist <= cutoff) return best;
  return undefined;
}

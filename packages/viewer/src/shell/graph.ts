import type { IR, IRNode } from '@echozedlabs/techtree-ir';

/**
 * Path highlighting direction:
 *  - 'ancestors'   — everything the node needs (its prerequisite closure)
 *  - 'descendants' — everything the node unlocks (its downstream closure)
 *  - 'both'        — the whole dependency path through the node
 */
export type HighlightDirection = 'ancestors' | 'descendants' | 'both';

export interface RelatedSets {
  /** Direct prerequisites (incoming edges). */
  prereqs: IRNode[];
  /** Direct dependents (outgoing edges). */
  dependents: IRNode[];
  /** The highlighted set for `direction`, always including the node itself. */
  related: Set<string>;
  /** Full prerequisite closure (excluding the node). */
  ancestors: Set<string>;
  /** Full downstream closure (excluding the node). */
  descendants: Set<string>;
}

const EMPTY: RelatedSets = {
  prereqs: [],
  dependents: [],
  related: new Set(),
  ancestors: new Set(),
  descendants: new Set(),
};

function closure(start: string, adj: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const next of adj.get(cur) ?? []) {
      if (!seen.has(next) && next !== start) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

/**
 * Compute the ancestors / descendants of `selectedId` over `requires` and
 * `recommends` edges (any-of members included — they are all candidate paths).
 * Used by the side panel (prereqs / dependents listings) and renderers (dim or
 * hide everything outside `related`).
 */
export function computeRelated(
  ir: IR | null,
  selectedId: string | null,
  direction: HighlightDirection = 'both',
): RelatedSets {
  if (!ir || !selectedId) return { ...EMPTY, related: new Set() };

  const byId = new Map(ir.nodes.map((n) => [n.id, n]));
  const inAdj = new Map<string, string[]>();
  const outAdj = new Map<string, string[]>();
  for (const e of ir.edges) {
    if (!inAdj.has(e.to)) inAdj.set(e.to, []);
    inAdj.get(e.to)!.push(e.from);
    if (!outAdj.has(e.from)) outAdj.set(e.from, []);
    outAdj.get(e.from)!.push(e.to);
  }

  const ancestors = closure(selectedId, inAdj);
  const descendants = closure(selectedId, outAdj);
  const related = new Set<string>([selectedId]);
  if (direction !== 'descendants') for (const id of ancestors) related.add(id);
  if (direction !== 'ancestors') for (const id of descendants) related.add(id);

  const prereqs: IRNode[] = [];
  const dependents: IRNode[] = [];
  const seenP = new Set<string>();
  const seenD = new Set<string>();
  for (const e of ir.edges) {
    if (e.to === selectedId && !seenP.has(e.from)) {
      const p = byId.get(e.from);
      if (p) prereqs.push(p);
      seenP.add(e.from);
    }
    if (e.from === selectedId && !seenD.has(e.to)) {
      const d = byId.get(e.to);
      if (d) dependents.push(d);
      seenD.add(e.to);
    }
  }
  return { prereqs, dependents, related, ancestors, descendants };
}

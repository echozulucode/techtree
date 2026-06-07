import type { IR, IRNode } from '@echozedlabs/techtree-ir';

export interface RelatedSets {
  prereqs: IRNode[];
  dependents: IRNode[];
  related: Set<string>;
}

/**
 * Compute ancestors + descendants of `selectedId` over the `requires` and
 * `recommends` edges. Used by both the side panel (prereqs/dependents listings)
 * and renderers (dim everything else).
 */
export function computeRelated(ir: IR | null, selectedId: string | null): RelatedSets {
  if (!ir || !selectedId) return { prereqs: [], dependents: [], related: new Set() };

  const byId = new Map(ir.nodes.map((n) => [n.id, n]));
  const inAdj = new Map<string, string[]>();
  const outAdj = new Map<string, string[]>();
  for (const e of ir.edges) {
    if (!inAdj.has(e.to)) inAdj.set(e.to, []);
    inAdj.get(e.to)!.push(e.from);
    if (!outAdj.has(e.from)) outAdj.set(e.from, []);
    outAdj.get(e.from)!.push(e.to);
  }

  const related = new Set<string>();
  related.add(selectedId);
  for (const start of [selectedId]) {
    const stackUp = [start];
    while (stackUp.length) {
      const cur = stackUp.pop()!;
      for (const next of inAdj.get(cur) ?? []) {
        if (!related.has(next)) {
          related.add(next);
          stackUp.push(next);
        }
      }
    }
    const stackDown = [start];
    while (stackDown.length) {
      const cur = stackDown.pop()!;
      for (const next of outAdj.get(cur) ?? []) {
        if (!related.has(next)) {
          related.add(next);
          stackDown.push(next);
        }
      }
    }
  }

  const prereqs: IRNode[] = [];
  const dependents: IRNode[] = [];
  for (const e of ir.edges) {
    if (e.to === selectedId) {
      const p = byId.get(e.from);
      if (p) prereqs.push(p);
    }
    if (e.from === selectedId) {
      const d = byId.get(e.to);
      if (d) dependents.push(d);
    }
  }
  return { prereqs, dependents, related };
}

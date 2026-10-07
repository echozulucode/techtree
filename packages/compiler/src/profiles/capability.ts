import { capabilitySchema, type Capability, type CapabilityData } from '@echozedlabs/techtree-schema';
import type { Diagnostic } from '../diagnostics.js';
import { allPrerequisiteRefs, type CoreNode, type Profile, type ProfileLintContext } from '../profile.js';

/**
 * The capability profile — a Civilization-style tech tree of engineering
 * capabilities. Nodes are `capability`, `milestone` (cross-branch goal) or
 * `wonder` (organisation-wide investment with a benefit statement).
 *
 * Field mapping onto the engine:
 *   kind   → category     (drives colour / icon)
 *   era    → band         (columns)
 *   branch → track        (swimlanes with `layout.lanes: true`)
 *   requires: [id | {any_of: [ids]}] → requires + requiresAnyOf (ADR-0006)
 *   everything else → IRNode.data as CapabilityData (links stay opaque)
 *
 * The status model (stored maturity + derived available/locked) lives in
 * @echozedlabs/techtree-state as `capabilityStatusModel`.
 */
export const capabilityProfile: Profile = {
  id: 'capability',
  nodeFileSuffixes: ['.capability.yaml', '.capability.yml'],
  nodeSchema: capabilitySchema,
  mapNode(raw: unknown): CoreNode {
    const c = raw as Capability;
    const requires: string[] = [];
    const requiresAnyOf: string[][] = [];
    for (const p of c.requires ?? []) {
      if (typeof p === 'string') requires.push(p);
      else requiresAnyOf.push([...p.any_of]);
    }
    const data: CapabilityData = {
      kind: c.kind,
      ...(c.summary !== undefined ? { summary: c.summary } : {}),
      unlocks: [...(c.unlocks ?? [])],
      ...(c.benefit !== undefined ? { benefit: c.benefit } : {}),
      eurekas: (c.eurekas ?? []).map((e) => ({ id: e.id, statement: e.statement })),
      implementations: [...(c.implementations ?? [])],
      links: (c.links ?? []).map((l) => ({ type: l.type, ref: l.ref, relation: l.relation })),
      ...(c.owner !== undefined ? { owner: c.owner } : {}),
      ...(c.target_status !== undefined ? { target_status: c.target_status } : {}),
    };
    return {
      id: c.id,
      title: c.title,
      ...(c.description !== undefined ? { description: c.description } : {}),
      category: c.kind,
      tags: [...(c.tags ?? [])],
      ...(c.era !== undefined ? { band: c.era } : {}),
      ...(c.branch !== undefined ? { track: c.branch } : {}),
      requires,
      ...(requiresAnyOf.length > 0 ? { requiresAnyOf } : {}),
      recommends: [...(c.recommends ?? [])],
      aliases: [...(c.aliases ?? [])],
      ...(c.position !== undefined ? { position: c.position } : {}),
      pinned: c.pinned ?? false,
      data: data as unknown as Record<string, unknown>,
    };
  },
  lint: lintCapabilities,
};

/**
 * Capability-specific rules (the generic rules — unknown refs, cycles,
 * duplicates — have already passed when these run):
 *
 *  - era-regression (error): a prerequisite sits in a LATER era than the node
 *    that requires it. Same era is fine.
 *  - unreachable-milestone (warning): a milestone or wonder with no
 *    prerequisites — nothing in the tree leads to it.
 *  - wonder-missing-benefit (error): wonders must state their benefit.
 *  - duplicate-eureka (error): eureka ids must be unique within a node (host
 *    state refers to them).
 */
export function lintCapabilities(ctx: ProfileLintContext): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const bandOrder = new Map(ctx.bands.map((b) => [b.id, b.order]));
  const bandTitle = (id: string): string => ctx.bands.find((b) => b.id === id)?.title ?? id;

  for (const { node, file } of ctx.nodes) {
    const data = node.data as unknown as CapabilityData;
    const prereqs = allPrerequisiteRefs(node);

    // era monotonicity
    const myOrder = node.band !== undefined ? bandOrder.get(node.band) : undefined;
    if (myOrder !== undefined) {
      for (const ref of prereqs) {
        const id = ctx.resolve(ref);
        const dep = id !== undefined ? ctx.byId.get(id) : undefined;
        const depOrder = dep?.band !== undefined ? bandOrder.get(dep.band) : undefined;
        if (dep && depOrder !== undefined && depOrder > myOrder) {
          diags.push({
            severity: 'error',
            code: 'era-regression',
            message: `"${node.title}" (${node.id}, era ${bandTitle(node.band!)}) requires "${dep.title}" (${dep.id}), which sits in the later era ${bandTitle(dep.band!)}.`,
            file,
            hint: 'A prerequisite must be in the same or an earlier era. Move one of the two nodes, or drop the dependency.',
          });
        }
      }
    }

    // reachability of goals
    if ((data.kind === 'milestone' || data.kind === 'wonder') && prereqs.length === 0) {
      diags.push({
        severity: 'warning',
        code: 'unreachable-milestone',
        message: `${data.kind === 'wonder' ? 'Wonder' : 'Milestone'} "${node.title}" (${node.id}) has no prerequisites, so nothing in the tree leads to it.`,
        file,
        hint: 'Milestones and wonders are reached through capabilities — add the capabilities it requires.',
      });
    }

    if (data.kind === 'wonder' && !data.benefit) {
      diags.push({
        severity: 'error',
        code: 'wonder-missing-benefit',
        message: `Wonder "${node.title}" (${node.id}) has no benefit statement.`,
        file,
        hint: 'Add `benefit:` — the organisation-wide payoff that justifies the investment.',
      });
    }

    const seen = new Set<string>();
    for (const e of data.eurekas ?? []) {
      if (seen.has(e.id)) {
        diags.push({
          severity: 'error',
          code: 'duplicate-eureka',
          message: `Node "${node.id}" defines eureka "${e.id}" more than once.`,
          file,
        });
      }
      seen.add(e.id);
    }
  }
  return diags;
}

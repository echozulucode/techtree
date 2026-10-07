// The shape the capability profile packs into `IRNode.data`. Consumers (the
// viewer, host apps) read it back via `node.data as unknown as CapabilityData`
// or the `capabilityData(node)` helper.
//
// This module is ZOD-FREE on purpose: it is the light entry
// `@echozedlabs/techtree-schema/capability-data` for client bundles (the viewer,
// host pages). The authoring schemas in capability.ts build their enums from the
// constants below. Never import zod (or capability.ts) from here.

/**
 * Stored maturity states of a capability, in maturity order. These are the
 * values a person sets (with evidence, in the host app); `available` / `locked`
 * are never stored — they are derived from the prerequisite graph (see
 * `capabilityStatusModel` in @echozedlabs/techtree-state).
 *
 * Write-up glyphs: ○ not started, ◔ investigating, ◑ demonstrated,
 * ● operational, ★ strategic standard, ⚠ legacy, ✕ retiring.
 */
export const CAPABILITY_STATUSES = [
  'not_started',
  'investigating',
  'demonstrated',
  'operational',
  'strategic_standard',
  'legacy',
  'retiring',
] as const;
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

/** Node kinds of the capability profile. Drives `IRNode.category`. */
export const CAPABILITY_KINDS = ['capability', 'milestone', 'wonder'] as const;
export type CapabilityKind = (typeof CAPABILITY_KINDS)[number];

/** Relation of an opaque link to its capability. The host resolves the ref. */
export const CAPABILITY_LINK_RELATIONS = ['demonstrates', 'implements', 'evidence', 'eureka'] as const;
export type CapabilityLinkRelation = (typeof CAPABILITY_LINK_RELATIONS)[number];

export interface CapabilityEureka {
  id: string;
  statement: string;
}

/**
 * An opaque link from a capability to something the HOST owns (an example, a
 * released tool, a taxonomy term, a URL). The engine never dereferences it; the
 * host resolves `type` + `ref` and applies its own visibility rules.
 */
export interface CapabilityLink {
  type: string;
  ref: string;
  relation: CapabilityLinkRelation;
}

export interface CapabilityData {
  kind: CapabilityKind;
  summary?: string;
  /** Free-text unlocks (graph unlocks are derived from outgoing edges). */
  unlocks: string[];
  /** Wonders: the organisation-wide benefit. */
  benefit?: string;
  eurekas: CapabilityEureka[];
  /** Opaque implementation refs. */
  implementations: string[];
  links: CapabilityLink[];
  owner?: string;
  target_status?: CapabilityStatus;
}

/** Type-narrowing accessor; returns undefined for nodes from other profiles. */
export function capabilityData(node: { data: Record<string, unknown> }): CapabilityData | undefined {
  const d = node.data as Partial<CapabilityData>;
  if (d.kind !== 'capability' && d.kind !== 'milestone' && d.kind !== 'wonder') return undefined;
  return {
    kind: d.kind,
    ...(d.summary !== undefined ? { summary: d.summary } : {}),
    unlocks: d.unlocks ?? [],
    ...(d.benefit !== undefined ? { benefit: d.benefit } : {}),
    eurekas: d.eurekas ?? [],
    implementations: d.implementations ?? [],
    links: d.links ?? [],
    ...(d.owner !== undefined ? { owner: d.owner } : {}),
    ...(d.target_status !== undefined ? { target_status: d.target_status } : {}),
  };
}

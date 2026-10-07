// The shape the capability profile packs into `IRNode.data`. Consumers (the
// viewer, host apps) read it back via `node.data as unknown as CapabilityData`
// or the `capabilityData(node)` helper.

import type { CapabilityKind, CapabilityLinkRelation, CapabilityStatus } from './capability.js';

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

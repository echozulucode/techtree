import type { IR } from '@echozedlabs/techtree-ir';
import type { NodeStatus, TreeState } from './schema.js';
import { deriveEffectiveStatuses, skillStatusModel } from './status-model.js';

/**
 * Derive per-node status from the IR's prerequisite graph + the user's TreeState
 * under the skill status model. Returns a map: node id → one of the UI states.
 *
 *  - explicitly set in TreeState  → use that value (in_progress | submitted | achieved | …)
 *  - all `requires` prereqs are achieved (any-of groups: one member) → available
 *  - otherwise → locked
 *
 * Other profiles use `deriveStatusView(ir, states, model)` from status-model.ts;
 * this function is the skill-model special case kept for compatibility.
 */
export function deriveStatuses(ir: IR, state: TreeState | null): Map<string, NodeStatus> {
  return deriveEffectiveStatuses(ir, state?.skills ?? null, skillStatusModel) as Map<
    string,
    NodeStatus
  >;
}

/**
 * Pick the user's "current frontier" node — the one to center the camera on
 * during initial load. Preference order:
 *   1. First in_progress node on the primary_path
 *   2. First in_progress node anywhere
 *      (the capability model has no in_progress; its frontier is the first
 *      `investigating` node, then the first available one)
 *   3. First available node on the primary_path
 *   4. First available node anywhere
 *   5. First node in the IR (fallback)
 */
export function pickFrontierNodeId(
  ir: IR,
  statuses: ReadonlyMap<string, string>,
  primaryPath?: string,
): string | null {
  if (ir.nodes.length === 0) return null;

  const onPrimaryPath = primaryPath ? ir.nodes.filter((n) => n.track === primaryPath) : [];

  const inProgressOnPath = onPrimaryPath.find((n) => statuses.get(n.id) === 'in_progress');
  if (inProgressOnPath) return inProgressOnPath.id;

  const inProgressAny = ir.nodes.find((n) => statuses.get(n.id) === 'in_progress');
  if (inProgressAny) return inProgressAny.id;

  const investigating = onPrimaryPath.find((n) => statuses.get(n.id) === 'investigating') ??
    ir.nodes.find((n) => statuses.get(n.id) === 'investigating');
  if (investigating) return investigating.id;

  const availableOnPath = onPrimaryPath.find((n) => statuses.get(n.id) === 'available');
  if (availableOnPath) return availableOnPath.id;

  const availableAny = ir.nodes.find((n) => statuses.get(n.id) === 'available');
  if (availableAny) return availableAny.id;

  return ir.nodes[0]?.id ?? null;
}

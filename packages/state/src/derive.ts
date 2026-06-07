import type { IR } from '@echozedlabs/techtree-ir';
import type { NodeStatus, TreeState } from './schema.js';

/**
 * Derive per-node status from the IR's prerequisite graph + the user's TreeState.
 * Returns a map: node id → one of the five UI states.
 *
 *  - explicitly set in TreeState  → use that value (in_progress | submitted | achieved)
 *  - all `requires` prereqs are achieved → available
 *  - otherwise → locked
 *
 * See docs/high-level-plan.md Phase 3.
 */
export function deriveStatuses(ir: IR, state: TreeState | null): Map<string, NodeStatus> {
  const out = new Map<string, NodeStatus>();
  const setBy = new Map(Object.entries(state?.skills ?? {}));

  const prereqs = new Map<string, string[]>();
  for (const e of ir.edges) {
    if (e.kind !== 'requires') continue;
    if (!prereqs.has(e.to)) prereqs.set(e.to, []);
    prereqs.get(e.to)!.push(e.from);
  }

  for (const n of ir.nodes) {
    const explicit = setBy.get(n.id);
    if (explicit) {
      out.set(n.id, explicit.status);
      continue;
    }
    const reqs = prereqs.get(n.id) ?? [];
    if (reqs.length === 0) {
      out.set(n.id, 'available');
      continue;
    }
    const allAchieved = reqs.every((r) => setBy.get(r)?.status === 'achieved');
    out.set(n.id, allAchieved ? 'available' : 'locked');
  }
  return out;
}

/**
 * Pick the user's "current frontier" node — the one to center the camera on
 * during initial load. Preference order:
 *   1. First in_progress node on the primary_path
 *   2. First in_progress node anywhere
 *   3. First available node on the primary_path
 *   4. First available node anywhere
 *   5. First node in the IR (fallback)
 */
export function pickFrontierNodeId(
  ir: IR,
  statuses: Map<string, NodeStatus>,
  primaryPath?: string,
): string | null {
  if (ir.nodes.length === 0) return null;

  const onPrimaryPath = primaryPath ? ir.nodes.filter((n) => n.track === primaryPath) : [];

  const inProgressOnPath = onPrimaryPath.find((n) => statuses.get(n.id) === 'in_progress');
  if (inProgressOnPath) return inProgressOnPath.id;

  const inProgressAny = ir.nodes.find((n) => statuses.get(n.id) === 'in_progress');
  if (inProgressAny) return inProgressAny.id;

  const availableOnPath = onPrimaryPath.find((n) => statuses.get(n.id) === 'available');
  if (availableOnPath) return availableOnPath.id;

  const availableAny = ir.nodes.find((n) => statuses.get(n.id) === 'available');
  if (availableAny) return availableAny.id;

  return ir.nodes[0]?.id ?? null;
}

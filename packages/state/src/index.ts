// @echozedlabs/techtree-state
// Per-user achievement state — strictly separate from structure.
// See docs/high-level-plan.md §1.1.

export {
  STATE_SCHEMA_VERSION,
  treeStateSchema,
  skillStateEntry,
  setStatusEnum,
  nodeStatusEnum,
  emptyState,
  type TreeState,
  type SkillStateEntry,
  type SetStatus,
  type NodeStatus,
} from './schema.js';

export { deriveStatuses, pickFrontierNodeId } from './derive.js';

export { LocalStorageStateAdapter, type StateAdapter } from './adapter.js';

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
  type NodeStateEntry,
  type SetStatus,
  type NodeStatus,
} from './schema.js';

export { deriveStatuses, pickFrontierNodeId } from './derive.js';

export {
  STATUS_ICON_NAMES,
  STATUS_MODELS,
  skillStatusModel,
  capabilityStatusModel,
  getStatusModel,
  statusDef,
  prerequisiteIndex,
  deriveStatusView,
  deriveEffectiveStatuses,
  type StatusIconName,
  type StatusDef,
  type StatusModel,
  type PrerequisiteGroup,
  type Prerequisites,
  type NodeStateInput,
  type NodeStates,
  type NodeStatusView,
} from './status-model.js';

export { LocalStorageStateAdapter, type StateAdapter } from './adapter.js';

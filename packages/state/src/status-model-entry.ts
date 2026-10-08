// @echozedlabs/techtree-state/status-model — the zod-free light entry.
//
// Everything a client bundle (the viewer, a host page) needs to derive and
// present statuses: status models, prerequisite index, status derivation and
// the frontier pick. No zod: the state *schema* (`treeStateSchema` …) and the
// storage adapters stay on the main entry.

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

export { pickFrontierNodeId } from './derive.js';

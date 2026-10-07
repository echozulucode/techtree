// @echozedlabs/techtree-schema
// Zod schemas for v1. JSON Schema export is provided via to-json-schema.ts for
// IDE/CI tooling consumers. See docs/high-level-plan.md §1.7.

export const SCHEMA_VERSION = 1 as const;

export { skillSchema, SKILL_SCHEMA_VERSION, type Skill } from './skill.js';

export {
  type SkillData,
  type SkillWorkflowMeta,
  type SkillLearningResource,
} from './skill-data.js';

export {
  capabilitySchema,
  CAPABILITY_SCHEMA_VERSION,
  CAPABILITY_STATUSES,
  CAPABILITY_KINDS,
  CAPABILITY_LINK_RELATIONS,
  capabilityStatusEnum,
  capabilityKindEnum,
  capabilityLinkRelationEnum,
  type Capability,
  type CapabilityPrerequisite,
  type CapabilityStatus,
  type CapabilityKind,
  type CapabilityLinkRelation,
} from './capability.js';

export {
  capabilityData,
  type CapabilityData,
  type CapabilityEureka,
  type CapabilityLink,
} from './capability-data.js';

export { themeSchema, THEME_SCHEMA_VERSION, type Theme } from './theme.js';

export { treeSchema, TREE_SCHEMA_VERSION, type Tree, type EraDef, type PathDef, type LayoutDef } from './tree.js';

export { skillId, isValidSkillId, type SkillId } from './ids.js';

export { jsonSchemas } from './to-json-schema.js';

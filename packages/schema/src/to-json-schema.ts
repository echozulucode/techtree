import { zodToJsonSchema } from 'zod-to-json-schema';
import { skillSchema } from './skill.js';
import { themeSchema } from './theme.js';
import { treeSchema } from './tree.js';

/**
 * JSON Schema exports for IDE autocomplete and CI validation tooling.
 * VS Code, JSONSchemaStore, and similar consumers can point at these.
 * See docs/high-level-plan.md Phase 4 — VS Code extension stub.
 */
export const jsonSchemas = {
  skill: zodToJsonSchema(skillSchema, { name: 'Skill', target: 'jsonSchema7' }),
  theme: zodToJsonSchema(themeSchema, { name: 'Theme', target: 'jsonSchema7' }),
  tree: zodToJsonSchema(treeSchema, { name: 'Tree', target: 'jsonSchema7' }),
} as const;

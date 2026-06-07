import { z } from 'zod';
import { skillId } from './ids.js';

export const SKILL_SCHEMA_VERSION = 1 as const;

const learningResource = z
  .object({
    label: z.string().min(1),
    url: z.string().url(),
    kind: z.enum(['course', 'doc', 'video', 'book', 'article', 'other']).optional(),
  })
  .strict();

const position = z
  .object({
    x: z.number(),
    y: z.number(),
  })
  .strict();

export const skillSchema = z
  .object({
    schema_version: z.literal(SKILL_SCHEMA_VERSION).optional(),

    // Identity
    id: skillId,
    aliases: z.array(skillId).optional(),
    title: z.string().min(1),
    description: z.string().optional(),

    // Taxonomy
    category: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
    era: z.string().min(1).optional(),
    path: z.string().min(1).optional(),

    // Graph
    requires: z.array(skillId).optional(),
    recommends: z.array(skillId).optional(),

    // Effort
    difficulty: z.number().int().min(1).max(5).optional(),
    estimated_hours: z.number().positive().optional(),

    // Workflow metadata — descriptive in MVP, enforced from §8 phase 6+.
    // See docs/high-level-plan.md §1.6.
    owner: z.string().min(1).optional(),
    validation_criteria: z.array(z.string().min(1)).optional(),
    evidence_requirements: z.array(z.string().min(1)).optional(),
    approver_role: z.string().min(1).optional(),
    review_cadence: z.string().min(1).optional(),

    // Resources
    learning_resources: z.array(learningResource).optional(),

    // Layout hints
    position: position.optional(),
    pinned: z.boolean().optional(),
  })
  .strict();

export type Skill = z.infer<typeof skillSchema>;

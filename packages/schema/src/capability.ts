import { z } from 'zod';
import { skillId } from './ids.js';
import {
  CAPABILITY_KINDS,
  CAPABILITY_LINK_RELATIONS,
  CAPABILITY_STATUSES,
  type CapabilityKind,
  type CapabilityLinkRelation,
  type CapabilityStatus,
} from './capability-data.js';

// The constants (and their types) live in the zod-free capability-data.ts so
// client bundles can use them without zod; re-exported here for compatibility.
export { CAPABILITY_KINDS, CAPABILITY_LINK_RELATIONS, CAPABILITY_STATUSES };
export type { CapabilityKind, CapabilityLinkRelation, CapabilityStatus };

export const CAPABILITY_SCHEMA_VERSION = 1 as const;

export const capabilityStatusEnum = z.enum(CAPABILITY_STATUSES);

export const capabilityKindEnum = z.enum(CAPABILITY_KINDS);

export const capabilityLinkRelationEnum = z.enum(CAPABILITY_LINK_RELATIONS);

const slug = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'must be a lowercase slug (letters, digits, dashes)');

const eureka = z
  .object({
    /** Stable slug, unique within the node (host state refers to it). */
    id: slug,
    /** The small experiment that moves the capability forward. */
    statement: z.string().min(1),
  })
  .strict();

const link = z
  .object({
    /** Host-defined item type, e.g. 'example', 'tool', 'technology', 'url'. */
    type: z.string().min(1),
    /** Host-defined reference (slug, id, or URL). Opaque to the engine. */
    ref: z.string().min(1),
    relation: capabilityLinkRelationEnum,
  })
  .strict();

/** `{ any_of: [...] }` — one of these prerequisites suffices (ADR-0006). */
const anyOfGroup = z
  .object({
    any_of: z.array(skillId).min(1),
  })
  .strict();

const prerequisite = z.union([skillId, anyOfGroup]);

const position = z.object({ x: z.number(), y: z.number() }).strict();

/**
 * Authoring schema for `*.capability.yaml` nodes — the Civilization-style
 * capability tech tree. Capabilities are named as capabilities, never products
 * ("Continuous integration", not a tool name); technologies are recorded as
 * `implementations`.
 *
 * Field mapping onto the engine: kind → category, era → band, branch → track,
 * requires (strings + `{any_of}` groups) → requires / requiresAnyOf; everything
 * else is packed into `IRNode.data` as `CapabilityData`.
 */
export const capabilitySchema = z
  .object({
    schema_version: z.literal(CAPABILITY_SCHEMA_VERSION).optional(),

    // Identity
    id: skillId,
    aliases: z.array(skillId).optional(),
    title: z.string().min(1),
    kind: capabilityKindEnum,
    /** One-line summary shown on cards and tooltips. */
    summary: z.string().min(1).optional(),
    description: z.string().optional(),
    tags: z.array(z.string().min(1)).optional(),

    // Placement
    /** Era (band / column). */
    era: z.string().min(1).optional(),
    /** Branch (track / swimlane). */
    branch: z.string().min(1).optional(),

    // Graph
    /** Hard prerequisites. Plain ids are all required; `{any_of: [...]}` needs one. */
    requires: z.array(prerequisite).optional(),
    /** Soft follow-ons (not used for availability). */
    recommends: z.array(skillId).optional(),
    /** Free-text outcomes this capability unlocks beyond the graph edges. */
    unlocks: z.array(z.string().min(1)).optional(),

    // Card content
    /** Organisation-wide benefit statement. Required for wonders (lint). */
    benefit: z.string().min(1).optional(),
    eurekas: z.array(eureka).optional(),
    /** Opaque implementation refs (e.g. 'technology:yocto-project', 'Rust'). */
    implementations: z.array(z.string().min(1)).optional(),
    /** Opaque links the host resolves (and filters by visibility). */
    links: z.array(link).optional(),
    owner: z.string().min(1).optional(),
    target_status: capabilityStatusEnum.optional(),

    // Layout hints
    position: position.optional(),
    pinned: z.boolean().optional(),
  })
  .strict();

export type Capability = z.infer<typeof capabilitySchema>;
export type CapabilityPrerequisite = z.infer<typeof prerequisite>;

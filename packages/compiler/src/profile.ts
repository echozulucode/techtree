import type { z } from 'zod';

/**
 * The domain-agnostic node the engine pipeline operates on. A Profile maps its
 * own validated YAML node into this shape; lint, layout, and emit consume only
 * CoreNode and never see profile-specific fields (those live in `data`).
 *
 * This is the heart of the generalization: skills, milestones, experiments —
 * every domain is a Profile that produces CoreNodes. See docs/overview.md.
 */
export interface CoreNode {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  /** Phase band (skill "era", delivery "phase"). */
  band?: string;
  /** Named progression (skill "path", delivery "stream"). */
  track?: string;
  /** Hard prerequisites (ids or aliases). */
  requires: string[];
  /** Soft follow-ons (ids or aliases). */
  recommends: string[];
  aliases: string[];
  /** Optional author layout hint. */
  position?: { x: number; y: number };
  pinned: boolean;
  /** Profile-specific fields, packed verbatim into IRNode.data. */
  data: Record<string, unknown>;
}

/**
 * A Profile teaches the engine one domain: how to recognize its node files, how
 * to validate them, and how to normalize them into CoreNodes. Everything else
 * (graph validation, layout, IR emission, rendering) is profile-agnostic.
 */
export interface Profile {
  /** Stable profile id, e.g. 'skill' or 'delivery'. */
  id: string;
  /** File suffixes that mark a node file, e.g. ['.skill.yaml', '.skill.yml']. */
  nodeFileSuffixes: string[];
  /** Zod schema validating a raw node object parsed from YAML. */
  nodeSchema: z.ZodTypeAny;
  /** Normalize a validated raw node (the output of nodeSchema) into a CoreNode. */
  mapNode(raw: unknown): CoreNode;
}

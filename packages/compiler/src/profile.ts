import type { z } from 'zod';
import type { Diagnostic } from './diagnostics.js';

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
  /** Hard prerequisites (ids or aliases). Each one is required. */
  requires: string[];
  /**
   * Any-of prerequisite groups (ids or aliases): ONE member of each group is
   * required. Optional so existing profiles need not set it. See ADR-0006.
   */
  requiresAnyOf?: string[][];
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
  /**
   * Optional domain lint rules, run after the generic graph rules (so ids,
   * references and cycles are already checked). Return extra diagnostics.
   */
  lint?(ctx: ProfileLintContext): Diagnostic[];
}

/** Read-only view of a validated tree handed to `Profile.lint`. */
export interface ProfileLintContext {
  /** Every validated node with the source file it came from (relative path). */
  nodes: readonly { node: CoreNode; file: string }[];
  /** Canonical node by id (first definition wins on duplicates). */
  byId: ReadonlyMap<string, CoreNode>;
  /** Resolve an id or alias to a canonical id; undefined when unknown. */
  resolve(ref: string): string | undefined;
  /** Declared bands (tree.yaml `eras`), with their order. */
  bands: readonly { id: string; title?: string; order: number }[];
  /** Declared tracks (tree.yaml `paths`). */
  tracks: readonly { id: string; title?: string }[];
}

/** All prerequisite refs of a node — `requires` plus every any-of member. */
export function allPrerequisiteRefs(node: CoreNode): string[] {
  return [...node.requires, ...(node.requiresAnyOf ?? []).flat()];
}

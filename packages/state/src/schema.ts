import { z } from 'zod';

export const STATE_SCHEMA_VERSION = 1 as const;

/**
 * User-set status values. Locked and available are NOT stored — they are
 * derived by the viewer from the requires graph + the achieved set.
 * Phase 5 added `pending_approval`, `rejected`; Phase 6+ will add
 * `needs_evidence`, `expired`, `waived` per the eight-state target in
 * docs/high-level-plan.md.
 */
export const setStatusEnum = z.enum([
  'in_progress',
  'submitted',
  'pending_approval',
  'achieved',
  'rejected',
]);
export type SetStatus = z.infer<typeof setStatusEnum>;

/** Full status union, including derived states. */
export const nodeStatusEnum = z.enum([
  'locked',
  'available',
  'in_progress',
  'submitted',
  'pending_approval',
  'achieved',
  'rejected',
]);
export type NodeStatus = z.infer<typeof nodeStatusEnum>;

const commentEntry = z
  .object({
    author: z.string().min(1),
    /** ISO-8601 timestamp. */
    timestamp: z.string().min(1),
    text: z.string().min(1),
  })
  .strict();

const evidenceEntry = z
  .object({
    label: z.string().min(1),
    url: z.string().url(),
    /** ISO-8601 timestamp. */
    attached_at: z.string().min(1),
  })
  .strict();

export const skillStateEntry = z
  .object({
    status: setStatusEnum,
    /** ISO-8601 timestamp when the user first marked in_progress. */
    started_at: z.string().optional(),
    /** ISO-8601 timestamp when the user marked submitted or pending_approval. */
    submitted_at: z.string().optional(),
    /** ISO-8601 timestamp when the user marked achieved (or, in Phase 5+, when an approver did). */
    completed_at: z.string().optional(),
    approver: z.string().optional(),
    comments: z.array(commentEntry).optional(),
    evidence: z.array(evidenceEntry).optional(),
    /**
     * Phase 5: foreign key into the server's audit_log table. Refers to the
     * row recording the most recent transition that produced this entry.
     * Absent on client-only state (e.g., LocalStorageStateAdapter).
     */
    audit_id: z.number().int().nonnegative().optional(),
  })
  .strict();

export type SkillStateEntry = z.infer<typeof skillStateEntry>;

export const treeStateSchema = z
  .object({
    schema_version: z.literal(STATE_SCHEMA_VERSION).optional(),
    user_id: z.string().min(1),
    tree_id: z.string().min(1),
    primary_path: z.string().optional(),
    skills: z.record(z.string(), skillStateEntry).default({}),
  })
  .strict();

export type TreeState = z.infer<typeof treeStateSchema>;

/** Create an empty state object for a given user + tree. */
export function emptyState(userId: string, treeId: string, primaryPath?: string): TreeState {
  return {
    schema_version: STATE_SCHEMA_VERSION,
    user_id: userId,
    tree_id: treeId,
    ...(primaryPath ? { primary_path: primaryPath } : {}),
    skills: {},
  };
}

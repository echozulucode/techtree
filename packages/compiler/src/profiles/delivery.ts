import { z } from 'zod';
import { skillId } from '@echozedlabs/techtree-schema';
import type { CoreNode, Profile } from '../profile.js';

/**
 * The delivery-narrative profile — a second, non-skill domain that proves the
 * engine is generic. Nodes are events / experiments / milestones in a project's
 * story (e.g. "adopted AI tooling" → "delivered simulator" → "explored auto-update").
 * It brings its OWN self-contained schema and maps onto the same CoreNode the
 * skill profile uses, touching no engine code. See docs/overview.md.
 *
 * Field mapping onto the engine:
 *   kind   → category   (event | experiment | milestone — drives color/icon)
 *   phase  → band        (timeline column: quarter / sprint / project phase)
 *   stream → track       (workstream this node belongs to)
 *   enabled_by / led_to are authoring-friendly aliases for requires/recommends.
 */
const deliveryNodeSchema = z
  .object({
    schema_version: z.literal(1).optional(),
    id: skillId,
    aliases: z.array(skillId).optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    kind: z.enum(['event', 'experiment', 'milestone']),
    tags: z.array(z.string().min(1)).optional(),
    phase: z.string().min(1).optional(),
    stream: z.string().min(1).optional(),
    /** Hard predecessors — what had to happen first. */
    enabled_by: z.array(skillId).optional(),
    /** Soft follow-ons — what this made possible. */
    led_to: z.array(skillId).optional(),
    /** ISO date the event/experiment/milestone occurred or is planned. */
    date: z.string().optional(),
    /** One-line outcome or impact statement. */
    impact: z.string().optional(),
    /** For experiments: the hypothesis under test. */
    hypothesis: z.string().optional(),
    position: z.object({ x: z.number(), y: z.number() }).strict().optional(),
    pinned: z.boolean().optional(),
  })
  .strict();

type DeliveryNode = z.infer<typeof deliveryNodeSchema>;

export const deliveryProfile: Profile = {
  id: 'delivery',
  nodeFileSuffixes: ['.delivery.yaml', '.delivery.yml'],
  nodeSchema: deliveryNodeSchema,
  mapNode(raw: unknown): CoreNode {
    const d = raw as DeliveryNode;
    const data = {
      kind: d.kind,
      ...(d.date !== undefined ? { date: d.date } : {}),
      ...(d.impact !== undefined ? { impact: d.impact } : {}),
      ...(d.hypothesis !== undefined ? { hypothesis: d.hypothesis } : {}),
    };
    return {
      id: d.id,
      title: d.title,
      ...(d.description !== undefined ? { description: d.description } : {}),
      category: d.kind,
      tags: [...(d.tags ?? [])],
      ...(d.phase !== undefined ? { band: d.phase } : {}),
      ...(d.stream !== undefined ? { track: d.stream } : {}),
      requires: [...(d.enabled_by ?? [])],
      recommends: [...(d.led_to ?? [])],
      aliases: [...(d.aliases ?? [])],
      ...(d.position !== undefined ? { position: d.position } : {}),
      pinned: d.pinned ?? false,
      data,
    };
  },
};

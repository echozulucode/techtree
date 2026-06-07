import { skillSchema, type Skill, type SkillData } from '@echozedlabs/techtree-schema';
import type { CoreNode, Profile } from '../profile.js';

/**
 * The skill profile — the original domain, now expressed as a Profile over the
 * generic engine. Maps the skill YAML schema onto CoreNode: `era→band`,
 * `path→track`, and packs difficulty / effort / workflow / resources into `data`
 * (typed as SkillData). When the engine is extracted to @echozedlabs/techtree
 * this file becomes the skill profile package. See docs/techtree-extraction.md.
 */
export const skillProfile: Profile = {
  id: 'skill',
  nodeFileSuffixes: ['.skill.yaml', '.skill.yml'],
  nodeSchema: skillSchema,
  mapNode(raw: unknown): CoreNode {
    const s = raw as Skill;
    const data: SkillData = {
      ...(s.difficulty !== undefined ? { difficulty: s.difficulty } : {}),
      ...(s.estimated_hours !== undefined ? { estimated_hours: s.estimated_hours } : {}),
      workflow: {
        ...(s.owner !== undefined ? { owner: s.owner } : {}),
        validation_criteria: [...(s.validation_criteria ?? [])],
        evidence_requirements: [...(s.evidence_requirements ?? [])],
        ...(s.approver_role !== undefined ? { approver_role: s.approver_role } : {}),
        ...(s.review_cadence !== undefined ? { review_cadence: s.review_cadence } : {}),
      },
      learning_resources: (s.learning_resources ?? []).map((r) => ({
        label: r.label,
        url: r.url,
        ...(r.kind !== undefined ? { kind: r.kind } : {}),
      })),
    };
    return {
      id: s.id,
      title: s.title,
      ...(s.description !== undefined ? { description: s.description } : {}),
      ...(s.category !== undefined ? { category: s.category } : {}),
      tags: [...(s.tags ?? [])],
      ...(s.era !== undefined ? { band: s.era } : {}),
      ...(s.path !== undefined ? { track: s.path } : {}),
      requires: [...(s.requires ?? [])],
      recommends: [...(s.recommends ?? [])],
      aliases: [...(s.aliases ?? [])],
      ...(s.position !== undefined ? { position: s.position } : {}),
      pinned: s.pinned ?? false,
      data: data as unknown as Record<string, unknown>,
    };
  },
};

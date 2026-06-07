// The shape the skill profile packs into `IRNode.data`. This is the seam between
// the domain-agnostic engine (which sees `data: Record<string, unknown>`) and the
// skill profile (which knows these fields exist). The compiler writes this shape;
// the viewer reads it back via `node.data as unknown as SkillData`.
//
// When the engine is extracted to @echozedlabs/techtree, this type moves into the
// skill profile package. See docs/techtree-extraction.md.

export interface SkillLearningResource {
  label: string;
  url: string;
  kind?: 'course' | 'doc' | 'video' | 'book' | 'article' | 'other';
}

export interface SkillWorkflowMeta {
  owner?: string;
  validation_criteria: string[];
  evidence_requirements: string[];
  approver_role?: string;
  review_cadence?: string;
}

export interface SkillData {
  difficulty?: number;
  estimated_hours?: number;
  workflow: SkillWorkflowMeta;
  learning_resources: SkillLearningResource[];
}

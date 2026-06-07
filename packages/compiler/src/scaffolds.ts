/**
 * YAML skeletons for `skilltree new`. Hand-authored (not generated from Zod)
 * because real authors want comments, organized sections, and example values —
 * none of which a JSON Schema captures.
 *
 * Scaffolds use sensible defaults that COMPILE clean on first save: optional
 * fields are commented out with hints, required fields have valid placeholder
 * values. The intent is to give the author a node visible in the viewer
 * immediately, with `# TODO` markers guiding the next edits.
 */

export interface SkillScaffoldOptions {
  id: string;
  title?: string;
}

export function skillScaffold({ id, title }: SkillScaffoldOptions): string {
  const inferredTitle = title ?? prettifyLastSegment(id);
  return `id: ${id}
title: ${inferredTitle}
description: |
  TODO: one-paragraph description of what mastery looks like.

# Taxonomy
category: skills        # TODO: free-form visual grouping; any string
# tags: []
# era: foundational     # TODO: must match an era declared in tree.yaml
# path: programming     # TODO: optional named progression

# Graph (use full namespaced ids, e.g., org.eng/some-skill)
# requires: []
# recommends: []

# Effort
difficulty: 3           # 1 (trivial) — 5 (expert)
# estimated_hours: 8

# Workflow metadata (descriptive in MVP; enforced from §8 phase 6+)
# owner: TODO
# validation_criteria:
#   - TODO
# evidence_requirements: []
# approver_role: tech-lead
# review_cadence: annual

# Learning resources
# learning_resources:
#   - label: TODO
#     url: https://example.com
#     kind: doc           # one of: course | doc | video | book | article | other
`;
}

export interface ThemeScaffoldOptions {
  id: string;
  title?: string;
}

export function themeScaffold({ id, title }: ThemeScaffoldOptions): string {
  const inferredTitle = title ?? id;
  return `id: ${id}
title: ${inferredTitle}
# inherits: civ-iv   # optional base theme to extend

colors:
  canvas_background: '#1a1f2e'
  canvas_grid: '#2a2f3e'
  node_default_fill: '#5a6378'
  node_default_border: '#2b2f3a'
  node_text: '#f2efe4'
  node_locked_fill: '#3b4353'
  node_available_fill: '#5a7399'
  node_in_progress_fill: '#b89a4a'
  node_submitted_fill: '#c4986d'
  node_achieved_fill: '#8fae5d'
  edge_requires: '#8c9ab0'
  edge_recommends: '#5aa9e6'
  edge_highlight: '#f2c94c'

# Per-category overrides (any category referenced in your skills)
# categories:
#   foundations: { shape: rounded, fill: '#5a7399', elevation: low }
#   core:        { shape: rounded, fill: '#8fae5d', elevation: medium }

edges:
  requires:
    stroke: '#8c9ab0'
    width: 2
    style: solid
  recommends:
    stroke: '#5aa9e6'
    width: 1.5
    style: dashed

eras:
  show_labels: true
  label_color: '#d9c977'

fonts:
  family: 'Georgia, serif'
  title_size: 13
  body_size: 11
`;
}

function prettifyLastSegment(id: string): string {
  const last = id.split(/[./]/).pop() ?? id;
  return last
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Suggest a default path for a new skill file, optionally rooted at a tree dir.
 *
 *   suggestSkillPath('personal.advanced/teaching')
 *     → 'skills/advanced/teaching.skill.yaml'
 *   suggestSkillPath('personal.advanced/teaching', 'examples/personal-learning')
 *     → 'examples/personal-learning/skills/advanced/teaching.skill.yaml'
 */
export function suggestSkillPath(id: string, treeDir?: string): string {
  const slashIdx = id.indexOf('/');
  let rel: string;
  if (slashIdx === -1) {
    const last = id.split('.').pop() ?? id;
    rel = `skills/${last}.skill.yaml`;
  } else {
    const namespace = id.slice(0, slashIdx);
    const name = id.slice(slashIdx + 1);
    const lastNs = namespace.split('.').pop() ?? namespace;
    rel = `skills/${lastNs}/${name}.skill.yaml`;
  }
  return treeDir ? `${treeDir.replace(/[\\/]+$/, '')}/${rel}` : rel;
}

/**
 * Suggest a default path for a new theme file, optionally rooted at a tree dir.
 * Themes are often shared across trees, so the tree-dir is optional.
 */
export function suggestThemePath(id: string, treeDir?: string): string {
  const rel = `themes/${id}.theme.yaml`;
  return treeDir ? `${treeDir.replace(/[\\/]+$/, '')}/${rel}` : rel;
}

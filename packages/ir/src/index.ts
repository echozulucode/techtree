// @echozedlabs/techtree-ir
// Intermediate representation produced by the compiler and consumed by every
// downstream tool (viewer, future API server, lint, future graphical editor).
//
// IR is versioned independently from source schema. See docs/high-level-plan.md §1.7.
//
// The IR is domain-agnostic: it describes a typed dependency graph with optional
// phase BANDS and named TRACKS, plus an open `data` bag for profile-specific
// fields (the skill profile packs difficulty / effort / workflow / resources into
// `data`). See docs/overview.md and docs/techtree-extraction.md.

export const IR_VERSION = 1 as const;

export interface IRTree {
  id: string;
  title: string;
  version?: string;
  description?: string;
  default_theme?: string;
  /**
   * Id of the profile that compiled this IR (e.g. 'skill', 'delivery',
   * 'capability'). Lets consumers pick the matching status model and detail
   * presentation without guessing from `data`. Additive since 0.2.
   */
  profile?: string;
}

export interface IRNode {
  /** Stable namespaced identifier. See high-level-plan §1.2. */
  id: string;
  title: string;
  description?: string;

  // Taxonomy
  category?: string;
  tags: string[];
  /** Phase band (Civ-IV "era" / timeline column / project phase). Layout groups by this. */
  band?: string;
  /** Named progression this node belongs to (skill "path", delivery "stream"). */
  track?: string;

  // Computed by layout. Always present in the IR.
  position: { x: number; y: number };
  size: { width: number; height: number };

  // Authoring hints preserved through compilation
  pinned: boolean;
  aliases: string[];

  /**
   * Profile-specific fields. Opaque to the engine; consumers that understand a
   * profile cast this to the profile's data type (e.g. `SkillData` from
   * @echozedlabs/techtree-schema). Always an object, possibly empty.
   */
  data: Record<string, unknown>;
}

export interface IREdge {
  from: string;
  to: string;
  kind: 'requires' | 'recommends';
  /**
   * Any-of group id, scoped to the edge's `to` node (only on `requires` edges).
   *
   * `requires` edges into the same node that share a `group` form a
   * disjunction — satisfying ONE member satisfies the group. `requires` edges
   * without a `group` are each individually required (conjunction). A node's
   * prerequisites are met when every ungrouped prerequisite and at least one
   * member of every group is satisfied. See ADR-0006. Additive since 0.2.
   */
  group?: string;
}

export interface IRBand {
  id: string;
  title?: string;
  order: number;
}

export interface IRTrack {
  id: string;
  title?: string;
  description?: string;
  /** Declared position of the track in tree.yaml (0-based). Additive since 0.2. */
  order?: number;
  /** Optional author colour for the track's lane / chip (any CSS colour). */
  color?: string;
  /**
   * Swimlane geometry, present when the tree opts into lane layout
   * (`layout.lanes: true`): every node on this track sits inside
   * [y, y + height) in canvas coordinates.
   */
  lane?: { y: number; height: number };
}

export interface IRMeta {
  source_count: number;
  node_count: number;
  edge_count: number;
}

export interface IR {
  ir_version: typeof IR_VERSION;
  tree: IRTree;
  nodes: IRNode[];
  edges: IREdge[];
  bands: IRBand[];
  tracks: IRTrack[];
  meta: IRMeta;
}

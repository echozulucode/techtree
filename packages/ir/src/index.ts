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

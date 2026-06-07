import { IR_VERSION, type IR, type IRBand, type IREdge, type IRNode } from '@echozedlabs/techtree-ir';
import type { SkillData, Theme } from '@echozedlabs/techtree-schema';
import { emptyState, type TreeState } from '@echozedlabs/techtree-state';

export interface PreviewArtifact {
  ir: IR;
  state: TreeState;
}

/**
 * Build a synthetic IR + state that exercises every category in the theme,
 * spread across four eras, with examples of all five statuses, both edge kinds,
 * and a range of difficulty values. Used by `skilltree theme preview` so theme
 * authors can iterate without authoring a real tree.
 *
 * Layout: each category gets its own row across the four era columns.
 * Status assignment cycles through the five values so every theme color is
 * visible at a glance.
 */
export function generateThemePreview(theme: Theme): PreviewArtifact {
  const categories = themeCategories(theme);
  const bands: IRBand[] = [
    { id: 'foundations', title: 'Foundations', order: 0 },
    { id: 'core', title: 'Core', order: 1 },
    { id: 'advanced', title: 'Advanced', order: 2 },
    { id: 'mastery', title: 'Mastery', order: 3 },
  ];

  const COL_W = 240;
  const COL_GAP = 60;
  const ROW_H = 100;
  const ROW_GAP = 20;
  const NODE_W = 220;
  const NODE_H = 88;
  const TOP_PAD = 60; // for era banners

  const nodes: IRNode[] = [];
  // For each category (row) × band (column), emit one node.
  categories.forEach((category, rowIdx) => {
    bands.forEach((band, colIdx) => {
      const id = `preview.${band.id}/${category}-${rowIdx}`;
      const x = colIdx * (COL_W + COL_GAP);
      const y = TOP_PAD + rowIdx * (ROW_H + ROW_GAP);
      const data: SkillData = {
        difficulty: Math.min(5, colIdx + 1),
        estimated_hours: 4 + colIdx * 12,
        workflow: {
          validation_criteria: ['Demonstrates rendering of this category at this band.'],
          evidence_requirements: [],
        },
        learning_resources: [],
      };
      nodes.push({
        id,
        title: `${capitalize(category)} ${roman(colIdx + 1)}`,
        description: `Synthetic preview node — category "${category}" at band "${band.id}".`,
        category,
        tags: ['preview', category],
        band: band.id,
        ...(rowIdx === 0 ? { track: 'showcase' } : {}),
        position: { x, y },
        size: { width: NODE_W, height: NODE_H },
        pinned: false,
        aliases: [],
        data: data as unknown as Record<string, unknown>,
      });
    });
  });

  // Edges: connect each node to the next-band node in the same row (requires)
  // and to one diagonal partner (recommends) for visual variety.
  const edges: IREdge[] = [];
  const erasCount = bands.length;
  categories.forEach((_category, rowIdx) => {
    for (let colIdx = 0; colIdx < erasCount - 1; colIdx++) {
      const from = nodes[rowIdx * erasCount + colIdx]!;
      const to = nodes[rowIdx * erasCount + colIdx + 1]!;
      edges.push({ from: from.id, to: to.id, kind: 'requires' });
    }
    if (rowIdx + 1 < categories.length) {
      // Diagonal recommends from this row's "core" to the next row's "advanced".
      const from = nodes[rowIdx * erasCount + 1]!;
      const to = nodes[(rowIdx + 1) * erasCount + 2]!;
      edges.push({ from: from.id, to: to.id, kind: 'recommends' });
    }
  });
  edges.sort((a, b) => {
    const x = a.from.localeCompare(b.from);
    if (x !== 0) return x;
    return a.to.localeCompare(b.to);
  });

  const ir: IR = {
    ir_version: IR_VERSION,
    tree: {
      id: `theme-preview-${theme.id}`,
      title: `Theme Preview — ${theme.title ?? theme.id}`,
      description: `Synthetic exercise tree for theme "${theme.id}". Every category appears in every era.`,
      default_theme: theme.id,
    },
    nodes,
    edges,
    bands,
    tracks: [{ id: 'showcase', title: 'Showcase Path' }],
    meta: { source_count: 0, node_count: nodes.length, edge_count: edges.length },
  };

  // State that paints every writable status across the preview.
  const state = emptyState('preview', ir.tree.id, 'showcase');
  // Status cycle: covers all writable statuses (Phase 3 + Phase 5).
  // locked/available are derived so we don't set them.
  // For each row, set explicit statuses on alternating eras so every theme
  // status color appears at least once.
  const cycle = ['achieved', 'in_progress', 'submitted', 'pending_approval', 'rejected'] as const;
  nodes.forEach((n, i) => {
    // Era-0 nodes stay available (default for no-prereqs).
    // Era-1+ alternate through the cycle so they don't all derive to "locked".
    if (n.band === 'foundations') return;
    const status = cycle[i % cycle.length]!;
    // For "in_progress"/"submitted", we want the upstream achieved so
    // the node is visually unblocked. Force the prerequisite to achieved.
    const upstreamId = `preview.${prevEra(n.band!)}/${n.category}-${rowIndexOf(n.id)}`;
    state.skills[upstreamId] = { status: 'achieved' };
    state.skills[n.id] = { status };
  });

  return { ir, state };
}

function themeCategories(theme: Theme): string[] {
  const declared = Object.keys(theme.categories ?? {});
  if (declared.length > 0) return declared.slice(0, 8); // cap at 8 for readability
  // Fallback if the theme doesn't override per-category styling: pick a sensible default set.
  return ['foundations', 'core', 'advanced', 'tools', 'leadership'];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function roman(n: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][n - 1] ?? String(n);
}

function prevEra(era: string): string {
  return { core: 'foundations', advanced: 'core', mastery: 'advanced' }[era] ?? 'foundations';
}

function rowIndexOf(id: string): number {
  // id format: preview.<era>/<category>-<rowIdx>
  const m = /-(\d+)$/.exec(id);
  return m ? parseInt(m[1]!, 10) : 0;
}

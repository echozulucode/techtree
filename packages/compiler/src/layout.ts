import ElkConstructor from 'elkjs/lib/elk.bundled.js';
import type { ValidatedTree } from './validate.js';

export interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  positions: Map<string, NodeBox>;
  /** Swimlane geometry per declared track, when `layout.lanes` is on. */
  lanes?: Map<string, { y: number; height: number }>;
}

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 88;

// Swimlane spacing (canvas units). Rows within a lane are one node tall.
const LANE_PADDING = 24;
const LANE_GAP = 16;
const LANE_ROW_GAP = 24;
const LANE_COLUMN_GAP = 16;

/**
 * Run ELK layered layout. Position hints from source are honored via fixed-position
 * constraints. Era partitioning is applied when the tree declares an `eras` list.
 * Layout is deterministic: a fixed random seed is set in layoutOptions.
 */
export async function layoutGraph(v: ValidatedTree): Promise<LayoutResult> {
  const elk = new ElkConstructor();

  // Band → partition index, based on declared order.
  const bandPartition = new Map<string, number>();
  const sortedBands = [...(v.tree.eras ?? [])].sort((a, b) => a.order - b.order);
  sortedBands.forEach((e, i) => bandPartition.set(e.id, i));

  // Build the ELK graph.
  const children = v.nodes.map((s) => {
    const opts: Record<string, string> = {};
    if (s.node.position) {
      opts['org.eclipse.elk.position'] = `(${s.node.position.x},${s.node.position.y})`;
    }
    if (s.node.band && bandPartition.has(s.node.band)) {
      opts['org.eclipse.elk.partitioning.partition'] = String(bandPartition.get(s.node.band));
    }
    return {
      id: s.node.id,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
      ...(Object.keys(opts).length > 0 ? { layoutOptions: opts } : {}),
    };
  });

  // Map alias → canonical id so edges are emitted against canonical IDs.
  const aliasToId = new Map<string, string>();
  for (const s of v.nodes) {
    for (const a of s.node.aliases) aliasToId.set(a, s.node.id);
  }
  const resolveRef = (ref: string): string => aliasToId.get(ref) ?? ref;

  // Sort nodes by id so the edge order is deterministic.
  const nodesSorted = [...v.nodes].sort((a, b) => a.node.id.localeCompare(b.node.id));
  const edges: { id: string; sources: string[]; targets: string[] }[] = [];
  let edgeSeq = 0;
  for (const s of nodesSorted) {
    // Any-of members are laid out like any other prerequisite (ADR-0006), so
    // alternatives sit upstream of the node they unlock.
    const reqs = [...new Set([...s.node.requires, ...(s.node.requiresAnyOf ?? []).flat()])].sort();
    for (const ref of reqs) {
      edges.push({
        id: `e${edgeSeq++}`,
        sources: [resolveRef(ref)],
        targets: [s.node.id],
      });
    }
  }

  const graph = {
    id: 'root',
    layoutOptions: {
      'org.eclipse.elk.algorithm': 'layered',
      'org.eclipse.elk.direction': 'RIGHT',
      'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'org.eclipse.elk.spacing.nodeNode': '40',
      'org.eclipse.elk.randomSeed': '1',
      ...(bandPartition.size > 0 ? { 'org.eclipse.elk.partitioning.activate': 'true' } : {}),
    },
    children,
    edges,
  };

  const laidOut = await elk.layout(graph);
  const positions = new Map<string, NodeBox>();
  for (const child of laidOut.children ?? []) {
    positions.set(child.id, {
      x: child.x ?? 0,
      y: child.y ?? 0,
      width: child.width ?? DEFAULT_NODE_WIDTH,
      height: child.height ?? DEFAULT_NODE_HEIGHT,
    });
  }

  // Sanity: any node missing from the layout (e.g., disconnected) gets a fallback slot.
  let fallbackY = 0;
  for (const s of v.nodes) {
    if (!positions.has(s.node.id)) {
      positions.set(s.node.id, {
        x: -DEFAULT_NODE_WIDTH - 80,
        y: fallbackY,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
      });
      fallbackY += DEFAULT_NODE_HEIGHT + 20;
    }
  }

  if (v.tree.layout?.lanes) {
    const lanes = assignLanes(v, positions);
    return { positions, lanes };
  }
  return { positions };
}

/**
 * Swimlane post-pass: keep ELK's x (band columns + layering) and re-assign y so
 * every node sits in its track's lane, lanes stacked in declared track order.
 * Within a lane, nodes are packed greedily into rows (ordered by ELK's y, which
 * carries its crossing minimisation) so nodes never overlap horizontally.
 * Nodes with an author `position` keep it. Untracked nodes share a final,
 * unnamed lane. Deterministic: depends only on ELK output and declared order.
 */
function assignLanes(
  v: ValidatedTree,
  positions: Map<string, NodeBox>,
): Map<string, { y: number; height: number }> {
  const declared = (v.tree.paths ?? []).map((p) => p.id);
  const declaredSet = new Set(declared);
  const UNTRACKED = '\u0000untracked';
  const members = new Map<string, string[]>();
  for (const id of declared) members.set(id, []);
  const pinnedIds = new Set<string>();
  for (const s of v.nodes) {
    if (s.node.position) {
      pinnedIds.add(s.node.id);
      continue;
    }
    const lane = s.node.track && declaredSet.has(s.node.track) ? s.node.track : UNTRACKED;
    if (!members.has(lane)) members.set(lane, []);
    members.get(lane)!.push(s.node.id);
  }

  const order = [...declared, ...(members.has(UNTRACKED) ? [UNTRACKED] : [])];
  const lanes = new Map<string, { y: number; height: number }>();
  let laneTop = 0;
  for (const laneId of order) {
    const ids = members.get(laneId) ?? [];
    const boxes = ids
      .map((id) => ({ id, box: positions.get(id)! }))
      .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x || a.id.localeCompare(b.id));
    const rows: { x0: number; x1: number }[][] = [];
    const rowOf = new Map<string, number>();
    for (const { id, box } of boxes) {
      const x0 = box.x - LANE_COLUMN_GAP / 2;
      const x1 = box.x + box.width + LANE_COLUMN_GAP / 2;
      let r = rows.findIndex((row) => row.every((iv) => x1 <= iv.x0 || x0 >= iv.x1));
      if (r === -1) {
        r = rows.length;
        rows.push([]);
      }
      rows[r]!.push({ x0, x1 });
      rowOf.set(id, r);
    }
    const rowCount = Math.max(1, rows.length);
    const height =
      LANE_PADDING * 2 + rowCount * DEFAULT_NODE_HEIGHT + (rowCount - 1) * LANE_ROW_GAP;
    for (const { id, box } of boxes) {
      const r = rowOf.get(id)!;
      positions.set(id, {
        ...box,
        y: laneTop + LANE_PADDING + r * (DEFAULT_NODE_HEIGHT + LANE_ROW_GAP),
      });
    }
    if (laneId !== UNTRACKED) lanes.set(laneId, { y: laneTop, height });
    laneTop += height + LANE_GAP;
  }
  return lanes;
}

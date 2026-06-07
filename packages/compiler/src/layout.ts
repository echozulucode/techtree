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
}

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 88;

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
    const reqs = [...s.node.requires].sort();
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

  return { positions };
}

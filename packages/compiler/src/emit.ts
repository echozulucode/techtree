import {
  IR_VERSION,
  type IR,
  type IRBand,
  type IREdge,
  type IRNode,
  type IRTrack,
} from '@echozedlabs/techtree-ir';
import type { ValidatedTree } from './validate.js';
import type { LayoutResult } from './layout.js';

export function buildIR(v: ValidatedTree, layout: LayoutResult): IR {
  // Map alias → canonical id for edge emission.
  const aliasToId = new Map<string, string>();
  for (const s of v.nodes) {
    for (const a of s.node.aliases) aliasToId.set(a, s.node.id);
  }
  const canon = (ref: string): string => aliasToId.get(ref) ?? ref;

  const nodes: IRNode[] = v.nodes
    .slice()
    .sort((a, b) => a.node.id.localeCompare(b.node.id))
    .map((s) => {
      const n = s.node;
      const box = layout.positions.get(n.id)!;
      const node: IRNode = {
        id: n.id,
        title: n.title,
        ...(n.description !== undefined ? { description: n.description } : {}),
        ...(n.category !== undefined ? { category: n.category } : {}),
        tags: [...n.tags].sort(),
        ...(n.band !== undefined ? { band: n.band } : {}),
        ...(n.track !== undefined ? { track: n.track } : {}),
        position: { x: box.x, y: box.y },
        size: { width: box.width, height: box.height },
        pinned: n.pinned,
        aliases: [...n.aliases].sort(),
        data: n.data,
      };
      return node;
    });

  const edges: IREdge[] = [];
  for (const s of v.nodes) {
    for (const ref of s.node.requires) {
      edges.push({ from: canon(ref), to: s.node.id, kind: 'requires' });
    }
    for (const ref of s.node.recommends) {
      edges.push({ from: canon(ref), to: s.node.id, kind: 'recommends' });
    }
  }
  edges.sort((a, b) => {
    const x = a.from.localeCompare(b.from);
    if (x !== 0) return x;
    const y = a.to.localeCompare(b.to);
    if (y !== 0) return y;
    return a.kind.localeCompare(b.kind);
  });

  const bands: IRBand[] = [...(v.tree.eras ?? [])]
    .map((e) => ({
      id: e.id,
      ...(e.title !== undefined ? { title: e.title } : {}),
      order: e.order,
    }))
    .sort((a, b) => a.order - b.order);

  const tracks: IRTrack[] = [...(v.tree.paths ?? [])]
    .map((p) => ({
      id: p.id,
      ...(p.title !== undefined ? { title: p.title } : {}),
      ...(p.description !== undefined ? { description: p.description } : {}),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const ir: IR = {
    ir_version: IR_VERSION,
    tree: {
      id: v.tree.tree.id,
      title: v.tree.tree.title,
      ...(v.tree.tree.version !== undefined ? { version: v.tree.tree.version } : {}),
      ...(v.tree.tree.description !== undefined ? { description: v.tree.tree.description } : {}),
      ...(v.tree.tree.default_theme !== undefined
        ? { default_theme: v.tree.tree.default_theme }
        : {}),
    },
    nodes,
    edges,
    bands,
    tracks,
    meta: {
      source_count: v.nodes.length,
      node_count: nodes.length,
      edge_count: edges.length,
    },
  };

  return ir;
}

/**
 * JSON.stringify with recursively sorted object keys.
 * Required by commitment §1.3 — IR output is byte-identical for identical inputs.
 */
export function stableStringify(value: unknown, indent = 2): string {
  return JSON.stringify(value, sortKeysReplacer, indent);
}

function sortKeysReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

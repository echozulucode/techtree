import { IR_VERSION, type IR, type IRBand, type IREdge, type IRNode } from '@echozedlabs/techtree-ir';
import type { SkillData } from '@echozedlabs/techtree-schema';

export interface StressOptions {
  /** Total number of skills. */
  nodes: number;
  /** Number of era columns. */
  eras: number;
}

/**
 * Generate a synthetic IR for renderer perf measurement.
 * Deterministic: same options yield byte-identical IR.
 *
 * v2 layout:
 *  - Variable density per era (denser at foundations, sparser at top)
 *  - Each era wraps into a roughly-square grid (sqrt(count) cols)
 *  - All eras occupy a fixed horizontal slot so era banners align
 *  - Deterministic difficulty derived from era index
 *
 * Used by Phase 1.5 renderer bake-off. See docs/decisions/renderer-bakeoff.md.
 */
export function generateStress(opts: StressOptions): IR {
  const totalNodes = Math.max(1, Math.floor(opts.nodes));
  const eraCount = Math.max(1, Math.floor(opts.eras));

  const eras: IRBand[] = Array.from({ length: eraCount }, (_, i) => ({
    id: `era-${i}`,
    title: eraTitle(i, eraCount),
    order: i,
  }));

  // Density profile: pyramid favoring early eras. Sum to totalNodes.
  const counts = computeDensity(eraCount, totalNodes);

  // Compute the max number of grid columns any era needs, so era slot width is uniform.
  const maxCols = Math.max(...counts.map((c) => Math.ceil(Math.sqrt(c))));
  const NODE_W = 220;
  const NODE_H = 88;
  const COL_GAP = 30;
  const ROW_GAP = 32;
  const ERA_GAP = 80;
  const ERA_BANNER_HEIGHT = 60;

  const eraSlotWidth = maxCols * NODE_W + (maxCols - 1) * COL_GAP + ERA_GAP;

  const nodes: IRNode[] = [];
  const eraNodeStartIdx: number[] = []; // first node index for each era

  for (let e = 0; e < eraCount; e++) {
    eraNodeStartIdx.push(nodes.length);
    const count = counts[e]!;
    const cols = Math.ceil(Math.sqrt(count));
    const eraX = e * eraSlotWidth;
    const difficulty = Math.max(
      1,
      Math.min(5, Math.round(1 + (e / Math.max(1, eraCount - 1)) * 4)),
    );
    const category = categoryFor(e, eraCount);

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = eraX + col * (NODE_W + COL_GAP);
      const y = ERA_BANNER_HEIGHT + row * (NODE_H + ROW_GAP);
      const id = `stress.era${e}/skill-${i.toString().padStart(4, '0')}`;
      const data: SkillData = {
        difficulty,
        estimated_hours: 4 + (i % 8) * 2,
        workflow: {
          validation_criteria: [],
          evidence_requirements: [],
        },
        learning_resources: [],
      };
      nodes.push({
        id,
        title: `${eraShortName(e, eraCount)} skill #${i}`,
        description: `Synthetic stress-fixture node ${i} in ${eraTitle(e, eraCount)}.`,
        category,
        tags: [],
        band: `era-${e}`,
        position: { x, y },
        size: { width: NODE_W, height: NODE_H },
        pinned: false,
        aliases: [],
        data: data as unknown as Record<string, unknown>,
      });
    }
  }

  // Deterministic edges: each non-era-0 node has 1-2 requires from previous era.
  const edges: IREdge[] = [];
  for (let e = 1; e < eraCount; e++) {
    const startHere = eraNodeStartIdx[e]!;
    const endHere = e + 1 < eraCount ? eraNodeStartIdx[e + 1]! : nodes.length;
    const startPrev = eraNodeStartIdx[e - 1]!;
    const endPrev = startHere;
    const prevCount = endPrev - startPrev;
    if (prevCount === 0) continue;
    for (let i = startHere; i < endHere; i++) {
      const idx = i - startHere;
      const n = nodes[i]!;
      const numReqs = 1 + ((idx + e) % 2);
      for (let r = 0; r < numReqs; r++) {
        const prereqOffset = (idx * 7 + r * 13 + e * 3) % prevCount;
        const prereq = nodes[startPrev + prereqOffset]!;
        edges.push({ from: prereq.id, to: n.id, kind: 'requires' });
      }
    }
  }

  // Stable sort.
  edges.sort((a, b) => {
    const x = a.from.localeCompare(b.from);
    if (x !== 0) return x;
    return a.to.localeCompare(b.to);
  });

  const ir: IR = {
    ir_version: IR_VERSION,
    tree: {
      id: `stress-${totalNodes}`,
      title: `Stress fixture (${totalNodes} skills, ${eraCount} eras)`,
    },
    nodes,
    edges,
    bands: eras,
    tracks: [],
    meta: {
      source_count: 0,
      node_count: nodes.length,
      edge_count: edges.length,
    },
  };

  return ir;
}

function computeDensity(eras: number, total: number): number[] {
  // Geometric falloff: each era has 0.8x the previous era's weight.
  const weights = Array.from({ length: eras }, (_, i) => Math.pow(0.8, i));
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.max(1, Math.round((w / sum) * total)));
  // Adjust last era to hit total exactly.
  const drift = total - counts.reduce((a, b) => a + b, 0);
  counts[counts.length - 1] = Math.max(1, counts[counts.length - 1]! + drift);
  return counts;
}

function eraTitle(i: number, total: number): string {
  if (total <= 4) return ['Ancient', 'Classical', 'Medieval', 'Modern'][i] ?? `Era ${i}`;
  if (total <= 8)
    return (
      [
        'Ancient',
        'Classical',
        'Medieval',
        'Renaissance',
        'Industrial',
        'Modern',
        'Atomic',
        'Future',
      ][i] ?? `Era ${i}`
    );
  return `Era ${i}`;
}

function eraShortName(i: number, total: number): string {
  const t = eraTitle(i, total);
  return t.slice(0, 6);
}

function categoryFor(eraIdx: number, eraCount: number): string {
  const phase = eraIdx / Math.max(1, eraCount - 1);
  if (phase < 0.25) return 'foundations';
  if (phase < 0.55) return 'core';
  if (phase < 0.8) return 'advanced';
  return 'leadership';
}

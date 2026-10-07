import { useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  useViewport,
  type Edge,
  type Node,
} from '@xyflow/react';
import { skillStatusModel } from '@echozedlabs/techtree-state/status-model';
import type { RendererProps } from '../../renderer.js';
import {
  canvasBackground,
  canvasGrid,
  edgeColor,
  edgeDashed,
  edgeWidth,
} from '../../shell/theme-utils.js';
import { statusColor } from '../../shell/status-style.js';
import { GraphNode, LaneNode, type GraphNodeData, type LaneNodeData } from './GraphNode.js';

// NOTE: React Flow's stylesheet is NOT imported here — it ships inside
// `@echozedlabs/techtree-viewer/style.css` so the module graph stays free of
// CSS imports (SSR / Node ESM safe). Hosts import the stylesheet once.

const nodeTypes = { skill: GraphNode, graph: GraphNode, lane: LaneNode };

/** Horizontal room left of the first column for lane titles (canvas units). */
const LANE_GUTTER = 190;
const LANE_PAD_RIGHT = 40;

function ViewportReporter({
  onChange,
}: {
  onChange: (v: { x: number; y: number; zoom: number }) => void;
}) {
  const vp = useViewport();
  useEffect(() => {
    onChange({ x: vp.x, y: vp.y, zoom: vp.zoom });
  }, [vp.x, vp.y, vp.zoom, onChange]);
  return null;
}

function FocusOnNode({
  nodeId,
  irNodeById,
}: {
  nodeId: string | null;
  irNodeById: Map<string, { x: number; y: number; w: number; h: number }>;
}) {
  const rf = useReactFlow();
  useEffect(() => {
    if (!nodeId) return;
    const n = irNodeById.get(nodeId);
    if (!n) return;
    void rf.setCenter(n.x + n.w / 2, n.y + n.h / 2, { zoom: 0.9, duration: 400 });
  }, [nodeId, irNodeById, rf]);
  return null;
}

export function ReactFlowRenderer({
  ir,
  selectedId,
  relatedIds,
  nodeStatus,
  statusModel = skillStatusModel,
  visibleIds,
  filterMode = 'dim',
  theme,
  focusOnNodeId,
  onSelectNode,
  onClearSelection,
  onViewportChange,
  showMiniMap = true,
  showControls = true,
}: RendererProps) {
  const irNodeById = useMemo(() => {
    const m = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const n of ir.nodes) {
      m.set(n.id, { x: n.position.x, y: n.position.y, w: n.size.width, h: n.size.height });
    }
    return m;
  }, [ir]);

  // Swimlanes (only when the IR carries lane geometry). They never move or
  // hide, so filtering keeps every branch in place.
  const laneNodes = useMemo<Node<LaneNodeData>[]>(() => {
    const lanes = ir.tracks.filter((t) => t.lane);
    if (lanes.length === 0 || ir.nodes.length === 0) return [];
    let minX = Infinity;
    let maxX = -Infinity;
    for (const n of ir.nodes) {
      minX = Math.min(minX, n.position.x);
      maxX = Math.max(maxX, n.position.x + n.size.width);
    }
    const x = minX - LANE_GUTTER;
    const width = maxX - x + LANE_PAD_RIGHT;
    return lanes
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((t) => ({
        id: `__lane:${t.id}`,
        type: 'lane',
        position: { x, y: t.lane!.y },
        width,
        height: t.lane!.height,
        zIndex: -1,
        draggable: false,
        selectable: false,
        focusable: false,
        data: { title: t.title ?? t.id, ...(t.color ? { color: t.color } : {}), theme },
      }));
  }, [ir, theme]);

  const bandTitles = useMemo(
    () => new Map(ir.bands.map((b) => [b.id, b.title ?? b.id])),
    [ir],
  );

  const { nodes, edges } = useMemo(() => {
    const filteredOut = (id: string): boolean => visibleIds !== null && !visibleIds.has(id);
    const hidden = (id: string): boolean => filterMode === 'hide' && filteredOut(id);
    const isDim = (id: string): boolean => {
      if (selectedId !== null && !relatedIds.has(id)) return true;
      if (filterMode === 'dim' && filteredOut(id)) return true;
      return false;
    };

    const graphNodes: Node<GraphNodeData>[] = ir.nodes.map((n) => ({
      id: n.id,
      type: 'graph',
      position: { x: n.position.x, y: n.position.y },
      // Fixed dimensions let React Flow render (and server-render) without measuring.
      width: n.size.width,
      height: n.size.height,
      draggable: false,
      hidden: hidden(n.id),
      data: {
        irNode: n,
        status: nodeStatus.get(n.id) ?? statusModel.available.id,
        statusModel,
        ...(n.band ? { bandTitle: bandTitles.get(n.band) ?? n.band } : {}),
        selected: n.id === selectedId,
        dim: isDim(n.id),
        theme,
      },
    }));

    const edges: Edge[] = ir.edges.map((e, idx) => {
      const anyOf = e.group !== undefined;
      return {
        id: `e${idx}`,
        source: e.from,
        target: e.to,
        type: 'default',
        hidden: hidden(e.from) || hidden(e.to),
        ...(anyOf
          ? {
              label: 'or',
              labelStyle: { fontSize: 10, fill: 'var(--techtree-edge-label, #c9c4b5)' },
              labelBgStyle: { fill: canvasBackground(theme), fillOpacity: 0.85 },
              labelBgPadding: [3, 1] as [number, number],
              data: { group: e.group },
            }
          : {}),
        style: {
          stroke: edgeColor(theme, e.kind),
          strokeWidth: edgeWidth(theme, e.kind),
          strokeDasharray: anyOf ? '2 5' : edgeDashed(theme, e.kind) ? '6 4' : undefined,
          // Constant on-screen width: edges stay legible when a large tree is zoomed out.
          vectorEffect: 'non-scaling-stroke',
          opacity: isDim(e.from) || isDim(e.to) ? 0.12 : 0.85,
        },
      };
    });

    return { nodes: [...laneNodes, ...graphNodes] as Node[], edges };
  }, [ir, selectedId, relatedIds, nodeStatus, statusModel, visibleIds, filterMode, theme, laneNodes, bandTitles]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => {
        if (node.type === 'lane') onClearSelection();
        else onSelectNode(node.id);
      }}
      onPaneClick={() => onClearSelection()}
      fitView
      minZoom={0.04}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      style={{ background: canvasBackground(theme) }}
    >
      <Background color={canvasGrid(theme)} gap={32} />
      {showControls && <Controls showInteractive={false} />}
      {showMiniMap && (
        <MiniMap
          nodeColor={(n) =>
            n.type === 'lane'
              ? 'transparent'
              : statusColor(theme, nodeStatus.get(n.id) ?? statusModel.available.id, statusModel)
          }
          maskColor="var(--techtree-minimap-mask, rgba(20,25,40,0.7))"
          style={{ background: canvasBackground(theme) }}
          pannable
          zoomable
        />
      )}
      <ViewportReporter onChange={onViewportChange} />
      <FocusOnNode nodeId={focusOnNodeId} irNodeById={irNodeById} />
    </ReactFlow>
  );
}

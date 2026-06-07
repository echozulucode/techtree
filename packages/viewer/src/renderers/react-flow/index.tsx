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
import '@xyflow/react/dist/style.css';
import type { RendererProps } from '../../renderer.js';
import {
  canvasBackground,
  canvasGrid,
  edgeColor,
  edgeDashed,
  edgeWidth,
} from '../../shell/theme-utils.js';
import { SkillNode, type SkillNodeData } from './SkillNode.js';

const nodeTypes = { skill: SkillNode };

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
    rf.setCenter(n.x + n.w / 2, n.y + n.h / 2, { zoom: 0.9, duration: 400 });
  }, [nodeId, irNodeById, rf]);
  return null;
}

export function ReactFlowRenderer({
  ir,
  selectedId,
  relatedIds,
  nodeStatus,
  visibleIds,
  theme,
  focusOnNodeId,
  onSelectNode,
  onClearSelection,
  onViewportChange,
}: RendererProps) {
  const irNodeById = useMemo(() => {
    const m = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const n of ir.nodes) {
      m.set(n.id, { x: n.position.x, y: n.position.y, w: n.size.width, h: n.size.height });
    }
    return m;
  }, [ir]);

  const { nodes, edges } = useMemo(() => {
    const isDim = (id: string): boolean => {
      if (selectedId !== null && !relatedIds.has(id)) return true;
      if (visibleIds !== null && !visibleIds.has(id)) return true;
      return false;
    };

    const nodes: Node<SkillNodeData>[] = ir.nodes.map((n) => ({
      id: n.id,
      type: 'skill',
      position: { x: n.position.x, y: n.position.y },
      draggable: false,
      data: {
        irNode: n,
        status: nodeStatus.get(n.id) ?? 'available',
        selected: n.id === selectedId,
        dim: isDim(n.id),
        theme,
      },
    }));

    const edges: Edge[] = ir.edges.map((e, idx) => ({
      id: `e${idx}`,
      source: e.from,
      target: e.to,
      type: 'default',
      style: {
        stroke: edgeColor(theme, e.kind),
        strokeWidth: edgeWidth(theme, e.kind),
        strokeDasharray: edgeDashed(theme, e.kind) ? '6 4' : undefined,
        opacity: isDim(e.from) || isDim(e.to) ? 0.12 : 0.85,
      },
    }));

    return { nodes, edges };
  }, [ir, selectedId, relatedIds, nodeStatus, visibleIds, theme]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelectNode(node.id)}
      onPaneClick={() => onClearSelection()}
      fitView
      minZoom={0.04}
      maxZoom={2}
      nodesDraggable={false}
      proOptions={{ hideAttribution: true }}
      style={{ background: canvasBackground(theme) }}
    >
      <Background color={canvasGrid(theme)} gap={32} />
      <Controls />
      <MiniMap
        nodeColor={() => '#5a7399'}
        maskColor="rgba(20,25,40,0.7)"
        style={{ background: canvasBackground(theme) }}
      />
      <ViewportReporter onChange={onViewportChange} />
      <FocusOnNode nodeId={focusOnNodeId} irNodeById={irNodeById} />
    </ReactFlow>
  );
}

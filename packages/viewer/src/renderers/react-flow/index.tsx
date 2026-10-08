import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  useStore,
  useViewport,
  type Edge,
  type FitViewOptions,
  type Node,
} from '@xyflow/react';
import { skillStatusModel } from '@echozedlabs/techtree-state/status-model';
import type { RendererFitViewOptions, RendererInitialCamera, RendererProps } from '../../renderer.js';
import { laneSpan } from '../../shell/lane-geometry.js';
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

function toFitViewOptions(o: RendererFitViewOptions | undefined): FitViewOptions | undefined {
  if (!o) return undefined;
  const { nodeIds, ...rest } = o;
  return { ...rest, ...(nodeIds ? { nodes: nodeIds.map((id) => ({ id })) } : {}) };
}

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
  onFocus,
}: {
  nodeId: string | null;
  irNodeById: Map<string, { x: number; y: number; w: number; h: number }>;
  onFocus: () => void;
}) {
  const rf = useReactFlow();
  useEffect(() => {
    if (!nodeId) return;
    const n = irNodeById.get(nodeId);
    if (!n) return;
    onFocus();
    void rf.setCenter(n.x + n.w / 2, n.y + n.h / 2, { zoom: 0.9, duration: 400 });
  }, [nodeId, irNodeById, rf, onFocus]);
  return null;
}

/** Events that mean "the reader is driving the camera now" (canvas, minimap, controls, keyboard). */
const INTERACTION_EVENTS = ['pointerdown', 'wheel', 'touchstart', 'keydown', 'focusin'] as const;

/**
 * Applies `resolve(container size)` as the viewport once the canvas has a
 * size, and again whenever that size changes — until the reader interacts
 * with the canvas (or a focus request moves the camera). After that the
 * camera is never moved by a resize.
 */
function InitialCamera({
  resolve,
  takenOver,
  onApplied,
}: {
  resolve: RendererInitialCamera;
  takenOver: MutableRefObject<boolean>;
  onApplied: () => void;
}) {
  const rf = useReactFlow();
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const domNode = useStore((s) => s.domNode);

  useEffect(() => {
    if (!domNode) return;
    const mark = () => {
      takenOver.current = true;
    };
    for (const type of INTERACTION_EVENTS) domNode.addEventListener(type, mark, { capture: true, passive: true });
    return () => {
      for (const type of INTERACTION_EVENTS) domNode.removeEventListener(type, mark, { capture: true });
    };
  }, [domNode, takenOver]);

  useEffect(() => {
    if (takenOver.current || width <= 0 || height <= 0) return;
    void rf.setViewport(resolve({ width, height }));
    onApplied();
  }, [width, height, resolve, rf, takenOver, onApplied]);
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
  colorMode = 'light',
  minZoom = 0.04,
  maxZoom = 2,
  fitViewOptions,
  initialFitViewOptions,
  initialCamera,
}: RendererProps) {
  // `initialCamera` replaces the initial fit; the canvas stays transparent
  // until it has been applied (no flash of the default viewport).
  const cameraTakenOver = useRef(false);
  const [cameraApplied, setCameraApplied] = useState(false);
  const onCameraApplied = useCallback(() => setCameraApplied(true), []);
  const onFocusRequest = useCallback(() => {
    cameraTakenOver.current = true;
  }, []);

  const fitOptions = useMemo(() => toFitViewOptions(fitViewOptions), [fitViewOptions]);
  const initialFit = useMemo(
    () => toFitViewOptions(initialFitViewOptions ?? fitViewOptions),
    [initialFitViewOptions, fitViewOptions],
  );
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
    const span = laneSpan(ir);
    if (lanes.length === 0 || !span) return [];
    const { x, width } = span;
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
        data: { title: t.title ?? t.id, trackId: t.id, ...(t.color ? { color: t.color } : {}), theme },
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
          opacity: isDim(e.from) || isDim(e.to) ? 'var(--techtree-dim-edge-opacity, 0.12)' : 0.85,
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
      fitView={!initialCamera}
      {...(initialCamera ? {} : { fitViewOptions: initialFit })}
      {...(initialCamera && !cameraApplied ? { className: 'tt-camera-pending' } : {})}
      minZoom={minZoom}
      maxZoom={maxZoom}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      colorMode={colorMode}
      style={{ background: canvasBackground(theme) }}
    >
      <Background color={canvasGrid(theme)} gap={32} />
      {showControls && <Controls showInteractive={false} {...(fitOptions ? { fitViewOptions: fitOptions } : {})} />}
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
      <FocusOnNode nodeId={focusOnNodeId} irNodeById={irNodeById} onFocus={onFocusRequest} />
      {initialCamera && (
        <InitialCamera resolve={initialCamera} takenOver={cameraTakenOver} onApplied={onCameraApplied} />
      )}
    </ReactFlow>
  );
}

import type { CSSProperties } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { IRNode } from '@echozedlabs/techtree-ir';
import type { SkillData, Theme } from '@echozedlabs/techtree-schema';
import { skillStatusModel, type StatusModel } from '@echozedlabs/techtree-state/status-model';
import { difficultyPips, iconFor } from '../../shell/icons.js';
import { KIND_ICONS, statusIcon } from '../../shell/status-icons.js';
import {
  canvasBackground,
  categoryFill,
  fontFamily,
  nodeBorder,
  nodeText,
  selectedBorder,
} from '../../shell/theme-utils.js';
import { onStatusColor, statusColor, statusIconName, statusLabel, statusVisual } from '../../shell/status-style.js';

export type GraphNodeData = {
  irNode: IRNode;
  /** Effective status id under `statusModel`. */
  status: string;
  statusModel?: StatusModel;
  /** Stored status (capability: maturity), for data attributes and labels. */
  storedStatus?: string | null;
  bandTitle?: string;
  selected: boolean;
  dim: boolean;
  theme: Theme;
};

/** @deprecated Use GraphNodeData. Kept for 0.1 renderer authors. */
export type SkillNodeData = GraphNodeData;

function StatusBadge({
  theme,
  status,
  model,
}: {
  theme: Theme;
  status: string;
  model: StatusModel;
}) {
  const Icon = statusIcon(statusIconName(theme, status, model));
  if (!Icon) return null;
  const color = statusColor(theme, status, model);
  const style: CSSProperties = {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: color,
    color: onStatusColor(theme, status, model),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--techtree-badge-ring, #1a1f2e)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
  };
  return (
    <div style={style} title={statusLabel(status, model, theme)} data-testid="status-badge">
      <Icon size={12} strokeWidth={2.75} />
    </div>
  );
}

/**
 * The generic node card: category colour + icon, band label, title, status
 * badge from the status model. Skill nodes add difficulty pips; capability
 * milestones / wonders add a kind marker.
 */
export function GraphNode({ data }: NodeProps<Node<GraphNodeData>>) {
  const { irNode, status, selected, dim, theme, bandTitle } = data;
  const model = data.statusModel ?? skillStatusModel;
  const skill = irNode.data as unknown as Partial<SkillData>;
  const fill = categoryFill(theme, irNode.category);
  const Icon = KIND_ICONS[irNode.category ?? ''] ?? iconFor(irNode.category);
  const pips = difficultyPips(skill.difficulty);
  const sv = statusVisual(theme, status, model);
  const locked = status === model.locked.id;
  // Dimmed (off the highlighted path, or filtered with filterMode 'dim'):
  // muted with colours, not opacity, so the text keeps AA contrast. Every value
  // is a CSS variable with a theme-derived default — hosts restyle dimming by
  // setting --techtree-dim-* on .techtree-root (see style.css).
  const canvas = canvasBackground(theme);
  const text = dim
    ? `var(--techtree-dim-node-text, color-mix(in srgb, ${nodeText(theme)} 75%, ${canvas}))`
    : nodeText(theme);
  // Locked: faded toward the canvas through the background (text stays AA).
  const background = dim
    ? `var(--techtree-dim-node-bg, ${canvas})`
    : sv.muted
      ? `var(--techtree-locked-node-bg, color-mix(in srgb, ${fill} 55%, ${canvas}))`
      : fill;
  const dimBorder = `var(--techtree-dim-node-border, color-mix(in srgb, ${nodeBorder(theme)} 50%, ${canvas}))`;
  const border = selected
    ? `3px solid ${selectedBorder(theme)}`
    : dim
      ? `${sv.borderWidth ?? 2}px solid ${dimBorder}`
      : `${sv.borderWidth ?? 2}px ${sv.muted ? 'dashed' : 'solid'} ${sv.border ?? nodeBorder(theme)}`;
  const footer =
    model.id === skillStatusModel.id
      ? (irNode.category ?? '')
      : statusLabel(data.storedStatus && !model.derivedWhen.includes(data.storedStatus) ? data.storedStatus : status, model, theme);

  return (
    <div
      className={dim ? 'tt-graph-node tt-graph-node-dim' : 'tt-graph-node'}
      data-testid="graph-node"
      data-node-id={irNode.id}
      data-status={status}
      data-stored-status={data.storedStatus ?? undefined}
      data-kind={irNode.category}
      data-dim={dim ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      aria-label={`${irNode.title} — ${statusLabel(status, model, theme)}`}
      style={{
        position: 'relative',
        width: irNode.size.width,
        height: irNode.size.height,
        background,
        border,
        borderRadius: irNode.category === 'milestone' || irNode.category === 'wonder' ? 10 : 4,
        padding: '6px 10px',
        boxSizing: 'border-box',
        color: text,
        fontFamily: fontFamily(theme),
        boxShadow: dim ? 'none' : '2px 2px 0 var(--techtree-node-shadow, rgba(0,0,0,0.4))',
        opacity: dim ? 'var(--techtree-dim-opacity, 1)' : sv.muted ? 'var(--techtree-locked-opacity, 1)' : sv.opacity,
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: '36px 1fr',
        gridTemplateRows: 'auto 1fr auto',
        columnGap: 8,
        rowGap: 2,
        filter: dim ? 'var(--techtree-dim-filter, grayscale(1))' : locked ? 'saturate(0.7)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: nodeBorder(theme) }} />
      <div
        style={{
          gridRow: '1 / span 3',
          alignSelf: 'center',
          justifySelf: 'center',
          color: text,
          opacity: dim ? 1 : 0.9,
        }}
      >
        <Icon size={28} strokeWidth={1.6} />
      </div>
      <div style={{ fontSize: 10, opacity: dim ? 1 : 0.75, letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {(bandTitle ?? irNode.band ?? '').toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.15,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {irNode.title}
      </div>
      <div
        style={{
          fontSize: 10,
          opacity: dim ? 1 : 0.75,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{footer}</span>
        {pips && <span style={{ letterSpacing: 1, fontSize: 9 }}>{pips}</span>}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: nodeBorder(theme) }} />
      <StatusBadge theme={theme} status={status} model={model} />
    </div>
  );
}

/** @deprecated Renamed to GraphNode. */
export const SkillNode = GraphNode;

export type LaneNodeData = {
  title: string;
  color?: string;
  theme: Theme;
};

/** Background swimlane for one track (non-interactive, behind the nodes). */
export function LaneNode({ data, width, height }: NodeProps<Node<LaneNodeData>>) {
  const tint = data.color ?? 'var(--techtree-lane-default, #8c9ab0)';
  return (
    <div
      data-testid="graph-lane"
      style={{
        width,
        height,
        boxSizing: 'border-box',
        borderTop: `1px solid color-mix(in srgb, ${tint} 45%, transparent)`,
        background: `color-mix(in srgb, ${tint} var(--techtree-lane-tint, 10%), transparent)`,
        borderRadius: 6,
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 10,
          width: 150,
          fontFamily: fontFamily(data.theme),
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: nodeText(data.theme),
          opacity: 0.8,
          lineHeight: 1.2,
        }}
      >
        {data.title}
      </div>
    </div>
  );
}

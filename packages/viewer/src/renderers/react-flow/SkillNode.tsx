import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Check, Clock, Hourglass, Lock, Send, X } from 'lucide-react';
import type { IRNode } from '@echozedlabs/techtree-ir';
import type { SkillData, Theme } from '@echozedlabs/techtree-schema';
import type { NodeStatus } from '@echozedlabs/techtree-state';
import { difficultyPips, iconFor } from '../../shell/icons.js';
import {
  categoryFill,
  contrastTextOn,
  fontFamily,
  nodeBorder,
  nodeText,
  selectedBorder,
} from '../../shell/theme-utils.js';
import { statusColor, statusVisual } from '../../shell/status-style.js';

export type SkillNodeData = {
  irNode: IRNode;
  status: NodeStatus;
  selected: boolean;
  dim: boolean;
  theme: Theme;
};

function StatusBadge({ status, color }: { status: NodeStatus; color: string }) {
  const common: React.CSSProperties = {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: color,
    color: contrastTextOn(color),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #1a1f2e',
    boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
  };
  switch (status) {
    case 'achieved':
      return (
        <div style={common} title="Achieved">
          <Check size={12} strokeWidth={3} />
        </div>
      );
    case 'submitted':
      return (
        <div style={common} title="Submitted">
          <Send size={12} strokeWidth={2.5} />
        </div>
      );
    case 'pending_approval':
      return (
        <div style={common} title="Pending approval">
          <Hourglass size={12} strokeWidth={2.5} />
        </div>
      );
    case 'rejected':
      return (
        <div style={common} title="Rejected">
          <X size={13} strokeWidth={3} />
        </div>
      );
    case 'in_progress':
      return (
        <div style={common} title="In progress">
          <Clock size={12} strokeWidth={2.5} />
        </div>
      );
    case 'locked':
      return (
        <div style={common} title="Locked">
          <Lock size={11} strokeWidth={2.5} />
        </div>
      );
    case 'available':
    default:
      return null;
  }
}

export function SkillNode({ data }: NodeProps<Node<SkillNodeData>>) {
  const { irNode, status, selected, dim, theme } = data;
  const skill = irNode.data as unknown as SkillData;
  const fill = categoryFill(theme, irNode.category);
  const Icon = iconFor(irNode.category);
  const pips = difficultyPips(skill.difficulty);
  const sv = statusVisual(theme, status);
  const border = selected
    ? `3px solid ${selectedBorder(theme)}`
    : `${sv.borderWidth ?? 2}px solid ${sv.border ?? nodeBorder(theme)}`;
  const badgeColor = statusColor(theme, status);

  return (
    <div
      data-testid="graph-node"
      data-node-id={irNode.id}
      style={{
        position: 'relative',
        width: irNode.size.width,
        height: irNode.size.height,
        background: fill,
        border,
        borderRadius: 4,
        padding: '6px 10px',
        boxSizing: 'border-box',
        color: nodeText(theme),
        fontFamily: fontFamily(theme),
        boxShadow: '2px 2px 0 rgba(0,0,0,0.4)',
        opacity: dim ? 0.18 : sv.opacity,
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: '36px 1fr',
        gridTemplateRows: 'auto 1fr auto',
        columnGap: 8,
        rowGap: 2,
        filter: status === 'locked' ? 'saturate(0.7)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: nodeBorder(theme) }} />
      <div
        style={{
          gridRow: '1 / span 3',
          alignSelf: 'center',
          justifySelf: 'center',
          color: nodeText(theme),
          opacity: 0.9,
        }}
      >
        <Icon size={28} strokeWidth={1.6} />
      </div>
      <div style={{ fontSize: 10, opacity: 0.75, letterSpacing: 0.5 }}>
        {(irNode.band ?? '').toUpperCase()}
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
          opacity: 0.75,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{irNode.category ?? ''}</span>
        {pips && <span style={{ letterSpacing: 1, fontSize: 9 }}>{pips}</span>}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: nodeBorder(theme) }} />
      <StatusBadge status={status} color={badgeColor} />
    </div>
  );
}

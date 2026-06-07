import type { Theme } from '@echozedlabs/techtree-schema';
import type { NodeStatus } from '@echozedlabs/techtree-state';

export interface StatusVisual {
  /** Border color override (or undefined to use node-default-border). */
  border?: string;
  /** Border width override. */
  borderWidth?: number;
  /** Opacity multiplier; lower = more dimmed. */
  opacity: number;
  /** Optional fill tint applied over the category fill. */
  fillOverlay?: string;
}

export function statusVisual(theme: Theme, status: NodeStatus): StatusVisual {
  switch (status) {
    case 'locked':
      return { opacity: 0.6 };
    case 'available':
      return {
        border: theme.colors?.node_available_fill ?? '#5a7399',
        borderWidth: 2,
        opacity: 1,
      };
    case 'in_progress':
      return {
        border: theme.colors?.node_in_progress_fill ?? '#b89a4a',
        borderWidth: 3,
        opacity: 1,
      };
    case 'submitted':
      return {
        border: theme.colors?.node_submitted_fill ?? '#c4986d',
        borderWidth: 3,
        opacity: 1,
      };
    case 'pending_approval':
      return {
        border: theme.colors?.node_pending_approval_fill ?? '#d9c977',
        borderWidth: 3,
        opacity: 1,
      };
    case 'achieved':
      return {
        border: theme.colors?.node_achieved_fill ?? '#8fae5d',
        borderWidth: 3,
        opacity: 1,
      };
    case 'rejected':
      return {
        border: theme.colors?.node_rejected_fill ?? '#a85a5a',
        borderWidth: 3,
        opacity: 0.85,
      };
  }
}

/** Short human-readable label used in the side-panel status pill. */
export function statusLabel(status: NodeStatus): string {
  switch (status) {
    case 'locked':
      return 'Locked';
    case 'available':
      return 'Available';
    case 'in_progress':
      return 'In progress';
    case 'submitted':
      return 'Submitted';
    case 'pending_approval':
      return 'Pending approval';
    case 'achieved':
      return 'Achieved';
    case 'rejected':
      return 'Rejected';
  }
}

export function statusColor(theme: Theme, status: NodeStatus): string {
  switch (status) {
    case 'locked':
      return theme.colors?.node_locked_fill ?? '#3b4353';
    case 'available':
      return theme.colors?.node_available_fill ?? '#5a7399';
    case 'in_progress':
      return theme.colors?.node_in_progress_fill ?? '#b89a4a';
    case 'submitted':
      return theme.colors?.node_submitted_fill ?? '#c4986d';
    case 'pending_approval':
      return theme.colors?.node_pending_approval_fill ?? '#d9c977';
    case 'achieved':
      return theme.colors?.node_achieved_fill ?? '#8fae5d';
    case 'rejected':
      return theme.colors?.node_rejected_fill ?? '#a85a5a';
  }
}

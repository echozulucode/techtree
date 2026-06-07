import type { ComponentType } from 'react';
import type { IR } from '@echozedlabs/techtree-ir';
import type { Theme } from '@echozedlabs/techtree-schema';
import type { NodeStatus } from '@echozedlabs/techtree-state';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Contract that renderer implementations satisfy. Deliberately small — the
 * shell (toolbar, side panel, era banners, theme switcher, filter chips) lives
 * outside this surface and is rendered once regardless of which renderer is
 * active. The contract is what survived the Phase 1.5 + Phase 3 bake-offs as
 * the minimum surface area; new renderers (per high-level-plan §8 Phase 11)
 * implement this interface.
 *
 * See docs/high-level-plan.md §1.4 (renderer is an IR consumer).
 */
export interface RendererProps {
  ir: IR;
  selectedId: string | null;
  /** Ancestors+descendants of selectedId. Empty when nothing selected. */
  relatedIds: ReadonlySet<string>;
  /** Per-node status derived from user state. Renderers paint based on this. */
  nodeStatus: ReadonlyMap<string, NodeStatus>;
  /** Filter chip set. null = show all; otherwise dim nodes whose id is not in the set. */
  visibleIds: ReadonlySet<string> | null;
  theme: Theme;
  /** Node id to center the viewport on (initial focus / state-mutation re-focus). */
  focusOnNodeId: string | null;
  onSelectNode: (id: string) => void;
  onClearSelection: () => void;
  onViewportChange: (v: Viewport) => void;
}

export type Renderer = ComponentType<RendererProps>;

export interface RendererInfo {
  id: string;
  label: string;
  Component: Renderer;
}

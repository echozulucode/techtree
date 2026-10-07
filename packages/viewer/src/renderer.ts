import type { ComponentType } from 'react';
import type { IR } from '@echozedlabs/techtree-ir';
import type { Theme } from '@echozedlabs/techtree-schema';
import type { StatusModel } from '@echozedlabs/techtree-state/status-model';

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
  /**
   * Per-node EFFECTIVE status (stored, or derived available/locked) under
   * `statusModel`. Renderers paint based on this.
   */
  nodeStatus: ReadonlyMap<string, string>;
  /** The status model `nodeStatus` belongs to. Default: the skill model. */
  statusModel?: StatusModel;
  /** Filter set. null = show all; otherwise nodes not in the set are dimmed or hidden. */
  visibleIds: ReadonlySet<string> | null;
  /**
   * What happens to nodes outside `visibleIds`: 'dim' (default) or 'hide'.
   * Either way positions, bands and lanes never move.
   */
  filterMode?: 'dim' | 'hide';
  /** Show the minimap / zoom controls (default true). */
  showMiniMap?: boolean;
  showControls?: boolean;
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

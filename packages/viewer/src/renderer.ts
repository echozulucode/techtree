import type { ComponentType } from 'react';
import type { IR } from '@echozedlabs/techtree-ir';
import type { Theme } from '@echozedlabs/techtree-schema';
import type { StatusModel } from '@echozedlabs/techtree-state/status-model';

/** Fit options in renderer-neutral form (node ids, not renderer node objects). */
export interface RendererFitViewOptions {
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
  duration?: number;
  nodeIds?: readonly string[];
  includeHiddenNodes?: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Initial camera as a function of the canvas size in screen px. The renderer
 * applies it once the canvas has a size and again when that size changes,
 * until the reader moves the camera (pan, zoom, minimap, controls, keyboard)
 * or a focus request does; then never again.
 */
export type RendererInitialCamera = (container: { width: number; height: number }) => Viewport;

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
  /**
   * Light / dark mode for the renderer's own chrome (React Flow's `colorMode`,
   * which also puts a `light` / `dark` class on its container). Resolve
   * 'system' before passing it so the class matches the host's theme.
   * Default 'light'.
   */
  colorMode?: 'light' | 'dark';
  /** Zoom bounds (renderer defaults when omitted). */
  minZoom?: number;
  maxZoom?: number;
  /** Fit options for the "fit view" control (and the initial fit, unless `initialFitViewOptions`). */
  fitViewOptions?: RendererFitViewOptions;
  /** Fit options for the initial camera only (e.g. one focused node at a fixed zoom). */
  initialFitViewOptions?: RendererFitViewOptions;
  /**
   * Initial camera computed from the canvas size; replaces the initial fit
   * (`initialFitViewOptions` / `fitViewOptions` then only drive the fit button).
   */
  initialCamera?: RendererInitialCamera;
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

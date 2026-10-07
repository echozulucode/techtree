import type { CSSProperties, ReactNode } from 'react';
import type { IR, IRNode } from '@echozedlabs/techtree-ir';
import type { CapabilityData, Theme } from '@echozedlabs/techtree-schema';
import type {
  NodeStateInput,
  NodeStates,
  NodeStatusView,
  StatusModel,
} from '@echozedlabs/techtree-state/status-model';
import type { HighlightDirection } from '../shell/graph.js';

export type ColorScheme = 'light' | 'dark' | 'system';
export type TechTreeViewMode = 'graph' | 'outline';

/**
 * Level of the top headings the view renders (drawer title, outline branches);
 * their sub-headings use the next level. Pick the level that continues the
 * host page's outline (e.g. 2 under the page's h1).
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Element of the detail drawer. `section` (default) and `div` are exposed as a
 * labelled `region` landmark, which may nest inside the view's own region;
 * `aside` (complementary) is only valid when the view is NOT inside another
 * landmark — axe `landmark-complementary-is-top-level`.
 */
export type DrawerElement = 'section' | 'div' | 'aside';

/**
 * An opaque reference the HOST resolves: a capability `link` (`{type, ref,
 * relation}` from the IR) or an `implementation` ref (parsed from
 * "type:ref"; plain strings become `{type: 'implementation', ref}`).
 */
export interface TechTreeLinkRef {
  type: string;
  ref: string;
  /** demonstrates | implements | evidence | eureka (opaque to the engine). */
  relation: string;
  /** Where it came from on the node. */
  source: 'link' | 'implementation';
}

export interface LinkRenderContext {
  node: IRNode;
}

/** Everything the detail drawer knows about the selected node. */
export interface NodeDetailContext {
  ir: IR;
  node: IRNode;
  /** Derived status view (effective / stored / prerequisitesMet / missing). */
  status: NodeStatusView;
  statusModel: StatusModel;
  theme: Theme;
  /** What the host supplied for this node in `state` (may be undefined). */
  stateEntry: NodeStateInput;
  /** Present for capability-profile nodes. */
  capability?: CapabilityData;
  /** Direct prerequisites: individually required, and any-of groups. */
  prerequisites: { all: IRNode[]; anyOf: IRNode[][] };
  /** Direct dependents (what this node unlocks in the graph). */
  dependents: IRNode[];
  /** Full prerequisite / downstream closures. */
  ancestors: IRNode[];
  descendants: IRNode[];
  bandTitle?: string;
  trackTitle?: string;
  highlightDirection: HighlightDirection;
  setHighlightDirection: (d: HighlightDirection) => void;
  /** Select another node (or null to close). */
  select: (id: string | null) => void;
  close: () => void;
  renderLink?: (link: TechTreeLinkRef, ctx: LinkRenderContext) => ReactNode;
  /** Heading level of the drawer title (sections use the next level). Default 3. */
  headingLevel?: HeadingLevel;
}

export interface TechTreeViewProps {
  /** Compiled IR (from the compiler / your database). */
  ir: IR;
  /**
   * Stored per-node state from the host: node id → status id, or an object
   * with `status` (a TreeState entry, a DB row…). Optional `achieved_eurekas`
   * on an object marks eurekas done. Omitted nodes use the model default.
   */
  state?: NodeStates | null;
  /** Status model; default chosen from `ir.tree.profile`. */
  statusModel?: StatusModel;
  /** Theme object or built-in id ('civ-iv' | 'minimal-dark' | 'css-variables'). */
  theme?: Theme | string;
  /** Light / dark defaults for the CSS-variable theme and the chrome. Default 'system'. */
  colorScheme?: ColorScheme;
  className?: string;
  style?: CSSProperties;
  /** Accessible name of the region (default: the tree title). */
  ariaLabel?: string;

  // selection
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectNode?: (id: string | null, node: IRNode | null) => void;

  // path highlighting (anchored on the selected node unless highlightNodeId is set)
  highlightDirection?: HighlightDirection;
  defaultHighlightDirection?: HighlightDirection;
  onHighlightDirectionChange?: (d: HighlightDirection) => void;
  highlightNodeId?: string | null;

  // filtering
  /** Effective status ids to show; null = all. */
  statusFilter?: readonly string[] | null;
  defaultStatusFilter?: readonly string[] | null;
  onStatusFilterChange?: (filter: readonly string[] | null) => void;
  /** Extra host predicate (e.g. branch / kind filters); combined with the status filter. */
  nodeFilter?: (node: IRNode) => boolean;
  /** Filtered-out nodes are hidden (default) or dimmed. Eras and lanes never move. */
  filterMode?: 'hide' | 'dim';
  showStatusFilter?: boolean;

  // view
  view?: TechTreeViewMode;
  defaultView?: TechTreeViewMode;
  onViewChange?: (v: TechTreeViewMode) => void;
  showViewToggle?: boolean;
  /** Center the camera on this node when it changes. */
  focusNodeId?: string | null;
  showMiniMap?: boolean;
  showControls?: boolean;

  // detail
  /** 'drawer' (default) renders the built-in drawer; 'none' leaves detail to the host. */
  detailPanel?: 'drawer' | 'none';
  /**
   * Element of the drawer: 'section' (default) or 'div' — a labelled region —
   * or 'aside' (complementary; only when the view is not inside a landmark).
   */
  drawerElement?: DrawerElement;
  /**
   * Level of the drawer title and of the outline's branch headings; their
   * sub-headings use the next level. Default 3.
   */
  headingLevel?: HeadingLevel;
  /**
   * Move keyboard focus to the drawer heading when the selection changes from
   * inside the view (a node, a drawer link) and back to the canvas node / the
   * previously focused control when the drawer closes. Escape closes the
   * drawer. Initial selection and selection driven from outside the view never
   * move focus. Default true.
   */
  focusDetailOnSelect?: boolean;
  /** Replace the drawer's content (wrap <NodeDetail ctx/> to extend it). */
  renderNodeDetail?: (ctx: NodeDetailContext) => ReactNode;
  /**
   * Resolve an opaque link / implementation ref to UI. Return null to omit it
   * (e.g. an item the viewer may not see) — omitted links are not counted.
   */
  renderLink?: (link: TechTreeLinkRef, ctx: LinkRenderContext) => ReactNode;
}

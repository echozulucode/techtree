'use client';
// Library entry for @echozedlabs/techtree-viewer.
//
// The whole entry is a client module ("use client"): every export is either a
// React component or a helper that ships with them. Nothing here touches
// `window` / `document` at import time, so it is safe to import from a Next.js
// App Router client component (and to server-render). Pure, server-usable
// helpers (status derivation, prerequisite index) live in
// @echozedlabs/techtree-state.
//
// Styles: import '@echozedlabs/techtree-viewer/style.css' once in the host.

// Embeddable view (host apps)
export { TechTreeView, resolveTheme } from './embed/TechTreeView.js';
export { TechTreeOutline, outlineAnchorId, type TechTreeOutlineProps } from './embed/TechTreeOutline.js';
export { NodeDetail, parseImplementationRef } from './embed/NodeDetail.js';
export { StatusFilter, type StatusFilterProps } from './embed/StatusFilter.js';
export type {
  TechTreeViewProps,
  TechTreeViewMode,
  ColorScheme,
  HeadingLevel,
  DrawerElement,
  NodeDetailContext,
  TechTreeLinkRef,
  LinkRenderContext,
} from './embed/types.js';

// Standalone SPA shell (dev harness / static hosting)
export { App } from './App.js';
export { SidePanel } from './shell/SidePanel.js';
export { Toolbar } from './shell/Toolbar.js';
export { EraBanners } from './shell/EraBanners.js';
export { FilterChips, type FilterValue } from './shell/FilterChips.js';

// Helpers
export { computeRelated, type HighlightDirection, type RelatedSets } from './shell/graph.js';
export { statusColor, statusLabel, statusIconName, statusVisual } from './shell/status-style.js';
export { STATUS_ICONS, KIND_ICONS, statusIcon } from './shell/status-icons.js';

// Renderer contract
export { DEFAULT_RENDERER_ID, RENDERERS } from './renderers/index.js';
export { ReactFlowRenderer } from './renderers/react-flow/index.js';
export { GraphNode, SkillNode, type GraphNodeData, type SkillNodeData } from './renderers/react-flow/GraphNode.js';
export type { Renderer, RendererInfo, RendererProps, Viewport } from './renderer.js';

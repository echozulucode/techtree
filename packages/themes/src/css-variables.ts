import type { Theme } from '@echozedlabs/techtree-schema';

/**
 * Host-driven theme: every colour is a CSS custom property, so a host app maps
 * its own design tokens (and its light/dark switch) onto the graph without
 * touching TechTree. Defaults for light and dark ship in the viewer stylesheet
 * (`@echozedlabs/techtree-viewer/style.css`, scoped to `.techtree-root`); the
 * fallbacks below keep the theme legible even without that stylesheet.
 *
 *   .techtree-root { --techtree-canvas-bg: var(--background); }
 *
 * Variable names: see VARIABLES below or the viewer README.
 */
const v = (name: string, fallback: string): string => `var(--techtree-${name}, ${fallback})`;

export const CSS_VARIABLE_NAMES = [
  'canvas-bg',
  'canvas-grid',
  'node-bg',
  'node-border',
  'node-text',
  'edge',
  'edge-soft',
  'accent',
  'era-label',
  'kind-capability',
  'kind-milestone',
  'kind-wonder',
  'status-locked',
  'status-available',
  'status-not_started',
  'status-investigating',
  'status-demonstrated',
  'status-operational',
  'status-strategic_standard',
  'status-legacy',
  'status-retiring',
  'status-in_progress',
  'status-submitted',
  'status-pending_approval',
  'status-achieved',
  'status-rejected',
] as const;

export const cssVariables: Theme = {
  id: 'css-variables',
  title: 'Host CSS variables (light / dark)',
  colors: {
    canvas_background: v('canvas-bg', '#f7f6f2'),
    canvas_grid: v('canvas-grid', '#e4e1d8'),
    node_default_fill: v('node-bg', '#ffffff'),
    node_default_border: v('node-border', '#c9c4b5'),
    node_text: v('node-text', '#1f2430'),
    node_locked_fill: v('status-locked', '#a3a7b0'),
    node_available_fill: v('status-available', '#3a76c0'),
    node_in_progress_fill: v('status-in_progress', '#b8862a'),
    node_submitted_fill: v('status-submitted', '#a2673a'),
    node_pending_approval_fill: v('status-pending_approval', '#a68f1f'),
    node_achieved_fill: v('status-achieved', '#4a8237'),
    node_rejected_fill: v('status-rejected', '#b24a4a'),
    edge_requires: v('edge', '#8a8f9c'),
    edge_recommends: v('edge-soft', '#7aa7d9'),
    edge_highlight: v('accent', '#d08a00'),
  },
  categories: {
    capability: { shape: 'rounded', fill: v('kind-capability', '#ffffff') },
    milestone: { shape: 'hex', fill: v('kind-milestone', '#fff4d6') },
    wonder: { shape: 'diamond', fill: v('kind-wonder', '#f1e6fa') },
  },
  statuses: {
    not_started: { color: v('status-not_started', '#8a8f9c'), icon: 'circle' },
    investigating: { color: v('status-investigating', '#3a76c0'), icon: 'search' },
    demonstrated: { color: v('status-demonstrated', '#1d8082'), icon: 'circle-half' },
    operational: { color: v('status-operational', '#4a8237'), icon: 'circle-check' },
    strategic_standard: { color: v('status-strategic_standard', '#c08a00'), icon: 'star' },
    legacy: { color: v('status-legacy', '#ad6227'), icon: 'alert-triangle' },
    retiring: { color: v('status-retiring', '#b24a4a'), icon: 'x-circle' },
  },
  edges: {
    requires: { stroke: v('edge', '#8a8f9c'), width: 1.75, style: 'solid' },
    recommends: { stroke: v('edge-soft', '#7aa7d9'), width: 1.25, style: 'dashed' },
  },
  eras: {
    show_labels: true,
    label_color: v('era-label', '#5c6270'),
  },
  fonts: {
    family: 'inherit',
    title_size: 13,
    body_size: 11,
  },
};

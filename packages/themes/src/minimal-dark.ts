import type { Theme } from '@echozedlabs/techtree-schema';

/**
 * Alternative theme: GitHub-dark-inspired, low-saturation, status-driven coloring.
 * Categories share neutral fills; the visual signal comes from status (locked vs
 * achieved) rather than from category. Demonstrates that a theme can pivot the
 * entire visual hierarchy of the same IR.
 */
export const minimalDark: Theme = {
  id: 'minimal-dark',
  title: 'Minimal Dark',
  colors: {
    canvas_background: '#0d1117',
    canvas_grid: '#1a1f26',
    node_default_fill: '#21262d',
    node_default_border: '#30363d',
    node_text: '#c9d1d9',
    node_locked_fill: '#16191e',
    node_available_fill: '#1f6feb',
    node_in_progress_fill: '#d29922',
    node_submitted_fill: '#a371f7',
    node_achieved_fill: '#238636',
    edge_requires: '#484f58',
    edge_recommends: '#1f6feb',
    edge_highlight: '#f78166',
  },
  categories: {
    foundations: { shape: 'rect', fill: '#21262d' },
    core: { shape: 'rect', fill: '#21262d' },
    advanced: { shape: 'rect', fill: '#21262d' },
    tools: { shape: 'rect', fill: '#21262d' },
    programming: { shape: 'rect', fill: '#21262d' },
    writing: { shape: 'rect', fill: '#21262d' },
    skills: { shape: 'rect', fill: '#21262d' },
    design: { shape: 'rect', fill: '#21262d' },
    delivery: { shape: 'rect', fill: '#21262d' },
    process: { shape: 'rect', fill: '#21262d' },
    leadership: { shape: 'rect', fill: '#21262d' },
    operations: { shape: 'rect', fill: '#21262d' },
  },
  edges: {
    requires: { stroke: '#484f58', width: 1.5, style: 'solid' },
    recommends: { stroke: '#1f6feb', width: 1, style: 'dashed' },
  },
  eras: {
    show_labels: true,
    label_color: '#8b949e',
  },
  fonts: {
    family: 'system-ui, -apple-system, sans-serif',
    title_size: 13,
    body_size: 11,
  },
};

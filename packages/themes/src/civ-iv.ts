import type { Theme } from '@echozedlabs/techtree-schema';

/**
 * The default theme. Civilization-inspired earthy palette: muted blues/greens
 * with a parchment-tinted text color and golden era banners. Categories are
 * color-coded; status is signaled via fill + border treatment.
 */
export const civIv: Theme = {
  id: 'civ-iv',
  title: 'Civilization-Inspired',
  colors: {
    canvas_background: '#1a1f2e',
    canvas_grid: '#2a2f3e',
    node_default_fill: '#5a6378',
    node_default_border: '#2b2f3a',
    node_text: '#f2efe4',
    node_locked_fill: '#3b4353',
    node_available_fill: '#5a7399',
    node_in_progress_fill: '#b89a4a',
    node_submitted_fill: '#c4986d',
    node_achieved_fill: '#8fae5d',
    edge_requires: '#8c9ab0',
    edge_recommends: '#5aa9e6',
    edge_highlight: '#f2c94c',
  },
  categories: {
    foundations: { shape: 'rounded', fill: '#5a7399', elevation: 'low' },
    core: { shape: 'rounded', fill: '#8fae5d', elevation: 'medium' },
    advanced: { shape: 'rounded', fill: '#b06a4f', elevation: 'high' },
    tools: { shape: 'rounded', fill: '#6d7c99', elevation: 'low' },
    programming: { shape: 'rounded', fill: '#8fae5d', elevation: 'medium' },
    writing: { shape: 'rounded', fill: '#c4986d', elevation: 'medium' },
    skills: { shape: 'rounded', fill: '#7a9b6e', elevation: 'medium' },
    design: { shape: 'rounded', fill: '#a08fc4', elevation: 'high' },
    delivery: { shape: 'rounded', fill: '#b89a4a', elevation: 'medium' },
    process: { shape: 'rounded', fill: '#6d8aa0', elevation: 'medium' },
    leadership: { shape: 'rounded', fill: '#c48f6d', elevation: 'high' },
    operations: { shape: 'rounded', fill: '#a47a7a', elevation: 'medium' },
  },
  edges: {
    requires: { stroke: '#8c9ab0', width: 2, style: 'solid' },
    recommends: { stroke: '#5aa9e6', width: 1.5, style: 'dashed' },
  },
  eras: {
    show_labels: true,
    label_color: '#d9c977',
  },
  fonts: {
    family: 'Georgia, serif',
    title_size: 13,
    body_size: 11,
  },
};

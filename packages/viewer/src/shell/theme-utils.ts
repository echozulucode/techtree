import type { Theme } from '@echozedlabs/techtree-schema';

/**
 * Lookup helpers that apply theme defaults consistently. Renderers should
 * use these instead of indexing into the theme directly so the fallback
 * behavior matches across implementations.
 */

export function categoryFill(theme: Theme, category?: string): string {
  const cat = category ?? '';
  return theme.categories?.[cat]?.fill ?? theme.colors?.node_default_fill ?? '#5a6378';
}

export function nodeBorder(theme: Theme): string {
  return theme.colors?.node_default_border ?? '#2b2f3a';
}

export function nodeText(theme: Theme): string {
  return theme.colors?.node_text ?? '#f2efe4';
}

export function canvasBackground(theme: Theme): string {
  return theme.colors?.canvas_background ?? '#1a1f2e';
}

export function canvasGrid(theme: Theme): string {
  return theme.colors?.canvas_grid ?? '#2a2f3e';
}

export function selectedBorder(theme: Theme): string {
  return theme.colors?.edge_highlight ?? '#f2c94c';
}

export function edgeColor(theme: Theme, kind: 'requires' | 'recommends'): string {
  if (kind === 'requires')
    return theme.edges?.requires?.stroke ?? theme.colors?.edge_requires ?? '#8c9ab0';
  return theme.edges?.recommends?.stroke ?? theme.colors?.edge_recommends ?? '#5aa9e6';
}

export function edgeWidth(theme: Theme, kind: 'requires' | 'recommends'): number {
  if (kind === 'requires') return theme.edges?.requires?.width ?? 2;
  return theme.edges?.recommends?.width ?? 1.5;
}

export function edgeDashed(theme: Theme, kind: 'requires' | 'recommends'): boolean {
  const style = kind === 'requires' ? theme.edges?.requires?.style : theme.edges?.recommends?.style;
  return style === 'dashed' || (style === undefined && kind === 'recommends');
}

export function fontFamily(theme: Theme): string {
  return theme.fonts?.family ?? 'Georgia, serif';
}

export function eraLabelColor(theme: Theme): string {
  return theme.eras?.label_color ?? '#d9c977';
}

/**
 * Pick a foreground color (dark or light) that has sufficient contrast against
 * an arbitrary background hex. Used for status badges, status pills, and filter
 * chips where the background is a status color and we need legible text/icons
 * across both themes.
 */
export function contrastTextOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#f2efe4';
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  // Perceptual luminance approximation (Rec. 601). Good enough for choosing
  // between a light and a dark foreground.
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.55 ? '#1a1f2e' : '#f2efe4';
}

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

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** WCAG 2 relative luminance of a `#rrggbb` colour (null for anything else). */
export function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio of two `#rrggbb` colours (null if either is not hex). */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** True for a measurable `#rrggbb` colour. */
export function isHexColor(value: string): boolean {
  return parseHex(value) !== null;
}

/**
 * Pick a foreground color (dark or light) that has sufficient contrast against
 * an arbitrary background hex. Used for status badges, status pills, and filter
 * chips where the background is a status color and we need legible text/icons
 * across both themes. Prefers the theme-friendly pair (#1a1f2e / #f2efe4) and
 * falls back to black / white when neither reaches WCAG AA (4.5:1).
 */
export function contrastTextOn(hex: string): string {
  // Non-hex colours (CSS variables, named colours) can't be measured here; let
  // the host decide via a variable, defaulting to white.
  if (!isHexColor(hex)) return 'var(--techtree-on-status, #ffffff)';
  const best = (candidates: string[]): [string, number] =>
    candidates
      .map((c): [string, number] => [c, contrastRatio(c, hex) ?? 0])
      .reduce((a, b) => (b[1] > a[1] ? b : a));
  const [soft, softRatio] = best(['#1a1f2e', '#f2efe4']);
  if (softRatio >= 4.5) return soft;
  return best(['#000000', '#ffffff'])[0];
}

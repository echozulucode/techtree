// The stylesheet's default colour tokens meet WCAG 2.2 AA in both schemes, and
// the AA-relevant rules (on-colours, chip counts, 24 px targets) stay in place.
// Parses src/style.css (the published dist/style.css is this file plus React
// Flow's base CSS). Real-browser axe runs in the dev-harness a11y spec.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { capabilityStatusModel, skillStatusModel } from '@echozedlabs/techtree-state';
import { BUILT_IN_THEMES } from '@echozedlabs/techtree-themes';
import { contrastRatio, contrastTextOn, isHexColor } from './shell/theme-utils.js';
import { onStatusColor, statusColor, statusVisual } from './index.js';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'style.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Custom properties declared in the first rule whose selector matches exactly. */
function block(selector: RegExp): Record<string, string> {
  const m = new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`).exec(css);
  if (!m) throw new Error(`no rule for ${selector}`);
  const vars: Record<string, string> = {};
  for (const d of m[1]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]!] = d[2]!.trim();
  return vars;
}

const light = block(/\n\.techtree-root/);
const darkOnly = block(/\.techtree-root\[data-color-scheme='dark'\],\s*:where\(\.dark\) \.techtree-root\[data-color-scheme='system'\]/);
const darkMedia = block(/\.techtree-root\[data-color-scheme='system'\]:not\(:where\(\.light\) \*\)/);
const dark = { ...light, ...darkOnly };
const SCHEMES = { light, dark } as const;

/** sRGB mix like CSS color-mix(in srgb, a p%, b). */
function mix(a: string, b: string, p: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(ch(a, i) * p + ch(b, i) * (1 - p)).toString(16).padStart(2, '0'))
    .join('')}`;
}
const ratio = (a: string, b: string): number => {
  const r = contrastRatio(a, b);
  if (r === null) throw new Error(`not hex: ${a} / ${b}`);
  return r;
};

describe('stylesheet structure', () => {
  it('the media-query dark block and the class/attribute dark block are identical', () => {
    expect(darkMedia).toEqual(darkOnly);
  });

  it('declares no default for the legacy single --techtree-on-status (a host value must win)', () => {
    expect(css).not.toMatch(/--techtree-on-status\s*:/);
  });

  it('chip counts have no opacity; pressed chips / pills / segmented use on-colours', () => {
    const chipCount = /\.tt-chip-count\s*\{([^}]*)\}/.exec(css)![1]!;
    expect(chipCount).not.toMatch(/opacity/);
    expect(css).toMatch(/\.tt-chip\[aria-pressed='true'\]\s*\{[^}]*color:\s*var\(--tt-chip-on\)/);
    expect(css).toMatch(/\.tt-pill\s*\{[^}]*color:\s*var\(--tt-pill-on\)/);
    expect(css).toMatch(
      /\.tt-segmented button\[aria-pressed='true'\]\s*\{[^}]*color:\s*var\(--techtree-on-accent, var\(--tt-on-accent\)\)/,
    );
  });

  it('interactive targets in the toolbar, drawer and outline are at least 24 px (WCAG 2.5.8)', () => {
    const rule = (sel: RegExp) => new RegExp(`${sel.source}[^{]*\\{[^}]*min-height:\\s*24px`).test(css);
    expect(rule(/\.techtree-root \.tt-chip /)).toBe(true);
    expect(rule(/\.techtree-root \.tt-segmented button /)).toBe(true);
    expect(rule(/\.techtree-root \.tt-node-link,\s*\.techtree-root \.tt-outline-node,\s*\.techtree-root \.tt-drawer \.tt-list a/)).toBe(
      true,
    );
  });
});

describe.each(Object.entries(SCHEMES))('%s scheme defaults meet WCAG AA', (_, v) => {
  const statusIds = Object.keys(v)
    .filter((k) => k.startsWith('--techtree-status-'))
    .map((k) => k.slice('--techtree-status-'.length));

  it('covers every status of both status models', () => {
    for (const m of [skillStatusModel, capabilityStatusModel]) {
      for (const id of m.filterOrder) expect(statusIds).toContain(id);
    }
  });

  it('text on every status fill (pill, pressed chip, node badge) ≥ 4.5:1', () => {
    for (const id of statusIds) {
      const on = v[`--tt-on-status-${id}`] ?? v['--tt-on-status-default']!;
      expect(ratio(v[`--techtree-status-${id}`]!, on), `${id}: ${v[`--techtree-status-${id}`]} / ${on}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('text on the accent (pressed "All" chip, segmented buttons) ≥ 4.5:1', () => {
    expect(ratio(v['--techtree-accent']!, v['--tt-on-accent']!)).toBeGreaterThanOrEqual(4.5);
  });

  it('chrome text ≥ 4.5:1 on panel and chip backgrounds; focus ring ≥ 3:1', () => {
    for (const bg of ['--techtree-panel-bg', '--techtree-chip-bg']) {
      for (const fg of ['--techtree-panel-text', '--techtree-panel-muted']) {
        expect(ratio(v[fg]!, v[bg]!), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(ratio(v['--techtree-link']!, v['--techtree-panel-bg']!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(v['--techtree-focus']!, v['--techtree-panel-bg']!)).toBeGreaterThanOrEqual(3);
  });

  it('node text (and its 75 % secondary labels) ≥ 4.5:1 on every node fill', () => {
    for (const fill of ['--techtree-node-bg', '--techtree-kind-capability', '--techtree-kind-milestone', '--techtree-kind-wonder']) {
      const bg = v[fill]!;
      expect(ratio(v['--techtree-node-text']!, bg), fill).toBeGreaterThanOrEqual(4.5);
      expect(ratio(mix(v['--techtree-node-text']!, bg, 0.75), bg), `${fill} (secondary)`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('locked nodes (background muted toward the canvas, no opacity) keep ≥ 4.5:1 incl. secondary labels', () => {
    const canvas = v['--techtree-canvas-bg']!;
    for (const fill of ['--techtree-node-bg', '--techtree-kind-milestone', '--techtree-kind-wonder']) {
      const bg = mix(v[fill]!, canvas, 0.55); // GraphNode default --techtree-locked-node-bg
      expect(ratio(mix(v['--techtree-node-text']!, bg, 0.75), bg), fill).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('dimmed nodes (colour-muted, no opacity) keep ≥ 4.5:1', () => {
    const canvas = v['--techtree-canvas-bg']!;
    const dimText = mix(v['--techtree-node-text']!, canvas, 0.75); // GraphNode default
    expect(ratio(dimText, canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it('era and edge labels on the canvas ≥ 4.5:1', () => {
    expect(ratio(v['--techtree-era-label']!, v['--techtree-canvas-bg']!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(v['--techtree-edge-label']!, v['--techtree-canvas-bg']!)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('node states use colour, not transparency', () => {
  it('statusVisual().opacity is 1 for every built-in status (locked is `muted`)', () => {
    for (const theme of BUILT_IN_THEMES) {
      for (const model of [skillStatusModel, capabilityStatusModel]) {
        for (const id of [...model.filterOrder, 'retiring', 'rejected']) {
          expect(statusVisual(theme, id, model).opacity, `${theme.id} ${id}`).toBe(1);
        }
        expect(statusVisual(theme, model.locked.id, model).muted).toBe(true);
      }
    }
  });
});

describe('on-status colours', () => {
  it('css-variables theme: per-status variable → legacy single variable → AA default', () => {
    const theme = BUILT_IN_THEMES.find((t) => t.id === 'css-variables')!;
    expect(onStatusColor(theme, 'operational', capabilityStatusModel)).toBe(
      'var(--techtree-on-status-operational, var(--techtree-on-status, var(--tt-on-status-operational, var(--tt-on-status-default, #ffffff))))',
    );
  });

  it('hex themes: the computed on-colour meets 4.5:1 for every status of both models', () => {
    for (const theme of BUILT_IN_THEMES) {
      for (const model of [skillStatusModel, capabilityStatusModel]) {
        for (const id of model.filterOrder) {
          const fill = statusColor(theme, id, model);
          if (!isHexColor(fill)) continue;
          const on = contrastTextOn(fill);
          expect(ratio(on, fill), `${theme.id} ${id} ${fill}`).toBeGreaterThanOrEqual(4.5);
          expect(onStatusColor(theme, id, model)).toBe(`var(--techtree-on-status-${id}, var(--techtree-on-status, ${on}))`);
        }
      }
    }
  });

  it('contrastTextOn falls back to black / white when the soft pair is not enough', () => {
    expect(contrastTextOn('#1f8a8c')).toMatch(/^#(000000|ffffff)$/);
    expect(contrastTextOn('#ffffff')).toBe('#1a1f2e');
    expect(contrastTextOn('#14171f')).toBe('#f2efe4');
  });
});

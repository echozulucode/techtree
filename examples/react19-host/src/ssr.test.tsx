// @vitest-environment node
// Server render under React 19, the way a Next.js App Router page pre-renders
// a client component: no window / document at import time or during render.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { version } from 'react';
import { renderToString } from 'react-dom/server';
import { TechTreeView } from '@echozedlabs/techtree-viewer';
import { CI, SAU, demoState, ir } from './fixtures.js';

describe('React 19 host — server render', () => {
  it('runs on React 19 in a DOM-less environment', () => {
    expect(version.startsWith('19.')).toBe(true);
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('the published entry is a "use client" module and ships style.css', () => {
    const require = createRequire(import.meta.url);
    const pkgJson = require.resolve('@echozedlabs/techtree-viewer/package.json');
    const dist = join(dirname(pkgJson), 'dist');
    expect(readFileSync(join(dist, 'index.js'), 'utf8').startsWith("'use client';")).toBe(true);
    expect(readFileSync(join(dist, 'style.css'), 'utf8')).toContain('.techtree-root');
  });

  it('renders the tree, statuses, and a selected node drawer to HTML', () => {
    const html = renderToString(
      <TechTreeView
        ir={ir}
        state={demoState.skills}
        theme="css-variables"
        colorScheme="dark"
        defaultSelectedId={SAU}
        renderLink={(l) => <a href={`/examples/${l.ref}`}>{l.ref}</a>}
      />,
    );
    expect(html).toContain('data-color-scheme="dark"');
    // React Flow's container class follows the scheme (no bare "light" in dark mode).
    expect(html).toMatch(/class="react-flow dark"/);
    expect(html).not.toMatch(/class="react-flow light"/);
    // The drawer is a labelled region, not a nested <aside>.
    expect(html).toMatch(/<section[^>]*class="tt-drawer"[^>]*role="region"/);
    expect(html).toContain(`data-node-id="${SAU}"`);
    expect(html).toContain('data-testid="techtree-detail"');
    expect(html).toContain('/examples/offline-update-bundle-zynq');
    expect(html).toContain('Target: <!-- -->Operational');
  });

  it('dims off-path nodes with CSS variables, not opacity 0.18 (request 3)', () => {
    const html = renderToString(
      <TechTreeView ir={ir} state={demoState.skills} theme="css-variables" defaultSelectedId={CI} defaultHighlightDirection="descendants" />,
    );
    const styleOf = (id: string) =>
      new RegExp(`<div class="([^"]*)" data-testid="graph-node" data-node-id="${id.replace(/[./]/g, '\\$&')}"[^>]*style="([^"]*)"`).exec(html);
    const dimmed = styleOf('eng.platform/version-control')!;
    expect(dimmed[1]).toBe('tt-graph-node tt-graph-node-dim');
    expect(dimmed[2]).toContain('opacity:var(--techtree-dim-opacity, 1)');
    expect(dimmed[2]).toContain('background:var(--techtree-dim-node-bg, var(--techtree-canvas-bg');
    expect(dimmed[2]).toContain('color:var(--techtree-dim-node-text, color-mix(in srgb, var(--techtree-node-text');
    expect(dimmed[2]).toContain('filter:var(--techtree-dim-filter, grayscale(1))');
    expect(dimmed[2]).not.toMatch(/opacity:0\.18/);
    const onPath = styleOf('eng.platform/push-button-release')!;
    expect(onPath[1]).toBe('tt-graph-node');
    expect(onPath[2]).not.toContain('--techtree-dim');
  });

  it('pill and chips carry per-status on-colours (request 4)', () => {
    const html = renderToString(<TechTreeView ir={ir} state={demoState.skills} theme="css-variables" defaultSelectedId={SAU} />);
    expect(html).toContain('--tt-pill-on:var(--techtree-on-status-investigating, var(--techtree-on-status, var(--tt-on-status-investigating');
    expect(html).toContain('--tt-chip-on:var(--techtree-on-status-operational, var(--techtree-on-status, var(--tt-on-status-operational');
  });
});

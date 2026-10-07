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
import { SAU, demoState, ir } from './fixtures.js';

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
    expect(html).toContain(`data-node-id="${SAU}"`);
    expect(html).toContain('data-testid="techtree-detail"');
    expect(html).toContain('/examples/offline-update-bundle-zynq');
    expect(html).toContain('Target: <!-- -->Operational');
  });
});

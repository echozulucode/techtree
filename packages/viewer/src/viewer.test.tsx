// Node-environment tests for the viewer library (React 18 here; the React 19
// smoke lives in examples/react19-host). No DOM: proves the entry imports and
// server-renders without touching window/document.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import type { IR } from '@echozedlabs/techtree-ir';
import { capabilityStatusModel } from '@echozedlabs/techtree-state';
import { cssVariables } from '@echozedlabs/techtree-themes';
import { TechTreeView, computeRelated, statusColor, statusLabel } from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const publicIr = join(here, '..', 'public', 'ir');
const ir = JSON.parse(readFileSync(join(publicIr, 'engineering-platform.ir.json'), 'utf8')) as IR;
const demoState = JSON.parse(readFileSync(join(publicIr, 'engineering-platform.state.json'), 'utf8')) as {
  skills: Record<string, { status: string }>;
};
const SAU = 'eng.platform/safe-automatic-update';

describe('path highlighting', () => {
  it('ancestors = what a node needs, descendants = what it unlocks', () => {
    const needs = computeRelated(ir, SAU, 'ancestors').related;
    expect(needs.has('eng.platform/software-packaging')).toBe(true);
    expect(needs.has('eng.platform/artifact-signing')).toBe(true);
    expect(needs.has('eng.platform/rollback-support')).toBe(true);
    expect(needs.has('eng.platform/trusted-fleet-update')).toBe(false);

    const unlocks = computeRelated(ir, 'eng.platform/continuous-integration', 'descendants').related;
    expect(unlocks.has('eng.platform/push-button-release')).toBe(true);
    expect(unlocks.has('eng.platform/version-control')).toBe(false);

    const both = computeRelated(ir, SAU, 'both');
    expect(both.related.has('eng.platform/trusted-fleet-update')).toBe(true);
    expect(both.related.has('eng.platform/software-packaging')).toBe(true);
  });
});

describe('status presentation', () => {
  it('uses theme.statuses, then legacy colour slots, then the model default', () => {
    expect(statusColor(cssVariables, 'operational', capabilityStatusModel)).toContain('--techtree-status-operational');
    expect(statusColor({ id: 'bare' }, 'operational', capabilityStatusModel)).toBe('#6fae5d');
    expect(statusLabel('strategic_standard', capabilityStatusModel)).toBe('Strategic standard');
  });
});

describe('TechTreeView server render (React 18)', () => {
  it('renders every node with its effective status and the era headers', () => {
    const html = renderToString(<TechTreeView ir={ir} state={demoState.skills} theme="css-variables" />);
    expect(html).toContain('techtree-root');
    expect(html).toContain(`data-node-id="${SAU}"`);
    expect(html).toContain('data-status="investigating"');
    expect(html).toContain('data-status="locked"');
    expect(html).toContain('Engineering Platform');
  });

  it('outline view lists nodes under their branch and era with prerequisite links', () => {
    const html = renderToString(<TechTreeView ir={ir} state={demoState.skills} defaultView="outline" />);
    expect(html).toContain('data-testid="techtree-outline"');
    expect(html).toContain('Deployment &amp; Update');
    expect(html).toContain('III · Platformization');
    expect(html).toContain('Rollback Support');
  });

  it('drawer resolves links through renderLink and omits (and does not count) withheld ones', () => {
    const html = renderToString(
      <TechTreeView
        ir={ir}
        state={demoState.skills}
        defaultSelectedId="eng.platform/recorded-data-replay"
        renderLink={(link) =>
          link.ref === 'can-decoder-from-dbc' ? null : <a href={`/x/${link.ref}`}>{link.ref}</a>
        }
      />,
    );
    expect(html).toContain('data-testid="techtree-detail"');
    expect(html).toContain('/x/can-replay-bench');
    expect(html).not.toContain('can-decoder-from-dbc');
    expect(html).toMatch(/Demonstrated by \(<!-- -->1<!-- -->\)|Demonstrated by \(1\)/);
  });
});

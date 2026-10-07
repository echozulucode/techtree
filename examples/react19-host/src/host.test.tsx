// @vitest-environment jsdom
// The reference host (CapabilityMapHost) on a page with landmarks and an h1:
// accessible with no host-side workaround (request list in the 0.2 changelog).
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { CapabilityMapHost, LINK_RELATIONS } from './CapabilityMapHost.js';
import { SAU, demoState, ir } from './fixtures.js';
import { installReactFlowStubs } from './jsdom-stubs.js';

beforeAll(() => {
  installReactFlowStubs();
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
});
afterEach(cleanup);

const examples = { 'offline-update-bundle-zynq': { title: 'Offline update bundle', href: '/examples/offline-update-bundle-zynq' } };

function Page() {
  return (
    <>
      <header>Engineering Example Library</header>
      <main>
        <h1>Engineering Platform</h1>
        <CapabilityMapHost ir={ir} states={demoState.skills} colorScheme="dark" examples={examples} />
      </main>
    </>
  );
}

describe('reference host (React 19)', () => {
  it('opens a card as an h2-headed region with host links, and passes axe', async () => {
    render(<Page />);
    fireEvent.click(document.querySelector(`[data-testid="graph-node"][data-node-id="${SAU}"]`)!);
    const drawer = screen.getByRole('region', { name: 'Safe Automatic Update details' });
    expect(document.activeElement).toBe(within(drawer).getByRole('heading', { level: 2 }));
    expect(within(drawer).getByRole('link', { name: 'Offline update bundle' }).getAttribute('href')).toBe(
      '/examples/offline-update-bundle-zynq',
    );
    expect(within(drawer).getByRole('link', { name: 'Open the full card' })).toBeTruthy();
    expect(document.querySelector('.react-flow')!.classList.contains('dark')).toBe(true);

    const res = await axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
      rules: {
        'color-contrast': { enabled: false },
        'target-size': { enabled: false },
        'landmark-complementary-is-top-level': { enabled: true },
      },
    });
    expect(res.violations.map((v) => v.id)).toEqual([]);
  });

  it('gets the link relations from the zod-free entry', () => {
    expect(LINK_RELATIONS).toEqual(['demonstrates', 'implements', 'evidence', 'eureka']);
  });
});

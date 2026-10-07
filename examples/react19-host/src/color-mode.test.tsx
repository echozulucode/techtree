// @vitest-environment jsdom
// React Flow's container gets a `light` / `dark` class from its `colorMode`.
// The view resolves `colorScheme` (including 'system') so that class always
// matches the host theme instead of a bare `light` colliding with host
// `.light { … }` token selectors (request 2).
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { TechTreeView } from '@echozedlabs/techtree-viewer';
import { demoState, ir } from './fixtures.js';
import { installReactFlowStubs } from './jsdom-stubs.js';

beforeAll(installReactFlowStubs);
afterEach(() => {
  cleanup();
  document.documentElement.className = '';
});

const flow = () => document.querySelector('.react-flow') as HTMLElement;

describe('React Flow colorMode follows colorScheme', () => {
  it.each(['light', 'dark'] as const)('colorScheme="%s" sets only the matching React Flow class', (scheme) => {
    render(<TechTreeView ir={ir} state={demoState.skills} colorScheme={scheme} />);
    expect(flow().classList.contains(scheme)).toBe(true);
    expect(flow().classList.contains(scheme === 'dark' ? 'light' : 'dark')).toBe(false);
  });

  it('"system" follows a .dark / .light class on an ancestor and tracks <html> class changes', async () => {
    document.documentElement.className = 'dark';
    render(<TechTreeView ir={ir} state={demoState.skills} colorScheme="system" />);
    expect(flow().classList.contains('dark')).toBe(true);
    expect(flow().classList.contains('light')).toBe(false);

    await act(async () => {
      document.documentElement.className = 'light';
      await new Promise((r) => setTimeout(r, 0)); // MutationObserver callback
    });
    expect(flow().classList.contains('light')).toBe(true);
    expect(flow().classList.contains('dark')).toBe(false);
  });

  it('"system" without a host class or media query support falls back to light', () => {
    render(<TechTreeView ir={ir} state={demoState.skills} />);
    expect(flow().classList.contains('light')).toBe(true);
  });
});

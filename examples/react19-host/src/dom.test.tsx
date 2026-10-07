// @vitest-environment jsdom
// Interactive smoke under React 19 + jsdom: selection, path highlighting,
// status filtering and the outline view, all through the public props.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TechTreeView } from '@echozedlabs/techtree-viewer';
import { CI, PUSH_BUTTON, SAU, demoState, ir } from './fixtures.js';

beforeAll(() => {
  // jsdom lacks layout APIs React Flow touches (see React Flow's testing guide).
  class ResizeObserverStub {
    constructor(private cb: ResizeObserverCallback) {}
    observe(target: Element) {
      this.cb([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  }
  class DOMMatrixReadOnlyStub {
    m22: number;
    constructor(transform?: string) {
      const scale = transform?.match(/scale\(([1-9.]+)\)/)?.[1];
      this.m22 = scale !== undefined ? +scale : 1;
    }
  }
  Object.assign(globalThis, { ResizeObserver: ResizeObserverStub, DOMMatrixReadOnly: DOMMatrixReadOnlyStub });
  Object.defineProperties(HTMLElement.prototype, {
    offsetHeight: { get() { return parseFloat((this as HTMLElement).style.height) || 800; } },
    offsetWidth: { get() { return parseFloat((this as HTMLElement).style.width) || 1200; } },
  });
  (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
});
afterEach(cleanup);

const node = (id: string) =>
  document.querySelector(`[data-testid="graph-node"][data-node-id="${id}"]`) as HTMLElement;

describe('React 19 host — interaction', () => {
  it('clicking a node calls onSelectNode and opens the drawer', () => {
    const onSelectNode = vi.fn();
    render(<TechTreeView ir={ir} state={demoState.skills} onSelectNode={onSelectNode} />);
    fireEvent.click(node(SAU));
    expect(onSelectNode).toHaveBeenCalledWith(SAU, expect.objectContaining({ title: 'Safe Automatic Update' }));
    const drawer = screen.getByTestId('techtree-detail');
    expect(drawer.getAttribute('data-node-id')).toBe(SAU);
    expect(within(drawer).getByTestId('detail-prerequisites').textContent).toContain('Rollback Support');
  });

  it('"what does X unlock" highlights downstream nodes and dims the rest', () => {
    render(<TechTreeView ir={ir} state={demoState.skills} defaultSelectedId={CI} defaultHighlightDirection="descendants" />);
    expect(node(PUSH_BUTTON).getAttribute('data-dim')).toBe('false');
    expect(node('eng.platform/version-control').getAttribute('data-dim')).toBe('true');
  });

  it('a status filter hides other nodes and reports the change', () => {
    const onStatusFilterChange = vi.fn();
    render(<TechTreeView ir={ir} state={demoState.skills} onStatusFilterChange={onStatusFilterChange} />);
    fireEvent.click(within(screen.getByTestId('status-filter')).getByRole('button', { name: /Operational/ }));
    expect(onStatusFilterChange).toHaveBeenCalledWith(['operational']);
    const shown = [...document.querySelectorAll('[data-testid="graph-node"]')].filter(
      (el) => (el.closest('.react-flow__node') as HTMLElement | null)?.style.visibility !== 'hidden',
    );
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((el) => el.getAttribute('data-status') === 'operational')).toBe(true);
  });

  it('switches to the outline view', () => {
    render(<TechTreeView ir={ir} state={demoState.skills} />);
    fireEvent.click(screen.getByRole('button', { name: 'Outline' }));
    const outline = screen.getByTestId('techtree-outline');
    const entry = outline.querySelector(`li[data-node-id="${SAU}"]`) as HTMLElement;
    expect(entry.closest('[data-track-id]')?.getAttribute('data-track-id')).toBe('deployment');
    expect(entry.textContent).toContain('Requires:');
    expect(within(outline).getByRole('heading', { name: 'Deployment & Update' })).toBeTruthy();
  });
});

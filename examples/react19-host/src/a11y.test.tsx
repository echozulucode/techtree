// @vitest-environment jsdom
// Accessibility of the embedded view under React 19 + jsdom: landmarks and
// heading levels a host page can rely on, focus management around the detail
// drawer, and axe-core (WCAG 2.2 A/AA + best practice). Colour contrast needs
// real layout and is covered by contrast.test.ts (stylesheet tokens) and the
// dev-harness Playwright a11y spec.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { TechTreeView } from '@echozedlabs/techtree-viewer';
import { SAU, demoState, ir } from './fixtures.js';
import { installReactFlowStubs } from './jsdom-stubs.js';

beforeAll(installReactFlowStubs);
afterEach(cleanup);

const ROLLBACK = 'eng.platform/rollback-support';
const node = (id: string) =>
  document.querySelector(`[data-testid="graph-node"][data-node-id="${id}"]`) as HTMLElement;

/** axe on the host page (the view inside <main> under an <h1>, like a real page). */
async function runAxe(root: Element = document.body) {
  return axe.run(root, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    rules: {
      // jsdom has no layout / computed colours; see contrast.test.ts + the Playwright spec.
      'color-contrast': { enabled: false },
      'target-size': { enabled: false },
      // Deprecated in axe 4.11+, still active in the axe versions hosts run (the
      // library's T3 suite failed on it): keep checking it.
      'landmark-complementary-is-top-level': { enabled: true },
    },
  });
}

function HostPage(props: Partial<Parameters<typeof TechTreeView>[0]>) {
  return (
    <main>
      <h1>Capability map</h1>
      <TechTreeView ir={ir} state={demoState.skills} theme="css-variables" headingLevel={2} {...props} />
    </main>
  );
}

describe('drawer landmark (request 1)', () => {
  it('renders the drawer as a labelled <section role="region"> by default', () => {
    render(<HostPage defaultSelectedId={SAU} />);
    const drawer = screen.getByRole('region', { name: 'Safe Automatic Update details' });
    expect(drawer.tagName).toBe('SECTION');
    expect(drawer.getAttribute('data-testid')).toBe('techtree-detail');
    expect(document.querySelector('aside')).toBeNull();
  });

  it('drawerElement="div" is a region too; "aside" keeps the complementary role', () => {
    const { unmount } = render(<HostPage defaultSelectedId={SAU} drawerElement="div" />);
    expect(screen.getByRole('region', { name: 'Safe Automatic Update details' }).tagName).toBe('DIV');
    unmount();
    render(<HostPage defaultSelectedId={SAU} drawerElement="aside" />);
    const aside = screen.getByTestId('techtree-detail');
    expect(aside.tagName).toBe('ASIDE');
    expect(aside.hasAttribute('role')).toBe(false);
  });

  it('axe: the default drawer passes; the legacy <aside> inside the region is flagged', async () => {
    render(<HostPage defaultSelectedId={SAU} />);
    const ok = await runAxe();
    expect(ok.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    cleanup();

    render(<HostPage defaultSelectedId={SAU} drawerElement="aside" />);
    const bad = await runAxe();
    expect(bad.violations.map((v) => v.id)).toContain('landmark-complementary-is-top-level');
  });
});

describe('heading levels (request 6)', () => {
  it('default: drawer title h3, sections h4; outline branches h3, eras h4 (unchanged)', () => {
    render(<TechTreeView ir={ir} state={demoState.skills} defaultSelectedId={SAU} />);
    const drawer = screen.getByTestId('techtree-detail');
    expect(within(drawer).getByRole('heading', { level: 3, name: 'Safe Automatic Update' })).toBeTruthy();
    expect(within(drawer).getByRole('heading', { level: 4, name: 'Prerequisites' })).toBeTruthy();
  });

  it('headingLevel={2}: drawer h2 / h3, outline h2 / h3 — no sr-only heading needed by the host', () => {
    render(<HostPage defaultSelectedId={SAU} defaultView="outline" />);
    const drawer = screen.getByTestId('techtree-detail');
    expect(within(drawer).getByRole('heading', { level: 2, name: 'Safe Automatic Update' })).toBeTruthy();
    expect(within(drawer).getByRole('heading', { level: 3, name: 'Prerequisites' })).toBeTruthy();
    expect(within(drawer).queryAllByRole('heading', { level: 4 })).toEqual([]);
    const outline = screen.getByTestId('techtree-outline');
    expect(within(outline).getByRole('heading', { level: 2, name: 'Deployment & Update' })).toBeTruthy();
    expect(within(outline).getAllByRole('heading', { level: 3, name: 'III · Platformization' }).length).toBeGreaterThan(1);
  });

  it('axe heading-order passes for an h1 page with headingLevel={2} (graph and outline)', async () => {
    render(<HostPage defaultSelectedId={SAU} defaultView="outline" />);
    const res = await runAxe();
    expect(res.violations.map((v) => v.id)).toEqual([]);
  });
});

describe('focus management (request 7)', () => {
  it('selecting a node moves focus to the drawer heading', () => {
    render(<HostPage />);
    fireEvent.click(node(SAU));
    const heading = within(screen.getByTestId('techtree-detail')).getByRole('heading', { level: 2 });
    expect(document.activeElement).toBe(heading);
  });

  it('selecting a node from inside the drawer keeps focus in the drawer, and Escape still closes it', () => {
    const onSelectNode = vi.fn();
    render(<HostPage onSelectNode={onSelectNode} />);
    fireEvent.click(node(SAU));
    const prereqs = screen.getByTestId('detail-prerequisites');
    const link = within(prereqs).getByRole('button', { name: 'Rollback Support' });
    link.focus();
    fireEvent.click(link);
    const drawer = screen.getByTestId('techtree-detail');
    expect(drawer.getAttribute('data-node-id')).toBe(ROLLBACK);
    expect(document.activeElement).toBe(within(drawer).getByRole('heading', { level: 2, name: 'Rollback Support' }));
    expect(document.activeElement).not.toBe(document.body);

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByTestId('techtree-detail')).toBeNull();
    expect(onSelectNode).toHaveBeenLastCalledWith(null, null);
  });

  it('closing returns focus to the control that opened the drawer', () => {
    render(<HostPage />);
    const opener = node(SAU).closest('.react-flow__node') as HTMLElement;
    opener.focus();
    fireEvent.click(node(SAU));
    expect(document.activeElement?.tagName).toBe('H2');
    fireEvent.click(within(screen.getByTestId('techtree-detail')).getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('techtree-detail')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('an initial selection and host-driven selection do not steal focus', () => {
    const { rerender } = render(
      <>
        <button type="button">host control</button>
        <HostPage selectedId={SAU} />
      </>,
    );
    const host = screen.getByRole('button', { name: 'host control' });
    expect(document.activeElement).toBe(document.body);
    host.focus();
    act(() =>
      rerender(
        <>
          <button type="button">host control</button>
          <HostPage selectedId={ROLLBACK} />
        </>,
      ),
    );
    expect(screen.getByTestId('techtree-detail').getAttribute('data-node-id')).toBe(ROLLBACK);
    expect(document.activeElement).toBe(host);
  });

  it('focusDetailOnSelect={false} leaves focus alone', () => {
    render(<HostPage focusDetailOnSelect={false} />);
    fireEvent.click(node(SAU));
    expect(screen.getByTestId('techtree-detail')).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
  });
});

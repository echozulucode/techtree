'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { IR, IRNode } from '@echozedlabs/techtree-ir';
import type { Theme } from '@echozedlabs/techtree-schema';
import { capabilityData } from '@echozedlabs/techtree-schema/capability-data';
import { deriveStatusView, getStatusModel, prerequisiteIndex } from '@echozedlabs/techtree-state/status-model';
import { BUILT_IN_THEMES, themeById } from '@echozedlabs/techtree-themes';
import type { Viewport } from '../renderer.js';
import { ReactFlowRenderer } from '../renderers/react-flow/index.js';
import { EraBanners } from '../shell/EraBanners.js';
import { computeRelated, type HighlightDirection } from '../shell/graph.js';
import { useControllable } from '../shell/use-controllable.js';
import { NodeDetail } from './NodeDetail.js';
import { StatusFilter } from './StatusFilter.js';
import { TechTreeOutline } from './TechTreeOutline.js';
import type { NodeDetailContext, TechTreeViewMode, TechTreeViewProps } from './types.js';

/** Resolve the `theme` prop: object, built-in id, the IR's default, or civ-iv. */
export function resolveTheme(theme: Theme | string | undefined, ir: IR): Theme {
  if (theme && typeof theme === 'object') return theme;
  return (
    (typeof theme === 'string' ? themeById(theme) : undefined) ??
    (ir.tree.default_theme ? themeById(ir.tree.default_theme) : undefined) ??
    BUILT_IN_THEMES[0]!
  );
}

const NO_FILTER: readonly string[] | null = null;

/**
 * Embeddable, read-only TechTree view for host applications (React 18 / 19,
 * Next.js App Router client component). The host owns data: it passes the
 * compiled IR and its stored per-node state; the view derives availability,
 * renders the canvas (or an accessible outline), highlights paths, filters by
 * status, and shows a detail drawer whose opaque links the host resolves.
 *
 * Import the stylesheet once: `import '@echozedlabs/techtree-viewer/style.css'`.
 */
export function TechTreeView(props: TechTreeViewProps) {
  const {
    ir,
    state,
    colorScheme = 'system',
    className,
    style,
    ariaLabel,
    nodeFilter,
    filterMode = 'hide',
    showStatusFilter = true,
    showViewToggle = true,
    focusNodeId = null,
    showMiniMap = true,
    showControls = true,
    detailPanel = 'drawer',
    drawerElement = 'section',
    headingLevel = 3,
    focusDetailOnSelect = true,
    renderNodeDetail,
    renderLink,
    onSelectNode,
  } = props;

  const statusModel = props.statusModel ?? getStatusModel(ir.tree.profile);
  const theme = resolveTheme(props.theme, ir);

  const [selectedId, setSelectedInner] = useControllable<string | null>(
    props.selectedId,
    props.defaultSelectedId ?? null,
  );
  const [direction, setDirection] = useControllable<HighlightDirection>(
    props.highlightDirection,
    props.defaultHighlightDirection ?? 'both',
    props.onHighlightDirectionChange,
  );
  const [statusFilter, setStatusFilter] = useControllable<readonly string[] | null>(
    props.statusFilter,
    props.defaultStatusFilter ?? NO_FILTER,
    props.onStatusFilterChange,
  );
  const [view, setView] = useControllable<TechTreeViewMode>(
    props.view,
    props.defaultView ?? 'graph',
    props.onViewChange,
  );
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });

  const byId = useMemo(() => new Map(ir.nodes.map((n) => [n.id, n])), [ir]);
  const select = useCallback(
    (id: string | null) => {
      const node = id ? (byId.get(id) ?? null) : null;
      setSelectedInner(node ? node.id : null);
      onSelectNode?.(node ? node.id : null, node);
    },
    [byId, setSelectedInner, onSelectNode],
  );

  const views = useMemo(() => deriveStatusView(ir, state, statusModel), [ir, state, statusModel]);
  const effective = useMemo(() => {
    const m = new Map<string, string>();
    for (const [id, v] of views) m.set(id, v.status);
    return m;
  }, [views]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of ir.nodes) {
      if (nodeFilter && !nodeFilter(n)) continue;
      const s = effective.get(n.id)!;
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return m;
  }, [ir, effective, nodeFilter]);
  const totalCount = useMemo(
    () => (nodeFilter ? ir.nodes.filter(nodeFilter).length : ir.nodes.length),
    [ir, nodeFilter],
  );

  const visibleIds = useMemo<ReadonlySet<string> | null>(() => {
    if (!statusFilter && !nodeFilter) return null;
    const allowed = statusFilter ? new Set(statusFilter) : null;
    const s = new Set<string>();
    for (const n of ir.nodes) {
      if (nodeFilter && !nodeFilter(n)) continue;
      if (allowed && !allowed.has(effective.get(n.id)!)) continue;
      s.add(n.id);
    }
    return s;
  }, [ir, statusFilter, nodeFilter, effective]);

  const anchor = props.highlightNodeId !== undefined ? props.highlightNodeId : selectedId;
  const related = useMemo(() => computeRelated(ir, anchor, direction), [ir, anchor, direction]);

  const selectedNode = selectedId ? (byId.get(selectedId) ?? null) : null;
  const detailCtx = useMemo<NodeDetailContext | null>(() => {
    if (!selectedNode) return null;
    const p = prerequisiteIndex(ir).get(selectedNode.id) ?? { all: [], anyOf: [] };
    const toNodes = (ids: Iterable<string>): IRNode[] =>
      [...ids].map((id) => byId.get(id)).filter((n): n is IRNode => n !== undefined);
    const full = computeRelated(ir, selectedNode.id, 'both');
    const band = ir.bands.find((b) => b.id === selectedNode.band);
    const track = ir.tracks.find((t) => t.id === selectedNode.track);
    const cap = capabilityData(selectedNode);
    return {
      ir,
      node: selectedNode,
      status: views.get(selectedNode.id)!,
      statusModel,
      theme,
      stateEntry: state?.[selectedNode.id],
      ...(cap ? { capability: cap } : {}),
      prerequisites: { all: toNodes(p.all), anyOf: p.anyOf.map((g) => toNodes(g.members)) },
      dependents: full.dependents.filter((d) =>
        ir.edges.some((e) => e.from === selectedNode.id && e.to === d.id && e.kind === 'requires'),
      ),
      ancestors: toNodes(full.ancestors),
      descendants: toNodes(full.descendants),
      ...(band ? { bandTitle: band.title ?? band.id } : {}),
      ...(track ? { trackTitle: track.title ?? track.id } : {}),
      highlightDirection: direction,
      setHighlightDirection: setDirection,
      select,
      close: () => select(null),
      ...(renderLink ? { renderLink } : {}),
      headingLevel,
    };
  }, [selectedNode, ir, byId, views, statusModel, theme, state, direction, setDirection, select, renderLink, headingLevel]);

  // Escape closes the drawer.
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && selectedId) select(null);
    },
    [selectedId, select],
  );

  // Focus management: a selection made inside the view moves focus to the
  // drawer heading (so a drawer link that re-renders the drawer never drops
  // focus to <body> and Escape keeps working); closing returns focus.
  const rootRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const setDrawerEl = useCallback((el: HTMLElement | null) => {
    drawerRef.current = el;
  }, []);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const prevSelectedRef = useRef<string | null>(selectedId);
  const drawerShown = detailPanel === 'drawer' && detailCtx !== null;
  useEffect(() => {
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selectedId;
    if (prev === selectedId || !focusDetailOnSelect) return;
    const root = rootRef.current;
    if (!root || typeof document === 'undefined') return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const lost = active === null || active === document.body || !active.isConnected;
    const inside = active !== null && root.contains(active);
    // Selection driven from outside the view (host controls) never moves focus;
    // the outline manages its own focus (it moves to the chosen entry).
    if (!lost && (!inside || active?.closest('.tt-outline'))) return;

    if (selectedId && drawerShown) {
      const drawer = drawerRef.current;
      if (!drawer) return;
      if (prev === null && inside && active && !drawer.contains(active)) returnFocusRef.current = active;
      const target =
        drawer.querySelector<HTMLElement>('[data-techtree-autofocus]') ??
        drawer.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6') ??
        drawer;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus();
    } else if (!selectedId) {
      const back = returnFocusRef.current;
      returnFocusRef.current = null;
      if (back && back.isConnected && root.contains(back)) {
        back.focus();
        return;
      }
      if (prev) {
        const q = prev.replace(/["\\]/g, '\\$&');
        root.querySelector<HTMLElement>(`.react-flow__node[data-id="${q}"]`)?.focus();
      }
    }
  }, [selectedId, drawerShown, focusDetailOnSelect]);

  // A focus request re-centres the camera once per change.
  const [focusTick, setFocusTick] = useState<string | null>(null);
  useEffect(() => setFocusTick(focusNodeId), [focusNodeId]);

  const onViewportChange = useCallback((v: Viewport) => setViewport(v), []);
  const Drawer = drawerElement === 'aside' ? 'aside' : drawerElement === 'div' ? 'div' : 'section';
  const showToolbar = showStatusFilter || showViewToggle;

  return (
    <div
      ref={rootRef}
      className={className ? `techtree-root ${className}` : 'techtree-root'}
      data-color-scheme={colorScheme}
      data-testid="techtree-view"
      data-profile={ir.tree.profile ?? 'skill'}
      data-theme-id={theme.id}
      role="region"
      aria-label={ariaLabel ?? ir.tree.title}
      style={style}
      onKeyDown={onKeyDown}
    >
      {showToolbar && (
        <div className="tt-toolbar">
          {showStatusFilter && (
            <StatusFilter
              statusModel={statusModel}
              theme={theme}
              value={statusFilter}
              onChange={setStatusFilter}
              counts={counts}
              totalCount={totalCount}
            />
          )}
          {showViewToggle && (
            <div className="tt-segmented tt-view-toggle" role="group" aria-label="View">
              <button type="button" aria-pressed={view === 'graph'} onClick={() => setView('graph')}>
                Map
              </button>
              <button type="button" aria-pressed={view === 'outline'} onClick={() => setView('outline')}>
                Outline
              </button>
            </div>
          )}
        </div>
      )}
      <div className="tt-body">
        {view === 'graph' ? (
          <div className="tt-canvas" style={{ background: theme.colors?.canvas_background }}>
            <ReactFlowRenderer
              ir={ir}
              selectedId={anchor}
              relatedIds={related.related}
              nodeStatus={effective}
              statusModel={statusModel}
              visibleIds={visibleIds}
              filterMode={filterMode}
              theme={theme}
              focusOnNodeId={focusTick}
              onSelectNode={select}
              onClearSelection={() => select(null)}
              onViewportChange={onViewportChange}
              showMiniMap={showMiniMap}
              showControls={showControls}
            />
            <EraBanners ir={ir} theme={theme} viewport={viewport} />
          </div>
        ) : (
          <TechTreeOutline
            ir={ir}
            statuses={views}
            statusModel={statusModel}
            theme={theme}
            selectedId={selectedId}
            onSelect={select}
            visibleIds={filterMode === 'hide' ? visibleIds : null}
            headingLevel={headingLevel}
          />
        )}
        {detailPanel === 'drawer' && detailCtx && (
          <Drawer
            ref={setDrawerEl}
            className="tt-drawer"
            data-testid="techtree-detail"
            data-node-id={detailCtx.node.id}
            data-status={detailCtx.status.status}
            // section / div: a labelled region (may nest in the view's region);
            // aside keeps its complementary role (top-level views only).
            role={drawerElement === 'aside' ? undefined : 'region'}
            aria-label={`${detailCtx.node.title} details`}
          >
            {renderNodeDetail ? renderNodeDetail(detailCtx) : <NodeDetail ctx={detailCtx} />}
          </Drawer>
        )}
      </div>
    </div>
  );
}

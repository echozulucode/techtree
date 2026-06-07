import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IR } from '@echozedlabs/techtree-ir';
import {
  LocalStorageStateAdapter,
  deriveStatuses,
  pickFrontierNodeId,
  treeStateSchema,
  type NodeStatus,
  type SetStatus,
  type StateAdapter,
  type TreeState,
} from '@echozedlabs/techtree-state';
import { BUILT_IN_THEMES, DEFAULT_THEME_ID, themeById } from '@echozedlabs/techtree-themes';
import { Toolbar } from './shell/Toolbar.js';
import { SidePanel } from './shell/SidePanel.js';
import { EraBanners } from './shell/EraBanners.js';
import { FilterChips, type FilterValue } from './shell/FilterChips.js';
import { computeRelated } from './shell/graph.js';
import type { Viewport } from './renderer.js';
import { DEFAULT_RENDERER_ID, RENDERERS } from './renderers/index.js';

const DEFAULT_IR_OPTIONS = [
  { label: 'personal-learning', url: '/ir/personal-learning.ir.json' },
  { label: 'eng-career', url: '/ir/eng-career.ir.json' },
  { label: 'ai-delivery (delivery profile)', url: '/ir/ai-delivery.ir.json' },
];

function readUrlParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * `?watch=<port>` enables hot-reload mode: viewer fetches IR from a running
 * `skilltree serve` instance and subscribes to its SSE event stream.
 */
function watchConfig(): { port: number; irUrl: string; eventsUrl: string } | null {
  const portStr = readUrlParam('watch');
  if (!portStr) return null;
  const port = parseInt(portStr, 10);
  if (!Number.isFinite(port)) return null;
  const origin = `http://localhost:${port}`;
  return { port, irUrl: `${origin}/tree.ir.json`, eventsUrl: `${origin}/events` };
}

function makeAdapter(treeId: string, userId = 'local'): StateAdapter {
  return new LocalStorageStateAdapter(`skill-tree:state:${treeId}:${userId}`, userId, treeId);
}

export function App() {
  const watch = useMemo(() => watchConfig(), []);
  const irOptions = useMemo(
    () =>
      watch ? [{ label: `Watching (port ${watch.port})`, url: watch.irUrl }] : DEFAULT_IR_OPTIONS,
    [watch],
  );

  const [irUrl, setIrUrl] = useState(readUrlParam('ir') ?? irOptions[0]!.url);
  const [themeId, setThemeId] = useState(readUrlParam('theme') ?? DEFAULT_THEME_ID);
  const [rendererId, setRendererId] = useState(readUrlParam('renderer') ?? DEFAULT_RENDERER_ID);
  const [filterValue, setFilterValue] = useState<FilterValue>('all');

  const [ir, setIr] = useState<IR | null>(null);
  const [state, setState] = useState<TreeState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadMs, setLoadMs] = useState<number | undefined>(undefined);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [focusOnNodeId, setFocusOnNodeId] = useState<string | null>(null);
  // Bumped by the SSE listener to trigger a re-fetch without changing irUrl.
  const [refetchTick, setRefetchTick] = useState(0);
  const [hotReloadConnected, setHotReloadConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const adapterRef = useRef<StateAdapter | null>(null);
  const focusedForTreeRef = useRef<string | null>(null);

  // Load IR + initial state when irUrl changes — and whenever refetchTick bumps.
  useEffect(() => {
    const t0 = performance.now();
    // Don't clear ir/state on a hot-reload refetch — would cause a visual flash.
    // The renderer will reconcile via the new IR prop.
    if (refetchTick === 0) {
      setIr(null);
      setState(null);
      setSelectedId(null);
      setFocusOnNodeId(null);
    }
    setLoadError(null);
    fetch(irUrl)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText} for ${irUrl}`);
        return (await r.json()) as IR;
      })
      .then(async (data) => {
        setIr(data);
        setLoadMs(performance.now() - t0);
        const adapter = makeAdapter(data.tree.id);
        adapterRef.current = adapter;
        const loaded = await adapter.load();
        setState(loaded);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : String(err));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [irUrl, refetchTick]);

  // Hot-reload SSE subscription.
  useEffect(() => {
    if (!watch) return;
    const es = new EventSource(watch.eventsUrl);
    const onOpen = (): void => setHotReloadConnected(true);
    const onError = (): void => setHotReloadConnected(false);
    const onUpdate = (): void => setRefetchTick((n) => n + 1);
    es.addEventListener('open', onOpen);
    es.addEventListener('error', onError);
    es.addEventListener('ir-updated', onUpdate);
    return () => {
      es.removeEventListener('open', onOpen);
      es.removeEventListener('error', onError);
      es.removeEventListener('ir-updated', onUpdate);
      es.close();
    };
  }, [watch]);

  // If IR declares a default theme, prefer it on first load (unless URL override).
  useEffect(() => {
    if (!ir?.tree.default_theme) return;
    if (readUrlParam('theme')) return;
    if (themeById(ir.tree.default_theme)) setThemeId(ir.tree.default_theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ir]);

  const theme = themeById(themeId) ?? BUILT_IN_THEMES[0]!;
  const renderer = RENDERERS.find((r) => r.id === rendererId) ?? RENDERERS[0]!;

  const nodeStatus = useMemo<ReadonlyMap<string, NodeStatus>>(
    () => (ir ? deriveStatuses(ir, state) : new Map()),
    [ir, state],
  );

  const statusCounts = useMemo<ReadonlyMap<NodeStatus, number>>(() => {
    const m = new Map<NodeStatus, number>();
    for (const s of nodeStatus.values()) m.set(s, (m.get(s) ?? 0) + 1);
    return m;
  }, [nodeStatus]);

  // Focus on the user's frontier ONCE per IR load.
  useEffect(() => {
    if (!ir || !state) return;
    if (focusedForTreeRef.current === ir.tree.id) return;
    const frontier = pickFrontierNodeId(ir, new Map(nodeStatus), state.primary_path);
    setFocusOnNodeId(frontier);
    focusedForTreeRef.current = ir.tree.id;
  }, [ir, state, nodeStatus]);

  const visibleIds = useMemo<ReadonlySet<string> | null>(() => {
    if (filterValue === 'all') return null;
    const s = new Set<string>();
    for (const [id, st] of nodeStatus) {
      if (st === filterValue) s.add(id);
    }
    return s;
  }, [filterValue, nodeStatus]);

  const { prereqs, dependents, related } = useMemo(
    () => computeRelated(ir, selectedId),
    [ir, selectedId],
  );

  const selectedNode = useMemo(() => {
    if (!ir || !selectedId) return null;
    return ir.nodes.find((n) => n.id === selectedId) ?? null;
  }, [ir, selectedId]);

  const handleSetStatus = useCallback(async (skillId: string, status: SetStatus) => {
    if (!adapterRef.current) return;
    const next = await adapterRef.current.setStatus(skillId, status);
    setState(next);
  }, []);

  const handleClearStatus = useCallback(async (skillId: string) => {
    if (!adapterRef.current) return;
    const next = await adapterRef.current.clearSkill(skillId);
    setState(next);
  }, []);

  const handleViewportChange = useCallback((v: Viewport) => setViewport(v), []);
  const handleSelectNode = useCallback((id: string) => setSelectedId(id), []);
  const handleClearSelection = useCallback(() => setSelectedId(null), []);

  const handleDownloadState = useCallback(() => {
    if (!state) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.tree_id}.${state.user_id}.state.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const handleLoadStateFile = useCallback(
    async (file: File) => {
      if (!adapterRef.current || !ir) return;
      try {
        const text = await file.text();
        const parsed = treeStateSchema.parse(JSON.parse(text));
        if (parsed.tree_id !== ir.tree.id) {
          alert(
            `State file is for tree "${parsed.tree_id}" but the current IR is "${ir.tree.id}". Switch to that tree first.`,
          );
          return;
        }
        await adapterRef.current.save(parsed);
        setState(parsed);
      } catch (err) {
        alert(`Failed to load state file: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [ir],
  );

  // Reset focus after the renderer has had a chance to apply it.
  useEffect(() => {
    if (focusOnNodeId === null) return;
    const t = setTimeout(() => setFocusOnNodeId(null), 600);
    return () => clearTimeout(t);
  }, [focusOnNodeId]);

  const Renderer = renderer.Component;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: theme.colors?.canvas_background ?? '#1a1f2e',
        position: 'relative',
      }}
    >
      <Toolbar
        irOptions={irOptions}
        irUrl={irUrl}
        onIrUrlChange={setIrUrl}
        watchPort={watch?.port}
        hotReloadConnected={hotReloadConnected}
        themes={BUILT_IN_THEMES}
        themeId={theme.id}
        onThemeChange={setThemeId}
        renderers={RENDERERS}
        rendererId={renderer.id}
        onRendererChange={setRendererId}
        nodeCount={ir?.nodes.length}
        edgeCount={ir?.edges.length}
        loadMs={loadMs}
        relatedCount={selectedId ? related.size : undefined}
        hasSelection={selectedId !== null}
        onClearSelection={handleClearSelection}
        onDownloadState={handleDownloadState}
        onLoadStateFile={handleLoadStateFile}
      />
      {ir && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 8,
            zIndex: 28,
            background: 'rgba(40,45,60,0.92)',
            padding: '6px 8px',
            borderRadius: 6,
          }}
        >
          <FilterChips
            value={filterValue}
            onChange={setFilterValue}
            counts={statusCounts}
            totalCount={ir.nodes.length}
            theme={theme}
          />
        </div>
      )}
      {!ir && <EmptyState watchPort={watch?.port} irUrl={irUrl} loadError={loadError} />}
      {ir && state && (
        <Renderer
          ir={ir}
          selectedId={selectedId}
          relatedIds={related}
          nodeStatus={nodeStatus}
          visibleIds={visibleIds}
          theme={theme}
          focusOnNodeId={focusOnNodeId}
          onSelectNode={handleSelectNode}
          onClearSelection={handleClearSelection}
          onViewportChange={handleViewportChange}
        />
      )}
      {ir && <EraBanners ir={ir} theme={theme} viewport={viewport} />}
      {ir && selectedNode && (
        <SidePanel
          node={selectedNode}
          status={nodeStatus.get(selectedNode.id) ?? 'available'}
          stateEntry={state?.skills[selectedNode.id]}
          prereqs={prereqs}
          dependents={dependents}
          theme={theme}
          onSelectId={setSelectedId}
          onSetStatus={handleSetStatus}
          onClearStatus={handleClearStatus}
          onClose={handleClearSelection}
        />
      )}
    </div>
  );
}

function EmptyState({
  watchPort,
  irUrl,
  loadError,
}: {
  watchPort?: number;
  irUrl: string;
  loadError: string | null;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 560,
          background: 'rgba(40,45,60,0.92)',
          color: '#e8e4d4',
          padding: '20px 24px',
          borderRadius: 8,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
          border: '1px solid #4a5878',
          pointerEvents: 'auto',
        }}
      >
        {loadError ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#c48f6d' }}>
              Couldn't load the IR
            </div>
            <code style={{ fontSize: 12, color: '#888', wordBreak: 'break-all' }}>{loadError}</code>
            {watchPort !== undefined ? (
              <>
                <div style={{ marginTop: 12 }}>
                  This URL has <code>?watch={watchPort}</code>, so the viewer is trying to fetch
                  from <code>http://localhost:{watchPort}/tree.ir.json</code>. Start the watcher:
                </div>
                <pre
                  style={{
                    background: '#1a1f2e',
                    color: '#d9c977',
                    padding: '8px 10px',
                    borderRadius: 4,
                    marginTop: 8,
                    fontSize: 12,
                    overflowX: 'auto',
                  }}
                >
                  pnpm skilltree serve examples/personal-learning
                </pre>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  Or drop <code>?watch={watchPort}</code> from the URL to load the bundled example
                  trees instead.
                </div>
              </>
            ) : (
              <div style={{ marginTop: 12 }}>
                Try <code>pnpm skilltree build examples/personal-learning</code> to regenerate the
                IR, then refresh.
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Loading IR…</div>
            <code style={{ fontSize: 12, color: '#888', wordBreak: 'break-all' }}>{irUrl}</code>
          </>
        )}
      </div>
    </div>
  );
}

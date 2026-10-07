import type { IR, IRNode } from '@echozedlabs/techtree-ir';
import type { Theme } from '@echozedlabs/techtree-schema';
import { prerequisiteIndex, type NodeStatusView, type StatusModel } from '@echozedlabs/techtree-state/status-model';
import { statusLabel } from '../shell/status-style.js';

export interface TechTreeOutlineProps {
  ir: IR;
  statuses: ReadonlyMap<string, NodeStatusView>;
  statusModel: StatusModel;
  theme: Theme;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Nodes to list; null = all. */
  visibleIds?: ReadonlySet<string> | null;
}

/** DOM id of a node's entry in the outline (for in-page focus / links). */
export function outlineAnchorId(nodeId: string): string {
  return `tt-outline-${nodeId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/**
 * Accessible alternative to the canvas: every node listed under its track
 * (branch) and band (era), with its status and its prerequisites / unlocks as
 * buttons that move to that node. Pure DOM — works for keyboard and
 * screen-reader users, and server-renders.
 */
export function TechTreeOutline({
  ir,
  statuses,
  statusModel,
  theme,
  selectedId,
  onSelect,
  visibleIds = null,
}: TechTreeOutlineProps) {
  const byId = new Map(ir.nodes.map((n) => [n.id, n]));
  const prereqs = prerequisiteIndex(ir);
  const dependents = new Map<string, string[]>();
  for (const e of ir.edges) {
    if (e.kind !== 'requires') continue;
    const list = dependents.get(e.from) ?? [];
    if (!list.includes(e.to)) list.push(e.to);
    dependents.set(e.from, list);
  }
  const bandOrder = new Map(ir.bands.map((b) => [b.id, b.order]));
  const tracks = [...ir.tracks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  const known = new Set(tracks.map((t) => t.id));
  const groups: { id: string; title: string; nodes: IRNode[] }[] = tracks.map((t) => ({
    id: t.id,
    title: t.title ?? t.id,
    nodes: [],
  }));
  const other = { id: '__other', title: 'Other', nodes: [] as IRNode[] };
  for (const n of ir.nodes) {
    if (visibleIds && !visibleIds.has(n.id)) continue;
    const g = n.track && known.has(n.track) ? groups.find((x) => x.id === n.track)! : other;
    g.nodes.push(n);
  }
  if (other.nodes.length) groups.push(other);

  const go = (id: string): void => {
    onSelect(id);
    if (typeof document !== 'undefined') {
      document.getElementById(outlineAnchorId(id))?.querySelector('button')?.focus();
    }
  };
  const label = (id: string): string => byId.get(id)?.title ?? id;

  return (
    <div className="tt-outline" role="region" aria-label={`${ir.tree.title} outline`} data-testid="techtree-outline">
      {groups
        .filter((g) => g.nodes.length > 0)
        .map((g) => {
          const bands = new Map<string, IRNode[]>();
          for (const n of g.nodes) {
            const key = n.band ?? '';
            bands.set(key, [...(bands.get(key) ?? []), n]);
          }
          const bandKeys = [...bands.keys()].sort(
            (a, b) => (bandOrder.get(a) ?? 1e9) - (bandOrder.get(b) ?? 1e9) || a.localeCompare(b),
          );
          return (
            <section key={g.id} className="tt-outline-track" data-track-id={g.id}>
              <h3>{g.title}</h3>
              {bandKeys.map((bk) => (
                <div key={bk} className="tt-outline-band" data-band-id={bk}>
                  <h4>{ir.bands.find((b) => b.id === bk)?.title ?? (bk || 'Unassigned')}</h4>
                  <ul>
                    {bands
                      .get(bk)!
                      .slice()
                      .sort((a, b) => a.title.localeCompare(b.title))
                      .map((n) => {
                        const view = statuses.get(n.id);
                        const p = prereqs.get(n.id) ?? { all: [], anyOf: [] };
                        const deps = dependents.get(n.id) ?? [];
                        const stored =
                          view?.stored && !statusModel.derivedWhen.includes(view.stored) ? view.stored : view?.status;
                        return (
                          <li key={n.id} id={outlineAnchorId(n.id)} data-node-id={n.id} data-status={view?.status}>
                            <button
                              type="button"
                              className="tt-outline-node"
                              aria-current={n.id === selectedId ? 'true' : undefined}
                              onClick={() => onSelect(n.id)}
                            >
                              {n.title}
                            </button>{' '}
                            <span className="tt-muted">
                              — {stored ? statusLabel(stored, statusModel, theme) : ''}
                              {n.category && n.category !== 'capability' ? ` · ${n.category}` : ''}
                            </span>
                            {(p.all.length > 0 || p.anyOf.length > 0) && (
                              <div className="tt-outline-rel">
                                <span className="tt-muted">Requires: </span>
                                {p.all.map((id, i) => (
                                  <span key={id}>
                                    {i > 0 && ', '}
                                    <button type="button" className="tt-node-link" onClick={() => go(id)}>
                                      {label(id)}
                                    </button>
                                  </span>
                                ))}
                                {p.anyOf.map((grp, gi) => (
                                  <span key={grp.id}>
                                    {(p.all.length > 0 || gi > 0) && ', '}
                                    one of{' '}
                                    {grp.members.map((id, i) => (
                                      <span key={id}>
                                        {i > 0 && ' or '}
                                        <button type="button" className="tt-node-link" onClick={() => go(id)}>
                                          {label(id)}
                                        </button>
                                      </span>
                                    ))}
                                  </span>
                                ))}
                              </div>
                            )}
                            {deps.length > 0 && (
                              <div className="tt-outline-rel">
                                <span className="tt-muted">Unlocks: </span>
                                {deps.map((id, i) => (
                                  <span key={id}>
                                    {i > 0 && ', '}
                                    <button type="button" className="tt-node-link" onClick={() => go(id)}>
                                      {label(id)}
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              ))}
            </section>
          );
        })}
    </div>
  );
}

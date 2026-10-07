import type { Theme } from '@echozedlabs/techtree-schema';
import type { StatusModel } from '@echozedlabs/techtree-state/status-model';
import { statusIcon } from '../shell/status-icons.js';
import { onStatusColor, statusColor, statusIconName, statusLabel } from '../shell/status-style.js';

export interface StatusFilterProps {
  statusModel: StatusModel;
  theme: Theme;
  /** Selected effective statuses; null = all. */
  value: readonly string[] | null;
  onChange: (next: readonly string[] | null) => void;
  counts: ReadonlyMap<string, number>;
  totalCount: number;
}

/** Multi-select status chips (toggle buttons) for the embeddable view. */
export function StatusFilter({ statusModel, theme, value, onChange, counts, totalCount }: StatusFilterProps) {
  const active = new Set(value ?? []);
  const toggle = (id: string): void => {
    const next = new Set(active);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next.size === 0 ? null : statusModel.filterOrder.filter((s) => next.has(s)));
  };
  return (
    <div className="tt-status-filter" role="toolbar" aria-label="Filter by status" data-testid="status-filter">
      <button
        type="button"
        className="tt-chip"
        aria-pressed={value === null}
        data-status="all"
        onClick={() => onChange(null)}
      >
        <span>All</span>
        <span className="tt-chip-count">{totalCount}</span>
      </button>
      {statusModel.filterOrder.map((id) => {
        const count = counts.get(id) ?? 0;
        const Icon = statusIcon(statusIconName(theme, id, statusModel));
        return (
          <button
            key={id}
            type="button"
            className="tt-chip"
            aria-pressed={active.has(id)}
            data-status={id}
            disabled={count === 0 && !active.has(id)}
            onClick={() => toggle(id)}
            style={{
              ['--tt-chip-color' as string]: statusColor(theme, id, statusModel),
              ['--tt-chip-on' as string]: onStatusColor(theme, id, statusModel),
            }}
          >
            {Icon ? <Icon size={12} strokeWidth={2.5} aria-hidden /> : <span className="tt-chip-dot" aria-hidden />}
            <span>{statusLabel(id, statusModel, theme)}</span>
            <span className="tt-chip-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

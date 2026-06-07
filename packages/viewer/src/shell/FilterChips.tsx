import type { Theme } from '@echozedlabs/techtree-schema';
import type { NodeStatus } from '@echozedlabs/techtree-state';
import { statusColor, statusLabel } from './status-style.js';
import { contrastTextOn } from './theme-utils.js';

export type FilterValue = 'all' | NodeStatus;

const ORDER: FilterValue[] = ['all', 'in_progress', 'available', 'achieved', 'submitted', 'locked'];

export interface FilterChipsProps {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  counts: ReadonlyMap<NodeStatus, number>;
  totalCount: number;
  theme: Theme;
}

export function FilterChips({ value, onChange, counts, totalCount, theme }: FilterChipsProps) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {ORDER.map((v) => {
        const count = v === 'all' ? totalCount : (counts.get(v as NodeStatus) ?? 0);
        const active = v === value;
        const color = v === 'all' ? '#5aa9e6' : statusColor(theme, v as NodeStatus);
        const dimWhenZero = count === 0 && v !== 'all';
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            disabled={dimWhenZero}
            style={{
              background: active ? color : 'rgba(20,25,40,0.6)',
              color: active ? contrastTextOn(color) : dimWhenZero ? '#5a6378' : '#e8e4d4',
              border: `1px solid ${active ? color : '#4a5878'}`,
              padding: '2px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.3,
              cursor: dimWhenZero ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              opacity: dimWhenZero ? 0.5 : 1,
            }}
          >
            <span>{v === 'all' ? 'All' : statusLabel(v as NodeStatus)}</span>
            <span style={{ fontSize: 10, opacity: 0.75 }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

import type { Theme } from '@echozedlabs/techtree-schema';
import { skillStatusModel, statusDef, type StatusModel } from '@echozedlabs/techtree-state/status-model';

/**
 * Status presentation, generic over the profile's status model. Lookup order
 * for a status colour: `theme.statuses[id].color` → the theme's legacy
 * `colors.node_<id>_fill` slot → the model's default colour.
 */

export interface StatusVisual {
  /** Border color override (or undefined to use node-default-border). */
  border?: string;
  /** Border width override. */
  borderWidth?: number;
  /** Opacity multiplier; lower = more dimmed. */
  opacity: number;
  /** Optional fill tint applied over the category fill. */
  fillOverlay?: string;
}

const FALLBACK_COLOR = '#7d8597';

function legacyColor(theme: Theme, status: string): string | undefined {
  const colors = theme.colors as Record<string, string | undefined> | undefined;
  return colors?.[`node_${status}_fill`];
}

export function statusColor(theme: Theme, status: string, model: StatusModel = skillStatusModel): string {
  return (
    theme.statuses?.[status]?.color ??
    legacyColor(theme, status) ??
    statusDef(model, status)?.color ??
    FALLBACK_COLOR
  );
}

/** Short human-readable label (side-panel pill, filter chips, outline). */
export function statusLabel(status: string, model: StatusModel = skillStatusModel, theme?: Theme): string {
  return theme?.statuses?.[status]?.label ?? statusDef(model, status)?.label ?? status;
}

/** Icon name for the status badge (theme override, then model default). */
export function statusIconName(
  theme: Theme,
  status: string,
  model: StatusModel = skillStatusModel,
): string | undefined {
  return theme.statuses?.[status]?.icon ?? statusDef(model, status)?.icon;
}

export function statusVisual(
  theme: Theme,
  status: string,
  model: StatusModel = skillStatusModel,
): StatusVisual {
  if (status === model.locked.id) return { opacity: 0.6 };
  const border = statusColor(theme, status, model);
  if (status === model.available.id) return { border, borderWidth: 2, opacity: 1 };
  if (status === 'rejected' || status === 'retiring') return { border, borderWidth: 3, opacity: 0.85 };
  return { border, borderWidth: 3, opacity: 1 };
}

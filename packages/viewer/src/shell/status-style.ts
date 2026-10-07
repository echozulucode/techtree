import type { Theme } from '@echozedlabs/techtree-schema';
import { skillStatusModel, statusDef, type StatusModel } from '@echozedlabs/techtree-state/status-model';
import { contrastTextOn, isHexColor } from './theme-utils.js';

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

/** A status id as it appears in a CSS custom property name. */
export function statusVarId(status: string): string {
  return status.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Text / icon colour on a status fill (pill, pressed filter chip, node badge).
 * Lookup: `--techtree-on-status-<status>` → the legacy single
 * `--techtree-on-status` → for a measurable hex fill (theme objects) the
 * AA-contrasting dark / light colour, otherwise the stylesheet's per-scheme AA
 * default for that status (or white).
 */
export function onStatusColor(theme: Theme, status: string, model: StatusModel = skillStatusModel): string {
  const id = statusVarId(status);
  const fill = statusColor(theme, status, model);
  const fallback = isHexColor(fill) ? contrastTextOn(fill) : `var(--tt-on-status-${id}, var(--tt-on-status-default, #ffffff))`;
  return `var(--techtree-on-status-${id}, var(--techtree-on-status, ${fallback}))`;
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

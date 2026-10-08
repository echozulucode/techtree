// @echozedlabs/techtree-themes
// Built-in themes. Themes are data, not code (commitment §1.5).
// Each theme is a TS export conforming to @echozedlabs/techtree-schema's themeSchema.
// Custom themes can be authored as YAML files and loaded at runtime via the schema.

import type { Theme } from '@echozedlabs/techtree-schema';
import { civIv } from './civ-iv.js';
import { minimalDark } from './minimal-dark.js';
import { cssVariables } from './css-variables.js';

export { civIv } from './civ-iv.js';
export { minimalDark } from './minimal-dark.js';
export { cssVariables, CSS_VARIABLE_NAMES } from './css-variables.js';

export const BUILT_IN_THEMES: Theme[] = [civIv, minimalDark, cssVariables];

export const DEFAULT_THEME_ID = civIv.id;

export function themeById(id: string): Theme | undefined {
  return BUILT_IN_THEMES.find((t) => t.id === id);
}

export { compile, lint, type CompileResult } from './pipeline.js';
export { type Profile, type CoreNode } from './profile.js';
export {
  skillProfile,
  deliveryProfile,
  PROFILES,
  getProfile,
  DEFAULT_PROFILE_ID,
} from './profiles/index.js';
export { stableStringify } from './emit.js';
export { loadTree, type LoadedTree } from './loader.js';
export {
  type Diagnostic,
  type Severity,
  hasErrors,
  errorCount,
  warningCount,
  formatDiagnostic,
} from './diagnostics.js';
export { generateStress, type StressOptions } from './stress.js';
export {
  skillScaffold,
  themeScaffold,
  suggestSkillPath,
  suggestThemePath,
  type SkillScaffoldOptions,
  type ThemeScaffoldOptions,
} from './scaffolds.js';
export { renameInTree, type RenameOptions, type RenamePlan, type RenameChange } from './rename.js';
export { generateThemePreview, type PreviewArtifact } from './theme-preview.js';
export { generateSchemaDocs } from './schema-docs.js';

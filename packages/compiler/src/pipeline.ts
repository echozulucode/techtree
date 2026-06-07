import type { IR } from '@echozedlabs/techtree-ir';
import { hasErrors, type Diagnostic } from './diagnostics.js';
import { buildIR } from './emit.js';
import { layoutGraph } from './layout.js';
import { lintValidated } from './lint.js';
import { loadTree } from './loader.js';
import type { Profile } from './profile.js';
import { skillProfile } from './profiles/skill.js';
import { validateLoaded } from './validate.js';

export interface CompileResult {
  /** Present iff there are no error-severity diagnostics. */
  ir?: IR;
  diagnostics: Diagnostic[];
}

export async function compile(
  inputDir: string,
  profile: Profile = skillProfile,
): Promise<CompileResult> {
  const loaded = loadTree(inputDir, profile.nodeFileSuffixes);
  const validated = validateLoaded(loaded, profile);
  const lintDiags = lintValidated(validated);
  const diagnostics: Diagnostic[] = [...validated.diagnostics, ...lintDiags];
  if (hasErrors(diagnostics)) return { diagnostics };
  const layout = await layoutGraph(validated);
  const ir = buildIR(validated, layout);
  return { ir, diagnostics };
}

export function lint(inputDir: string, profile: Profile = skillProfile): Diagnostic[] {
  const loaded = loadTree(inputDir, profile.nodeFileSuffixes);
  const validated = validateLoaded(loaded, profile);
  const lintDiags = lintValidated(validated);
  return [...validated.diagnostics, ...lintDiags];
}

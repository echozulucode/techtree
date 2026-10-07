import type { IR } from '@echozedlabs/techtree-ir';
import { hasErrors, type Diagnostic } from './diagnostics.js';
import { buildIR } from './emit.js';
import { layoutGraph } from './layout.js';
import { lintValidated } from './lint.js';
import { loadTree } from './loader.js';
import type { CoreNode, Profile, ProfileLintContext } from './profile.js';
import { skillProfile } from './profiles/skill.js';
import { validateLoaded, type ValidatedTree } from './validate.js';

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
  const diagnostics: Diagnostic[] = [...validated.diagnostics, ...lintAll(validated, profile)];
  if (hasErrors(diagnostics)) return { diagnostics };
  const layout = await layoutGraph(validated);
  const ir = buildIR(validated, layout, profile.id);
  return { ir, diagnostics };
}

export function lint(inputDir: string, profile: Profile = skillProfile): Diagnostic[] {
  const loaded = loadTree(inputDir, profile.nodeFileSuffixes);
  const validated = validateLoaded(loaded, profile);
  return [...validated.diagnostics, ...lintAll(validated, profile)];
}

/** Generic graph rules, then the profile's own rules (only when the graph is sound). */
function lintAll(v: ValidatedTree, profile: Profile): Diagnostic[] {
  const diags = lintValidated(v);
  const declared = v.tree.tree.profile;
  if (declared !== undefined && declared !== profile.id) {
    diags.push({
      severity: 'warning',
      code: 'profile-mismatch',
      message: `tree.yaml declares profile "${declared}" but it was compiled with "${profile.id}".`,
      file: v.treeFile?.relPath,
      hint: `Pass --profile ${declared} (or drop --profile and let tree.yaml decide).`,
    });
  }
  if (profile.lint && !hasErrors(diags)) diags.push(...profile.lint(profileLintContext(v)));
  return diags;
}

function profileLintContext(v: ValidatedTree): ProfileLintContext {
  const byId = new Map<string, CoreNode>();
  const aliasToId = new Map<string, string>();
  for (const s of v.nodes) if (!byId.has(s.node.id)) byId.set(s.node.id, s.node);
  for (const s of v.nodes) for (const a of s.node.aliases) aliasToId.set(a, s.node.id);
  return {
    nodes: v.nodes.map((s) => ({ node: s.node, file: s.file.relPath })),
    byId,
    resolve: (ref) => (byId.has(ref) ? ref : aliasToId.get(ref)),
    bands: (v.tree.eras ?? []).map((e) => ({ ...e })),
    tracks: (v.tree.paths ?? []).map((p) => ({ id: p.id, ...(p.title ? { title: p.title } : {}) })),
  };
}

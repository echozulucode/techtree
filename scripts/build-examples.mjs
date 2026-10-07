// Compile every example tree (examples/*/tree.yaml) with the profile its
// tree.yaml declares, write examples/<name>/dist/tree.ir.json, and refresh the
// committed copies under packages/viewer/public/ir/ (plus any demo state).
// Run after `pnpm -r build`:  pnpm build:examples
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const compilerEntry = join(repo, 'packages', 'compiler', 'dist', 'index.js');
if (!existsSync(compilerEntry)) {
  console.error('build-examples: compiler not built — run `pnpm -r build` first');
  process.exit(1);
}
const { compile, detectTreeProfile, getProfile, formatDiagnostic, stableStringify } = await import(
  pathToFileURL(compilerEntry).href
);

const publicIr = join(repo, 'packages', 'viewer', 'public', 'ir');
mkdirSync(publicIr, { recursive: true });

let failed = 0;
for (const name of readdirSync(join(repo, 'examples')).sort()) {
  const dir = join(repo, 'examples', name);
  if (!existsSync(join(dir, 'tree.yaml'))) continue;
  const profileId = detectTreeProfile(dir) ?? 'skill';
  const result = await compile(dir, getProfile(profileId));
  for (const d of result.diagnostics) console.error(`  ${name}: ${formatDiagnostic(d)}`);
  if (!result.ir) {
    console.error(`build-examples: ${name} FAILED`);
    failed++;
    continue;
  }
  const json = stableStringify(result.ir) + '\n';
  mkdirSync(join(dir, 'dist'), { recursive: true });
  writeFileSync(join(dir, 'dist', 'tree.ir.json'), json);
  writeFileSync(join(publicIr, `${name}.ir.json`), json);
  const demoState = join(dir, 'demo.state.json');
  if (existsSync(demoState)) copyFileSync(demoState, join(publicIr, `${name}.state.json`));
  console.log(`build-examples: ${name} (${profileId}) — ${result.ir.nodes.length} nodes, ${result.ir.edges.length} edges`);
}
process.exit(failed ? 1 : 0);

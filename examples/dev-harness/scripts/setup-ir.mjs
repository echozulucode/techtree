// Copy compiled example IRs into the harness's public/ir/ so the viewer's
// `/ir/<name>.ir.json` fetches resolve. Mirrors packages/viewer/scripts/setup-ir.mjs.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const harnessRoot = join(here, '..');
const repoRoot = join(harnessRoot, '..', '..');
const publicDir = join(harnessRoot, 'public', 'ir');

mkdirSync(publicDir, { recursive: true });

const sources = [
  { from: join(repoRoot, 'examples', 'personal-learning', 'dist', 'tree.ir.json'), to: 'personal-learning.ir.json' },
  { from: join(repoRoot, 'examples', 'eng-career', 'dist', 'tree.ir.json'), to: 'eng-career.ir.json' },
  { from: join(repoRoot, 'examples', 'ai-delivery', 'dist', 'tree.ir.json'), to: 'ai-delivery.ir.json' },
];

let copied = 0;
let missing = 0;
for (const s of sources) {
  if (!existsSync(s.from)) {
    console.warn(`missing IR source: ${s.from} — run \`techtree build\` first`);
    missing++;
    continue;
  }
  copyFileSync(s.from, join(publicDir, s.to));
  copied++;
}
console.log(`setup-ir: ${copied} copied, ${missing} missing`);

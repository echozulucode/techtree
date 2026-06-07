// Copy compiled example IRs into public/ir/ for the dev server.
// Run by `pnpm dev` and `pnpm build` automatically.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const repoRoot = join(root, '..', '..');
const publicDir = join(root, 'public', 'ir');

mkdirSync(publicDir, { recursive: true });

const sources = [
  {
    from: join(repoRoot, 'examples', 'personal-learning', 'dist', 'tree.ir.json'),
    to: 'personal-learning.ir.json',
  },
  {
    from: join(repoRoot, 'examples', 'eng-career', 'dist', 'tree.ir.json'),
    to: 'eng-career.ir.json',
  },
  {
    // Delivery-narrative profile — proves the engine renders a non-skill domain.
    // Built with `skilltree build examples/ai-delivery --profile delivery`.
    from: join(repoRoot, 'examples', 'ai-delivery', 'dist', 'tree.ir.json'),
    to: 'ai-delivery.ir.json',
  },
];

let copied = 0;
let missing = 0;
for (const s of sources) {
  if (!existsSync(s.from)) {
    console.warn(`missing IR source: ${s.from} — run \`skilltree build\` first`);
    missing++;
    continue;
  }
  copyFileSync(s.from, join(publicDir, s.to));
  copied++;
}
console.log(`setup-ir: ${copied} copied, ${missing} missing`);

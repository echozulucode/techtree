// Post-build guard for host embedding: the entry must start with the
// "use client" directive (Next.js App Router boundary) and must not import CSS
// (which breaks Node ESM / SSR). Fails the build otherwise.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const errors = [];

const entry = readFileSync(join(dist, 'index.js'), 'utf8');
if (!/^['"]use client['"];/.test(entry)) errors.push('dist/index.js does not start with "use client"');

function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js') && /^\s*import\s+['"][^'"]+\.css['"]/m.test(readFileSync(p, 'utf8'))) {
      errors.push(`${p} imports CSS`);
    }
  }
}
walk(dist);

if (errors.length) {
  console.error('check-dist FAILED:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log('check-dist: "use client" entry, no CSS imports in JS');

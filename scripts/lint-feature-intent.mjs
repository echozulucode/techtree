// CI gate: keep feature files intent-focused. Step lines (Given/When/Then/And/But)
// must not leak implementation detail — no CSS/test selectors, hex colors, URLs,
// file paths, or raw pixel values. Concrete values belong in the step layer /
// support files, not in the living documentation.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const featuresDir = join(here, '..', 'features');

const FORBIDDEN = [
  { re: /data-testid|querySelector|css=|xpath=/i, why: 'selector' },
  { re: /#[0-9a-fA-F]{3,6}\b/, why: 'hex color' },
  { re: /https?:\/\//i, why: 'URL' },
  { re: /\.(json|tsx?|css|html)\b/i, why: 'file path' },
  { re: /\b\d{3,}px\b/i, why: 'pixel value' },
];

const STEP = /^(Given|When|Then|And|But)\b/;
const errors = [];

for (const file of readdirSync(featuresDir)) {
  if (!file.endsWith('.feature')) continue;
  const lines = readFileSync(join(featuresDir, file), 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!STEP.test(t)) return;
    for (const f of FORBIDDEN) {
      if (f.re.test(t)) errors.push(`${file}:${i + 1}: ${f.why} in step -> ${t}`);
    }
  });
}

if (errors.length > 0) {
  console.error('feature intent lint FAILED:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('feature intent lint OK: steps are implementation-free.');

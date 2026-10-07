// Build dist/style.css: React Flow's base stylesheet inlined ahead of ours, so
// hosts import ONE file and need no CSS @import resolution in their bundler.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(join(root, 'package.json'));

const xyflowCss = readFileSync(require.resolve('@xyflow/react/dist/style.css'), 'utf8');
const ours = readFileSync(join(root, 'src', 'style.css'), 'utf8').replace(
  /^@import ['"]@xyflow\/react\/dist\/style\.css['"];\s*$/m,
  '',
);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(
  join(root, 'dist', 'style.css'),
  `/* @echozedlabs/techtree-viewer — includes @xyflow/react/dist/style.css (MIT) */\n${xyflowCss}\n${ours}`,
);
console.log('build-css: wrote dist/style.css');

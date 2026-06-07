// CI gate: every scenario in features/*.feature must be traced in
// features/coverage.yaml with a status != none (or be tagged @manual), and the
// manifest must not reference scenarios that no longer exist.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const featuresDir = join(here, '..', 'features');

function featureScenarios() {
  const out = []; // { feature, scenario, manual }
  for (const file of readdirSync(featuresDir)) {
    if (!file.endsWith('.feature')) continue;
    const feature = file.replace(/\.feature$/, '');
    const lines = readFileSync(join(featuresDir, file), 'utf8').split(/\r?\n/);
    let pendingTags = '';
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('@')) pendingTags += ' ' + t;
      const m = /^Scenario(?: Outline)?:\s*(.+)$/.exec(t);
      if (m) {
        out.push({ feature, scenario: m[1].trim(), manual: /@manual\b/.test(pendingTags) });
        pendingTags = '';
      } else if (t.startsWith('Scenario') === false && t !== '' && !t.startsWith('@')) {
        pendingTags = '';
      }
    }
  }
  return out;
}

const manifest = parse(readFileSync(join(featuresDir, 'coverage.yaml'), 'utf8'));
const covered = new Map(); // "feature::scenario" -> status
for (const [feature, entries] of Object.entries(manifest.features ?? {})) {
  for (const e of entries) covered.set(`${feature}::${e.scenario}`, e.status);
}

const errors = [];
const scenarios = featureScenarios();
const seen = new Set();
for (const s of scenarios) {
  const key = `${s.feature}::${s.scenario}`;
  seen.add(key);
  if (s.manual) continue;
  const status = covered.get(key);
  if (status === undefined) errors.push(`No coverage entry for ${key}`);
  else if (status === 'none') errors.push(`Scenario has status: none -> ${key}`);
}
for (const key of covered.keys()) {
  if (!seen.has(key)) errors.push(`coverage.yaml references a scenario that no longer exists: ${key}`);
}

if (errors.length > 0) {
  console.error('feature coverage check FAILED:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`feature coverage OK: ${scenarios.length} scenarios traced.`);

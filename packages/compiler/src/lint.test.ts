import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, '..', 'test-fixtures');

async function codesFor(fixture: string): Promise<string[]> {
  const result = await compile(join(fixturesDir, fixture));
  return result.diagnostics.map((d) => d.code);
}

describe('lint rules — each fixture exercises one rule', () => {
  it('detects duplicate ids', async () => {
    const codes = await codesFor('duplicate-id');
    expect(codes).toContain('duplicate-id');
  });

  it('detects unknown references in requires', async () => {
    const codes = await codesFor('unknown-ref');
    expect(codes).toContain('unknown-ref');
  });

  it('detects cycles in the requires graph', async () => {
    const codes = await codesFor('cycle');
    expect(codes).toContain('cycle');
  });

  it('warns on orphan skills', async () => {
    const codes = await codesFor('orphan');
    expect(codes).toContain('orphan');
  });

  it('warns on alias collisions across skills', async () => {
    const codes = await codesFor('alias-collision');
    expect(codes).toContain('alias-collision');
  });

  it('warns on unknown era references when eras are declared', async () => {
    const codes = await codesFor('unknown-era');
    expect(codes).toContain('unknown-era');
  });

  it('warns on unknown path references when paths are declared', async () => {
    const codes = await codesFor('unknown-path');
    expect(codes).toContain('unknown-path');
  });

  it('warns when skill ids do not match the tree namespace', async () => {
    const codes = await codesFor('namespace-mismatch');
    expect(codes).toContain('namespace-mismatch');
  });

  it('reports schema violations (e.g., invalid id format)', async () => {
    const codes = await codesFor('schema-violation');
    expect(codes).toContain('schema');
  });

  it('reports YAML parse errors', async () => {
    const codes = await codesFor('yaml-parse-error');
    expect(codes).toContain('yaml-parse');
  });

  it('error fixtures suppress IR emission', async () => {
    const result = await compile(join(fixturesDir, 'unknown-ref'));
    expect(result.ir).toBeUndefined();
  });
});

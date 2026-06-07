import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, deliveryProfile, hasErrors, stableStringify } from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, '..', '..', '..', 'examples');

describe('green-path example trees', () => {
  it('personal-learning compiles cleanly (no errors, no warnings)', async () => {
    const result = await compile(join(examplesDir, 'personal-learning'));
    expect(hasErrors(result.diagnostics)).toBe(false);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir).toBeDefined();
    expect(result.ir!.nodes.length).toBeGreaterThanOrEqual(10);
  });

  it('eng-career compiles cleanly (no errors, no warnings)', async () => {
    const result = await compile(join(examplesDir, 'eng-career'));
    expect(hasErrors(result.diagnostics)).toBe(false);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir).toBeDefined();
    expect(result.ir!.nodes.length).toBeGreaterThanOrEqual(10);
  });
});

describe('second profile proves the engine is domain-agnostic', () => {
  it('ai-delivery compiles cleanly through the delivery profile (no skill fields)', async () => {
    const result = await compile(join(examplesDir, 'ai-delivery'), deliveryProfile);
    expect(hasErrors(result.diagnostics)).toBe(false);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir).toBeDefined();
    const ir = result.ir!;
    expect(ir.nodes.length).toBe(8);
    // Delivery domain lands in the opaque data bag; engine fields are generic.
    const milestone = ir.nodes.find((n) => n.id === 'ai.simulator-delivered');
    expect(milestone?.category).toBe('milestone');
    expect(milestone?.band).toBe('acceleration');
    expect(milestone?.track).toBe('product');
    expect((milestone?.data as { kind?: string }).kind).toBe('milestone');
  });

  it('delivery IR is byte-identical across two runs (determinism holds per profile)', async () => {
    const a = await compile(join(examplesDir, 'ai-delivery'), deliveryProfile);
    const b = await compile(join(examplesDir, 'ai-delivery'), deliveryProfile);
    expect(stableStringify(a.ir)).toBe(stableStringify(b.ir));
  });
});

describe('IR determinism (commitment §1.3)', () => {
  it('personal-learning IR is byte-identical across two runs', async () => {
    const a = await compile(join(examplesDir, 'personal-learning'));
    const b = await compile(join(examplesDir, 'personal-learning'));
    expect(stableStringify(a.ir)).toBe(stableStringify(b.ir));
  });

  it('eng-career IR is byte-identical across two runs', async () => {
    const a = await compile(join(examplesDir, 'eng-career'));
    const b = await compile(join(examplesDir, 'eng-career'));
    expect(stableStringify(a.ir)).toBe(stableStringify(b.ir));
  });
});

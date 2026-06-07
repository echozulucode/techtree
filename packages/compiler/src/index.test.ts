import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile, hasErrors } from './index.js';
import { IR_VERSION } from '@echozedlabs/techtree-ir';

const here = dirname(fileURLToPath(import.meta.url));
const smokeDir = join(here, '..', '..', '..', 'examples', 'smoke');

describe('compile — smoke', () => {
  it('emits IR for the smoke example (no errors, orphan warning is fine)', async () => {
    const result = await compile(smokeDir);
    expect(hasErrors(result.diagnostics)).toBe(false);
    expect(result.ir).toBeDefined();
    const ir = result.ir!;
    expect(ir.ir_version).toBe(IR_VERSION);
    expect(ir.nodes).toHaveLength(1);
    expect(ir.nodes[0]?.id).toBe('smoke.hello-world');
    expect(ir.nodes[0]?.title).toBe('Hello World');
    expect(ir.edges).toEqual([]);
    expect(ir.meta.node_count).toBe(1);
  });
});

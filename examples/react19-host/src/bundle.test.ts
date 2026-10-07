// @vitest-environment node
// Client-bundle weight: what a host's bundler pulls in for the embeddable view.
// The viewer, `@echozedlabs/techtree-schema/capability-data` and
// `@echozedlabs/techtree-state/status-model` must not drag zod (or
// zod-to-json-schema) into client bundles. esbuild bundles the BUILT packages the
// way a host's bundler would (honouring `sideEffects: false`, React external).
import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const hostDir = join(dirname(fileURLToPath(import.meta.url)), '..');

async function bundleInputs(source: string): Promise<string[]> {
  const result = await build({
    stdin: { contents: source, resolveDir: hostDir, loader: 'ts' },
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    platform: 'browser',
    logLevel: 'silent',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
  });
  // Only modules that contribute bytes to the output (the metafile's top-level
  // `inputs` also lists files that were parsed and then tree-shaken away).
  const out = Object.values(result.metafile.outputs)[0]!;
  return Object.entries(out.inputs)
    .filter(([, v]) => v.bytesInOutput > 0)
    .map(([k]) => k);
}

const zodInputs = (inputs: string[]): string[] => inputs.filter((p) => /[\\/]zod(-to-json-schema)?[\\/]/.test(p));

describe('client bundles stay free of zod', () => {
  it('the control: the schema main entry does bundle zod', async () => {
    const inputs = await bundleInputs(
      "import { capabilitySchema } from '@echozedlabs/techtree-schema'; console.log(capabilitySchema);",
    );
    expect(zodInputs(inputs).length).toBeGreaterThan(0);
  });

  it('@echozedlabs/techtree-schema/capability-data has no zod', async () => {
    const inputs = await bundleInputs(
      "import { capabilityData, CAPABILITY_LINK_RELATIONS, CAPABILITY_STATUSES } from '@echozedlabs/techtree-schema/capability-data';" +
        ' console.log(capabilityData, CAPABILITY_LINK_RELATIONS, CAPABILITY_STATUSES);',
    );
    expect(zodInputs(inputs)).toEqual([]);
  });

  it('the constants tree-shake zod away even through the schema main entry', async () => {
    const inputs = await bundleInputs(
      "import { CAPABILITY_LINK_RELATIONS, capabilityData } from '@echozedlabs/techtree-schema'; console.log(CAPABILITY_LINK_RELATIONS, capabilityData);",
    );
    expect(zodInputs(inputs)).toEqual([]);
  });

  it('@echozedlabs/techtree-state/status-model has no zod', async () => {
    const inputs = await bundleInputs(
      "import { deriveStatusView, getStatusModel, pickFrontierNodeId } from '@echozedlabs/techtree-state/status-model';" +
        ' console.log(deriveStatusView, getStatusModel, pickFrontierNodeId);',
    );
    expect(zodInputs(inputs)).toEqual([]);
  });

  it('a host importing <TechTreeView> and <NodeDetail> gets no zod', async () => {
    const inputs = await bundleInputs(
      "import { TechTreeView, NodeDetail } from '@echozedlabs/techtree-viewer'; console.log(TechTreeView, NodeDetail);",
    );
    expect(inputs.some((p) => p.includes('TechTreeView'))).toBe(true);
    expect(zodInputs(inputs)).toEqual([]);
  });
});

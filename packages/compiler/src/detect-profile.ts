import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

/**
 * Read `tree.profile` from a tree directory's tree.yaml without compiling.
 * Returns undefined when there is no tree file, it does not parse, or it does
 * not declare a profile. Used by the CLI when `--profile` is omitted.
 */
export function detectTreeProfile(inputDir: string): string | undefined {
  for (const name of ['tree.yaml', 'tree.yml']) {
    const p = join(inputDir, name);
    if (!existsSync(p)) continue;
    try {
      const raw = parse(readFileSync(p, 'utf8')) as { tree?: { profile?: unknown } } | null;
      const id = raw?.tree?.profile;
      return typeof id === 'string' && id.length > 0 ? id : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

import { basename } from 'node:path';
import { z, type ZodIssue, type ZodSchema } from 'zod';
import { themeSchema, treeSchema, type Theme, type Tree } from '@echozedlabs/techtree-schema';
import type { Diagnostic } from './diagnostics.js';
import type { LoadedFile, LoadedTree } from './loader.js';
import type { CoreNode, Profile } from './profile.js';

export interface ValidatedNode {
  file: LoadedFile;
  node: CoreNode;
}

export interface ValidatedTheme {
  file: LoadedFile;
  theme: Theme;
}

export interface ValidatedTree {
  inputDir: string;
  tree: Tree;
  treeFile?: LoadedFile;
  nodes: ValidatedNode[];
  themes: ValidatedTheme[];
  diagnostics: Diagnostic[];
}

function defaultTree(inputDir: string): Tree {
  const id = basename(inputDir)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
  return {
    tree: { id: id || 'default', title: id || 'Default Tree' },
  };
}

function zodPathToString(path: readonly (string | number)[]): string {
  let out = '';
  for (const seg of path) {
    if (typeof seg === 'number') out += `[${seg}]`;
    else if (out === '') out += seg;
    else out += `.${seg}`;
  }
  return out;
}

function issuesToDiagnostics(issues: readonly ZodIssue[], file: LoadedFile): Diagnostic[] {
  return issues.map((issue) => {
    const fieldPath = zodPathToString(issue.path);
    const node = issue.path.length > 0 ? file.doc.getIn(issue.path, true) : file.doc.contents;
    let line: number | undefined;
    let col: number | undefined;
    // yaml node range is [start, valueEnd, nodeEnd] offsets
    const range =
      node && typeof node === 'object' && 'range' in node
        ? ((node as { range?: [number, number, number] }).range ?? undefined)
        : undefined;
    if (range) {
      const pos = file.lineCounter.linePos(range[0]);
      line = pos.line;
      col = pos.col;
    }
    return {
      severity: 'error' as const,
      code: 'schema',
      message: fieldPath ? `${fieldPath}: ${issue.message}` : issue.message,
      file: file.relPath,
      line,
      col,
    };
  });
}

function validateWith<T>(
  schema: ZodSchema<T>,
  file: LoadedFile,
): { value?: T; diagnostics: Diagnostic[] } {
  const result = schema.safeParse(file.raw);
  if (result.success) return { value: result.data, diagnostics: [] };
  return { diagnostics: issuesToDiagnostics(result.error.issues, file) };
}

export function validateLoaded(loaded: LoadedTree, profile: Profile): ValidatedTree {
  const diagnostics: Diagnostic[] = [...loaded.loadDiagnostics];

  let tree: Tree;
  if (loaded.treeFile) {
    const r = validateWith(treeSchema, loaded.treeFile);
    diagnostics.push(...r.diagnostics);
    tree = r.value ?? defaultTree(loaded.inputDir);
  } else {
    tree = defaultTree(loaded.inputDir);
  }

  const nodes: ValidatedNode[] = [];
  for (const file of loaded.nodeFiles) {
    const r = validateWith(profile.nodeSchema, file);
    diagnostics.push(...r.diagnostics);
    if (r.value !== undefined) nodes.push({ file, node: profile.mapNode(r.value) });
  }

  const themes: ValidatedTheme[] = [];
  for (const file of loaded.themeFiles) {
    const r = validateWith(themeSchema, file);
    diagnostics.push(...r.diagnostics);
    if (r.value) themes.push({ file, theme: r.value });
  }

  return {
    inputDir: loaded.inputDir,
    tree,
    treeFile: loaded.treeFile,
    nodes,
    themes,
    diagnostics,
  };
}

// Keep z import alive for downstream re-exports.
export { z };

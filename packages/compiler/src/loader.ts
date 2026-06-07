import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Document, LineCounter, parseDocument } from 'yaml';
import type { Diagnostic } from './diagnostics.js';

export interface LoadedFile {
  /** Absolute path on disk. */
  absPath: string;
  /** Path relative to the input dir, used in diagnostics. */
  relPath: string;
  /** Raw source text — kept for future snippet rendering (Phase 4). */
  text: string;
  /** Parsed YAML document with source-position tracking. */
  doc: Document;
  /** Offset → line/col helper from yaml. */
  lineCounter: LineCounter;
  /** Plain JS view of the document. */
  raw: unknown;
}

export interface LoadedTree {
  inputDir: string;
  treeFile?: LoadedFile;
  nodeFiles: LoadedFile[];
  themeFiles: LoadedFile[];
  loadDiagnostics: Diagnostic[];
}

const DEFAULT_NODE_SUFFIXES = ['.skill.yaml', '.skill.yml'];
const THEME_SUFFIXES = ['.theme.yaml', '.theme.yml'];
const TREE_FILES = ['tree.yaml', 'tree.yml'];

function endsWithAny(name: string, suffixes: string[]): boolean {
  return suffixes.some((s) => name.endsWith(s));
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else if (stat.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function loadFile(
  absPath: string,
  inputDir: string,
): {
  file?: LoadedFile;
  diagnostic?: Diagnostic;
} {
  const text = readFileSync(absPath, 'utf8');
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter, keepSourceTokens: true });
  const relPath = relative(inputDir, absPath).replace(/\\/g, '/');

  if (doc.errors.length > 0) {
    const first = doc.errors[0]!;
    const pos = first.pos?.[0] !== undefined ? lineCounter.linePos(first.pos[0]) : undefined;
    return {
      diagnostic: {
        severity: 'error',
        code: 'yaml-parse',
        message: first.message,
        file: relPath,
        line: pos?.line,
        col: pos?.col,
      },
    };
  }

  return {
    file: {
      absPath,
      relPath,
      text,
      doc,
      lineCounter,
      raw: doc.toJS(),
    },
  };
}

export function loadTree(
  inputDir: string,
  nodeSuffixes: string[] = DEFAULT_NODE_SUFFIXES,
): LoadedTree {
  const allFiles = walk(inputDir).sort();
  const nodeFiles: LoadedFile[] = [];
  const themeFiles: LoadedFile[] = [];
  let treeFile: LoadedFile | undefined;
  const loadDiagnostics: Diagnostic[] = [];

  for (const abs of allFiles) {
    const name = abs.split(/[\\/]/).pop()!;
    const isTree = TREE_FILES.includes(name) && abs === join(inputDir, name);
    const isNode = endsWithAny(name, nodeSuffixes);
    const isTheme = endsWithAny(name, THEME_SUFFIXES);
    if (!isTree && !isNode && !isTheme) continue;

    const result = loadFile(abs, inputDir);
    if (result.diagnostic) {
      loadDiagnostics.push(result.diagnostic);
      continue;
    }
    if (!result.file) continue;

    if (isTree) treeFile = result.file;
    else if (isNode) nodeFiles.push(result.file);
    else if (isTheme) themeFiles.push(result.file);
  }

  return { inputDir, treeFile, nodeFiles, themeFiles, loadDiagnostics };
}

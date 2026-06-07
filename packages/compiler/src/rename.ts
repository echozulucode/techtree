import { readFileSync, writeFileSync } from 'node:fs';
import { parseDocument, isSeq, isScalar, type Document } from 'yaml';
import { isValidSkillId } from '@echozedlabs/techtree-schema';
import type { LoadedTree } from './loader.js';
import type { Diagnostic } from './diagnostics.js';

export interface RenameOptions {
  oldId: string;
  newId: string;
  addAlias: boolean;
}

export interface RenamePlan {
  /** Files that will be modified, with what changes. */
  changes: RenameChange[];
  diagnostics: Diagnostic[];
}

export interface RenameChange {
  filePath: string;
  /** Reason this file is being touched. */
  reasons: ('id-replaced' | 'alias-added' | 'requires-updated' | 'recommends-updated')[];
}

/**
 * Plan and (optionally) apply a rename across a loaded tree.
 *
 * Strategy: use yaml's Document API to preserve comments and key ordering on
 * untouched fields. Only the id, aliases array, and requires/recommends arrays
 * get rewritten. Comments attached specifically to those nodes may be lost —
 * worth the trade for not corrupting the rest of the file's formatting.
 */
export function renameInTree(loaded: LoadedTree, opts: RenameOptions, apply: boolean): RenamePlan {
  const diagnostics: Diagnostic[] = [];
  const changes: RenameChange[] = [];

  if (!isValidSkillId(opts.newId)) {
    diagnostics.push({
      severity: 'error',
      code: 'rename-invalid-id',
      message: `New id "${opts.newId}" is not a valid skill id (lowercase namespace.parts[/name]).`,
    });
    return { changes, diagnostics };
  }
  if (opts.oldId === opts.newId) {
    diagnostics.push({
      severity: 'warning',
      code: 'rename-noop',
      message: `Old and new id are the same ("${opts.oldId}") — nothing to do.`,
    });
    return { changes, diagnostics };
  }

  let foundOwner = false;
  let newIdCollision = false;

  for (const file of loaded.nodeFiles) {
    const raw = file.raw as { id?: unknown } | null;
    if (raw && typeof raw === 'object' && raw.id === opts.newId) {
      newIdCollision = true;
      diagnostics.push({
        severity: 'error',
        code: 'rename-collision',
        message: `New id "${opts.newId}" already exists in "${file.relPath}". Pick a different new id.`,
        file: file.relPath,
      });
    }
  }
  if (newIdCollision) return { changes, diagnostics };

  for (const file of loaded.nodeFiles) {
    const text = readFileSync(file.absPath, 'utf8');
    const doc = parseDocument(text);
    const reasons: RenameChange['reasons'] = [];

    if (doc.get('id') === opts.oldId) {
      foundOwner = true;
      doc.set('id', opts.newId);
      reasons.push('id-replaced');
      if (opts.addAlias) {
        const aliasesNode = doc.get('aliases');
        const existing = Array.isArray(aliasesNode) ? aliasesNode.slice() : [];
        if (!existing.includes(opts.oldId)) {
          existing.push(opts.oldId);
          doc.set('aliases', existing);
          reasons.push('alias-added');
        }
      }
    }

    for (const field of ['requires', 'recommends'] as const) {
      const seq = doc.get(field, true);
      if (!seq || !isSeq(seq)) continue;
      let changed = false;
      for (let i = 0; i < seq.items.length; i++) {
        const item = seq.items[i];
        if (isScalar(item) && item.value === opts.oldId) {
          item.value = opts.newId;
          changed = true;
        }
      }
      if (changed) {
        reasons.push(field === 'requires' ? 'requires-updated' : 'recommends-updated');
      }
    }

    if (reasons.length > 0) {
      changes.push({ filePath: file.relPath, reasons });
      if (apply) writeFileSync(file.absPath, doc.toString());
    }
  }

  if (!foundOwner) {
    diagnostics.push({
      severity: 'error',
      code: 'rename-not-found',
      message: `No skill file declared id "${opts.oldId}" in "${loaded.inputDir}".`,
    });
  }

  return { changes, diagnostics };
}

// Silence unused-Document warning — kept in the import list for callers that
// want to type-check intermediate doc results.
export type { Document };

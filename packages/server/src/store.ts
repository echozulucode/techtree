/**
 * SQLite-backed store for Phase 5. Uses Node's built-in node:sqlite
 * (no native compilation needed). Synchronous API.
 *
 * Schema:
 *   tree_state(user_id, tree_id, payload)  — composite PK; payload is the
 *     full TreeState JSON. Read-modify-write is fine at this scale.
 *   audit_log(id PK AUTOINCREMENT, user_id, tree_id, skill_id, actor,
 *             role, timestamp, before, after, note)
 *     — append-only; before/after are JSON blobs of SkillStateEntry, both
 *     nullable so we capture creates (before=null) and clears (after=null).
 *
 * Every mutating store call writes an audit row in the SAME transaction
 * and stamps the returned entry's audit_id with the new rowid.
 */

import { createRequire } from 'node:module';
import type * as NodeSqlite from 'node:sqlite';
import {
  emptyState,
  skillStateEntry,
  treeStateSchema,
  type SkillStateEntry,
  type TreeState,
} from '@echozedlabs/techtree-state';
import type { Principal } from './auth.js';

// node:sqlite is a Node 22.5+ built-in (experimental). Vite's resolver
// (used by vitest's transform) strips the `node:` prefix and tries to
// resolve it as a regular package, which fails. Loading it via
// createRequire keeps the import opaque to static analysis at runtime;
// the type-only import above is elided at build time so Vite never sees it.
const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire('node:sqlite') as typeof NodeSqlite;

export interface AuditRow {
  id: number;
  user_id: string;
  tree_id: string;
  skill_id: string;
  actor: string;
  role: string;
  timestamp: string;
  before: SkillStateEntry | null;
  after: SkillStateEntry | null;
  note: string | null;
}

export interface PutSkillResult {
  state: TreeState;
  audit_id: number;
}

export class SqliteStateStore {
  private readonly db: NodeSqlite.DatabaseSync;

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tree_state (
        user_id TEXT NOT NULL,
        tree_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (user_id, tree_id)
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   TEXT    NOT NULL,
        tree_id   TEXT    NOT NULL,
        skill_id  TEXT    NOT NULL,
        actor     TEXT    NOT NULL,
        role      TEXT    NOT NULL,
        timestamp TEXT    NOT NULL,
        before    TEXT,
        after     TEXT,
        note      TEXT
      );
      CREATE INDEX IF NOT EXISTS audit_log_by_tree
        ON audit_log(tree_id, user_id, skill_id, id);
    `);
  }

  close(): void {
    this.db.close();
  }

  /** Read the full TreeState for a (user, tree). Returns an empty state if no row exists. */
  getState(userId: string, treeId: string): TreeState {
    const row = this.db
      .prepare('SELECT payload FROM tree_state WHERE user_id = ? AND tree_id = ?')
      .get(userId, treeId) as { payload: string } | undefined;
    if (!row) return emptyState(userId, treeId);
    return treeStateSchema.parse(JSON.parse(row.payload));
  }

  /**
   * Replace a single skill entry, stamp it with the new audit_id, and append
   * an audit_log row — all in one transaction.
   */
  putSkillEntry(
    treeId: string,
    targetUserId: string,
    skillId: string,
    nextEntry: SkillStateEntry,
    principal: Principal,
    note: string | null,
  ): PutSkillResult {
    skillStateEntry.parse(nextEntry);
    const tx = this.db.prepare('BEGIN IMMEDIATE');
    const commit = this.db.prepare('COMMIT');
    const rollback = this.db.prepare('ROLLBACK');

    tx.run();
    try {
      const current = this.getState(targetUserId, treeId);
      const before = current.skills[skillId] ?? null;
      const timestamp = new Date().toISOString();

      // Insert audit row first so we know the rowid to stamp into the entry.
      const insertAudit = this.db.prepare(
        `INSERT INTO audit_log
           (user_id, tree_id, skill_id, actor, role, timestamp, before, after, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      const auditResult = insertAudit.run(
        targetUserId,
        treeId,
        skillId,
        principal.user_id,
        principal.role,
        timestamp,
        before ? JSON.stringify(before) : null,
        JSON.stringify(nextEntry),
        note,
      );
      const auditId = Number(auditResult.lastInsertRowid);

      const stamped: SkillStateEntry = { ...nextEntry, audit_id: auditId };
      // Now-correct "after" payload reflects the audit_id stamp.
      this.db
        .prepare('UPDATE audit_log SET after = ? WHERE id = ?')
        .run(JSON.stringify(stamped), auditId);

      const nextState: TreeState = {
        ...current,
        skills: { ...current.skills, [skillId]: stamped },
      };
      this.writeStateRow(targetUserId, treeId, nextState);

      commit.run();
      return { state: nextState, audit_id: auditId };
    } catch (err) {
      rollback.run();
      throw err;
    }
  }

  /** Remove a skill entry; audited as `before=current, after=null`. */
  clearSkillEntry(
    treeId: string,
    targetUserId: string,
    skillId: string,
    principal: Principal,
    note: string | null,
  ): { state: TreeState; audit_id: number | null } {
    const tx = this.db.prepare('BEGIN IMMEDIATE');
    const commit = this.db.prepare('COMMIT');
    const rollback = this.db.prepare('ROLLBACK');

    tx.run();
    try {
      const current = this.getState(targetUserId, treeId);
      const before = current.skills[skillId] ?? null;
      if (!before) {
        commit.run();
        return { state: current, audit_id: null };
      }
      const timestamp = new Date().toISOString();
      const insertAudit = this.db.prepare(
        `INSERT INTO audit_log
           (user_id, tree_id, skill_id, actor, role, timestamp, before, after, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      );
      const auditResult = insertAudit.run(
        targetUserId,
        treeId,
        skillId,
        principal.user_id,
        principal.role,
        timestamp,
        JSON.stringify(before),
        note,
      );
      const auditId = Number(auditResult.lastInsertRowid);

      const { [skillId]: _removed, ...rest } = current.skills;
      const nextState: TreeState = { ...current, skills: rest };
      this.writeStateRow(targetUserId, treeId, nextState);

      commit.run();
      return { state: nextState, audit_id: auditId };
    } catch (err) {
      rollback.run();
      throw err;
    }
  }

  /** Read audit rows for one (tree, user) — newest first. Bounded by limit. */
  listAudit(treeId: string, userId: string, limit = 100): AuditRow[] {
    const rows = this.db
      .prepare(
        `SELECT id, user_id, tree_id, skill_id, actor, role, timestamp, before, after, note
           FROM audit_log
          WHERE tree_id = ? AND user_id = ?
          ORDER BY id DESC
          LIMIT ?`,
      )
      .all(treeId, userId, limit) as {
      id: number;
      user_id: string;
      tree_id: string;
      skill_id: string;
      actor: string;
      role: string;
      timestamp: string;
      before: string | null;
      after: string | null;
      note: string | null;
    }[];
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      tree_id: r.tree_id,
      skill_id: r.skill_id,
      actor: r.actor,
      role: r.role,
      timestamp: r.timestamp,
      before: r.before ? (JSON.parse(r.before) as SkillStateEntry) : null,
      after: r.after ? (JSON.parse(r.after) as SkillStateEntry) : null,
      note: r.note,
    }));
  }

  private writeStateRow(userId: string, treeId: string, state: TreeState): void {
    this.db
      .prepare(
        `INSERT INTO tree_state (user_id, tree_id, payload)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, tree_id) DO UPDATE SET payload = excluded.payload`,
      )
      .run(userId, treeId, JSON.stringify(state));
  }
}

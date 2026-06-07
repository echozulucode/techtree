import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { setStatusEnum, type SetStatus, type SkillStateEntry } from '@echozedlabs/techtree-state';
import { tokenFromHeader, type AuthConfig, type Principal, type Role } from './auth.js';
import { SqliteStateStore } from './store.js';

export interface BuildServerOptions {
  /** Directory containing tree.ir.json (produced by `skilltree build`). */
  irDir: string;
  /** SQLite file path. ':memory:' for ephemeral (used by tests). */
  dbPath: string;
  auth: AuthConfig;
  /** Optional Fastify logger override. Default: enabled in non-test. */
  logger?: boolean;
}

const putBodySchema = z.object({
  status: setStatusEnum,
  note: z.string().optional(),
});

const transitionSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('achieved'), note: z.string().min(1) }),
  z.object({ decision: z.literal('rejected'), note: z.string().min(1) }),
]);

const transitionTargetStatus: Record<'achieved' | 'rejected', SetStatus> = {
  achieved: 'achieved',
  rejected: 'rejected',
};

export function buildServer(opts: BuildServerOptions): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });
  const store = new SqliteStateStore(opts.dbPath);

  app.addHook('onClose', async () => {
    store.close();
  });

  // --- IR -------------------------------------------------------------------
  app.get('/tree.ir.json', async (_req, reply) => {
    const irPath = resolve(opts.irDir, 'tree.ir.json');
    if (!existsSync(irPath)) {
      return reply.status(404).send({ error: `IR not found at ${irPath}` });
    }
    // Cache the file body once per request; fastify will set content-type.
    return reply.header('content-type', 'application/json').send(readFileSync(irPath, 'utf8'));
  });

  // --- State read -----------------------------------------------------------
  // Learner can read own state; author can read any user's state.
  app.get<{ Params: { userId: string; treeId: string } }>(
    '/state/:userId/:treeId',
    async (req, reply) => {
      const principal = authenticate(req, opts.auth);
      if (!principal) return reply.status(401).send({ error: 'missing or unknown token' });
      const { userId, treeId } = req.params;
      if (principal.role !== 'author' && principal.user_id !== userId) {
        return reply.status(403).send({ error: 'learner can only read own state' });
      }
      return store.getState(userId, treeId);
    },
  );

  // --- State write: learner self-mutation (in_progress / submitted / pending_approval) --
  // Authors cannot use this endpoint to silently change a learner's status —
  // for `achieved`/`rejected` they must go through /transition (audited as a decision).
  app.put<{
    Params: { userId: string; treeId: string; skillId: string };
    Body: unknown;
  }>('/state/:userId/:treeId/skill/:skillId', async (req, reply) => {
    const principal = authenticate(req, opts.auth);
    if (!principal) return reply.status(401).send({ error: 'missing or unknown token' });

    const parsed = putBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid body', details: parsed.error.format() });
    }
    const { status, note } = parsed.data;

    // Approval-only statuses must go through the transition endpoint.
    if (status === 'achieved' || status === 'rejected') {
      return reply.status(400).send({
        error: `status "${status}" can only be set via POST /state/:userId/:treeId/skill/:skillId/transition`,
      });
    }
    const { userId, treeId, skillId } = req.params;
    if (principal.user_id !== userId) {
      return reply.status(403).send({ error: "cannot mutate another user's self-status" });
    }

    const current = store.getState(userId, treeId);
    const existing: SkillStateEntry | undefined = current.skills[skillId];
    const now = new Date().toISOString();
    const next: SkillStateEntry = {
      ...existing,
      status,
      ...(status === 'in_progress' && !existing?.started_at ? { started_at: now } : {}),
      ...(status === 'submitted' || status === 'pending_approval'
        ? { submitted_at: existing?.submitted_at ?? now }
        : {}),
    };
    const result = store.putSkillEntry(treeId, userId, skillId, next, principal, note ?? null);
    return result.state;
  });

  // --- Approval workflow: author decision ----------------------------------
  app.post<{
    Params: { userId: string; treeId: string; skillId: string };
    Body: unknown;
  }>('/state/:userId/:treeId/skill/:skillId/transition', async (req, reply) => {
    const principal = authenticate(req, opts.auth);
    if (!principal) return reply.status(401).send({ error: 'missing or unknown token' });
    if (principal.role !== 'author') {
      return reply.status(403).send({ error: 'only authors can decide on submissions' });
    }
    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid body — decision and non-empty note required',
        details: parsed.error.format(),
      });
    }
    const { userId, treeId, skillId } = req.params;
    const current = store.getState(userId, treeId);
    const existing: SkillStateEntry | undefined = current.skills[skillId];
    if (!existing || (existing.status !== 'submitted' && existing.status !== 'pending_approval')) {
      return reply.status(409).send({
        error: `skill "${skillId}" is not awaiting approval (current status: ${existing?.status ?? 'none'})`,
      });
    }
    const nextStatus = transitionTargetStatus[parsed.data.decision];
    const now = new Date().toISOString();
    const next: SkillStateEntry = {
      ...existing,
      status: nextStatus,
      approver: principal.user_id,
      ...(nextStatus === 'achieved' ? { completed_at: now } : {}),
    };
    const result = store.putSkillEntry(treeId, userId, skillId, next, principal, parsed.data.note);
    return result.state;
  });

  // --- Audit log read ------------------------------------------------------
  app.get<{
    Params: { userId: string; treeId: string };
    Querystring: { limit?: string };
  }>('/audit/:userId/:treeId', async (req, reply) => {
    const principal = authenticate(req, opts.auth);
    if (!principal) return reply.status(401).send({ error: 'missing or unknown token' });
    const { userId, treeId } = req.params;
    if (principal.role !== 'author' && principal.user_id !== userId) {
      return reply.status(403).send({ error: 'learner can only read own audit log' });
    }
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit, 10) || 100, 1000) : 100;
    return store.listAudit(treeId, userId, limit);
  });

  return app;
}

function authenticate(req: FastifyRequest, auth: AuthConfig): Principal | null {
  const token = tokenFromHeader(req.headers.authorization);
  if (!token) return null;
  return auth.tokens.get(token) ?? null;
}

// Re-export Role so callers building options don't need a deep import.
export type { Role };

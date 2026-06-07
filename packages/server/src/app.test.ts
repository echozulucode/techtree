import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './app.js';
import { parseTokenString } from './auth.js';

function makeIrDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'skilltree-server-test-'));
  mkdirSync(dir, { recursive: true });
  const ir = {
    ir_version: 1,
    tree: { id: 'test-tree', title: 'Test' },
    nodes: [
      {
        id: 'skill.a',
        title: 'A',
        tags: [],
        position: { x: 0, y: 0 },
        size: { width: 100, height: 60 },
        pinned: false,
        aliases: [],
        data: {},
      },
    ],
    edges: [],
    bands: [],
    tracks: [],
    meta: { source_count: 1, node_count: 1, edge_count: 0 },
  };
  writeFileSync(join(dir, 'tree.ir.json'), JSON.stringify(ir));
  return dir;
}

const TOKENS = 'author-token:author:alice,learner-token:learner:bob,other-learner:learner:carol';

describe('server: auth + IR + state CRUD + audit + approval workflow', () => {
  let app: FastifyInstance;
  let irDir: string;

  beforeEach(() => {
    irDir = makeIrDir();
    app = buildServer({
      irDir,
      dbPath: ':memory:',
      auth: parseTokenString(TOKENS),
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves the IR without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/tree.ir.json' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { tree: { id: string } };
    expect(body.tree.id).toBe('test-tree');
  });

  it('rejects unauthenticated state reads', async () => {
    const res = await app.inject({ method: 'GET', url: '/state/bob/test-tree' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unknown tokens', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/state/bob/test-tree',
      headers: { authorization: 'Bearer bogus' },
    });
    expect(res.statusCode).toBe(401);
  });

  it("learner can read own state, not another learner's", async () => {
    const own = await app.inject({
      method: 'GET',
      url: '/state/bob/test-tree',
      headers: { authorization: 'Bearer learner-token' },
    });
    expect(own.statusCode).toBe(200);

    const other = await app.inject({
      method: 'GET',
      url: '/state/carol/test-tree',
      headers: { authorization: 'Bearer learner-token' },
    });
    expect(other.statusCode).toBe(403);
  });

  it("author can read any user's state", async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/state/bob/test-tree',
      headers: { authorization: 'Bearer author-token' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('learner writes own status; PUT cannot set achieved/rejected', async () => {
    const ok = await app.inject({
      method: 'PUT',
      url: '/state/bob/test-tree/skill/skill.a',
      headers: { authorization: 'Bearer learner-token' },
      payload: { status: 'in_progress' },
    });
    expect(ok.statusCode).toBe(200);
    const after = JSON.parse(ok.body) as {
      skills: Record<string, { status: string; audit_id?: number }>;
    };
    expect(after.skills['skill.a']?.status).toBe('in_progress');
    expect(typeof after.skills['skill.a']?.audit_id).toBe('number');

    const bad = await app.inject({
      method: 'PUT',
      url: '/state/bob/test-tree/skill/skill.a',
      headers: { authorization: 'Bearer learner-token' },
      payload: { status: 'achieved' },
    });
    expect(bad.statusCode).toBe(400);
  });

  it("learner cannot mutate another user's state", async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/state/carol/test-tree/skill/skill.a',
      headers: { authorization: 'Bearer learner-token' },
      payload: { status: 'in_progress' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('approval workflow: submitted → pending_approval → achieved by author', async () => {
    // Learner submits
    await app.inject({
      method: 'PUT',
      url: '/state/bob/test-tree/skill/skill.a',
      headers: { authorization: 'Bearer learner-token' },
      payload: { status: 'submitted' },
    });
    await app.inject({
      method: 'PUT',
      url: '/state/bob/test-tree/skill/skill.a',
      headers: { authorization: 'Bearer learner-token' },
      payload: { status: 'pending_approval' },
    });

    // Learner cannot self-approve
    const selfApprove = await app.inject({
      method: 'POST',
      url: '/state/bob/test-tree/skill/skill.a/transition',
      headers: { authorization: 'Bearer learner-token' },
      payload: { decision: 'achieved', note: 'pls' },
    });
    expect(selfApprove.statusCode).toBe(403);

    // Author approves
    const approve = await app.inject({
      method: 'POST',
      url: '/state/bob/test-tree/skill/skill.a/transition',
      headers: { authorization: 'Bearer author-token' },
      payload: { decision: 'achieved', note: 'looks good' },
    });
    expect(approve.statusCode).toBe(200);
    const after = JSON.parse(approve.body) as {
      skills: Record<string, { status: string; approver?: string; completed_at?: string }>;
    };
    expect(after.skills['skill.a']?.status).toBe('achieved');
    expect(after.skills['skill.a']?.approver).toBe('alice');
    expect(after.skills['skill.a']?.completed_at).toMatch(/T/);
  });

  it('approval workflow: rejection requires non-empty note', async () => {
    await app.inject({
      method: 'PUT',
      url: '/state/bob/test-tree/skill/skill.a',
      headers: { authorization: 'Bearer learner-token' },
      payload: { status: 'pending_approval' },
    });

    const noNote = await app.inject({
      method: 'POST',
      url: '/state/bob/test-tree/skill/skill.a/transition',
      headers: { authorization: 'Bearer author-token' },
      payload: { decision: 'rejected', note: '' },
    });
    expect(noNote.statusCode).toBe(400);

    const withNote = await app.inject({
      method: 'POST',
      url: '/state/bob/test-tree/skill/skill.a/transition',
      headers: { authorization: 'Bearer author-token' },
      payload: { decision: 'rejected', note: 'missing evidence' },
    });
    expect(withNote.statusCode).toBe(200);
    const body = JSON.parse(withNote.body) as { skills: Record<string, { status: string }> };
    expect(body.skills['skill.a']?.status).toBe('rejected');
  });

  it('refuses approval for a skill not awaiting decision', async () => {
    // No prior state — skill.a doesn't exist
    const res = await app.inject({
      method: 'POST',
      url: '/state/bob/test-tree/skill/skill.a/transition',
      headers: { authorization: 'Bearer author-token' },
      payload: { decision: 'achieved', note: 'why not' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('audit log records every transition with actor, before, after, note', async () => {
    await app.inject({
      method: 'PUT',
      url: '/state/bob/test-tree/skill/skill.a',
      headers: { authorization: 'Bearer learner-token' },
      payload: { status: 'in_progress', note: 'starting' },
    });
    await app.inject({
      method: 'PUT',
      url: '/state/bob/test-tree/skill/skill.a',
      headers: { authorization: 'Bearer learner-token' },
      payload: { status: 'pending_approval', note: 'done' },
    });
    await app.inject({
      method: 'POST',
      url: '/state/bob/test-tree/skill/skill.a/transition',
      headers: { authorization: 'Bearer author-token' },
      payload: { decision: 'achieved', note: 'approved' },
    });

    const audit = await app.inject({
      method: 'GET',
      url: '/audit/bob/test-tree',
      headers: { authorization: 'Bearer author-token' },
    });
    expect(audit.statusCode).toBe(200);
    const rows = JSON.parse(audit.body) as Array<{
      actor: string;
      role: string;
      after: { status: string } | null;
      note: string | null;
    }>;
    expect(rows.length).toBe(3);
    // Newest-first
    expect(rows[0]?.actor).toBe('alice');
    expect(rows[0]?.role).toBe('author');
    expect(rows[0]?.after?.status).toBe('achieved');
    expect(rows[0]?.note).toBe('approved');
    expect(rows[2]?.actor).toBe('bob');
    expect(rows[2]?.after?.status).toBe('in_progress');
  });
});

import { describe, expect, it } from 'vitest';
import type { IR } from '@echozedlabs/techtree-ir';
import { IR_VERSION } from '@echozedlabs/techtree-ir';
import { deriveStatuses, pickFrontierNodeId } from './derive.js';
import { emptyState } from './schema.js';

function makeIr(nodes: { id: string; track?: string }[], edges: [string, string][]): IR {
  return {
    ir_version: IR_VERSION,
    tree: { id: 't', title: 't' },
    nodes: nodes.map((n) => ({
      id: n.id,
      title: n.id,
      tags: [],
      ...(n.track !== undefined ? { track: n.track } : {}),
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
      pinned: false,
      aliases: [],
      data: {},
    })),
    edges: edges.map(([from, to]) => ({ from, to, kind: 'requires' as const })),
    bands: [],
    tracks: [],
    meta: { source_count: 0, node_count: nodes.length, edge_count: edges.length },
  };
}

describe('deriveStatuses', () => {
  it('marks no-prereq nodes as available when no state', () => {
    const ir = makeIr([{ id: 'a' }, { id: 'b' }], []);
    const m = deriveStatuses(ir, null);
    expect(m.get('a')).toBe('available');
    expect(m.get('b')).toBe('available');
  });

  it('marks downstream nodes as locked until prereqs are achieved', () => {
    const ir = makeIr(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        ['a', 'b'],
        ['b', 'c'],
      ],
    );
    const m1 = deriveStatuses(ir, emptyState('u', 't'));
    expect(m1.get('a')).toBe('available');
    expect(m1.get('b')).toBe('locked');
    expect(m1.get('c')).toBe('locked');

    const state = emptyState('u', 't');
    state.skills = { a: { status: 'achieved' } };
    const m2 = deriveStatuses(ir, state);
    expect(m2.get('a')).toBe('achieved');
    expect(m2.get('b')).toBe('available');
    expect(m2.get('c')).toBe('locked');
  });

  it('honors explicit in_progress / submitted statuses', () => {
    const ir = makeIr([{ id: 'a' }], []);
    const state = emptyState('u', 't');
    state.skills = { a: { status: 'in_progress' } };
    expect(deriveStatuses(ir, state).get('a')).toBe('in_progress');
  });

  it('honors explicit pending_approval and rejected statuses (Phase 5)', () => {
    const ir = makeIr([{ id: 'a' }, { id: 'b' }], []);
    const state = emptyState('u', 't');
    state.skills = {
      a: { status: 'pending_approval', submitted_at: '2026-05-22T00:00:00Z', audit_id: 7 },
      b: { status: 'rejected', submitted_at: '2026-05-22T00:00:00Z', audit_id: 8 },
    };
    const m = deriveStatuses(ir, state);
    expect(m.get('a')).toBe('pending_approval');
    expect(m.get('b')).toBe('rejected');
  });
});

describe('pickFrontierNodeId', () => {
  it('prefers in_progress on primary_path', () => {
    const ir = makeIr(
      [
        { id: 'a', track: 'main' },
        { id: 'b', track: 'main' },
        { id: 'c', track: 'side' },
      ],
      [],
    );
    const state = emptyState('u', 't', 'main');
    state.skills = { b: { status: 'in_progress' }, c: { status: 'in_progress' } };
    const statuses = deriveStatuses(ir, state);
    expect(pickFrontierNodeId(ir, statuses, 'main')).toBe('b');
  });

  it('falls back to available when nothing is in progress', () => {
    const ir = makeIr([{ id: 'a' }, { id: 'b' }], [['a', 'b']]);
    const statuses = deriveStatuses(ir, null);
    const id = pickFrontierNodeId(ir, statuses);
    expect(['a', 'b']).toContain(id);
  });
});

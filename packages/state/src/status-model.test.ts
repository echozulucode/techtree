import { describe, expect, it } from 'vitest';
import { IR_VERSION, type IR, type IREdge } from '@echozedlabs/techtree-ir';
import {
  capabilityStatusModel,
  deriveStatusView,
  getStatusModel,
  prerequisiteIndex,
  skillStatusModel,
} from './status-model.js';
import { deriveStatuses } from './derive.js';
import { emptyState, treeStateSchema } from './schema.js';

function makeIr(ids: string[], edges: IREdge[], profile?: string): IR {
  return {
    ir_version: IR_VERSION,
    tree: { id: 't', title: 't', ...(profile ? { profile } : {}) },
    nodes: ids.map((id) => ({
      id,
      title: id,
      tags: [],
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
      pinned: false,
      aliases: [],
      data: {},
    })),
    edges,
    bands: [],
    tracks: [],
    meta: { source_count: ids.length, node_count: ids.length, edge_count: edges.length },
  };
}

const req = (from: string, to: string, group?: string): IREdge => ({
  from,
  to,
  kind: 'requires',
  ...(group ? { group } : {}),
});

// safe-update needs packaging AND signing AND (rollback OR recovery-image)
const updateIr = makeIr(
  ['packaging', 'signing', 'rollback', 'recovery', 'safe-update'],
  [
    req('packaging', 'safe-update'),
    req('signing', 'safe-update'),
    req('rollback', 'safe-update', 'any-1'),
    req('recovery', 'safe-update', 'any-1'),
  ],
  'capability',
);

describe('capability status model', () => {
  it('is selected from the IR profile; unknown profiles fall back to the skill model', () => {
    expect(getStatusModel('capability')).toBe(capabilityStatusModel);
    expect(getStatusModel('delivery')).toBe(skillStatusModel);
    expect(getStatusModel('nope')).toBe(skillStatusModel);
    expect(getStatusModel(undefined)).toBe(skillStatusModel);
  });

  it('treats unset nodes as not_started and derives available / locked for display', () => {
    const v = deriveStatusView(updateIr, {}, capabilityStatusModel);
    expect(v.get('packaging')).toMatchObject({ status: 'available', stored: 'not_started', prerequisitesMet: true });
    expect(v.get('safe-update')).toMatchObject({ status: 'locked', stored: 'not_started', prerequisitesMet: false });
    expect(v.get('safe-update')!.missing).toEqual({
      all: ['packaging', 'signing'],
      anyOf: [['rollback', 'recovery']],
    });
  });

  it('becomes available when all-of prerequisites are >= demonstrated and ONE any-of member is', () => {
    const v = deriveStatusView(
      updateIr,
      { packaging: 'operational', signing: { status: 'demonstrated' }, recovery: 'strategic_standard' },
      capabilityStatusModel,
    );
    expect(v.get('safe-update')!.status).toBe('available');
    expect(v.get('safe-update')!.missing).toEqual({ all: [], anyOf: [] });
  });

  it('investigating does not satisfy a prerequisite; legacy and retiring still do', () => {
    const base = { packaging: 'operational', signing: 'operational' } as const;
    expect(
      deriveStatusView(updateIr, { ...base, rollback: 'investigating' }, capabilityStatusModel).get('safe-update')!
        .status,
    ).toBe('locked');
    expect(
      deriveStatusView(updateIr, { ...base, rollback: 'legacy' }, capabilityStatusModel).get('safe-update')!.status,
    ).toBe('available');
    expect(
      deriveStatusView(updateIr, { ...base, rollback: 'retiring' }, capabilityStatusModel).get('safe-update')!
        .status,
    ).toBe('available');
  });

  it('a stored maturity beyond not_started is shown as itself, even while prerequisites are unmet', () => {
    const v = deriveStatusView(updateIr, { 'safe-update': 'investigating' }, capabilityStatusModel);
    expect(v.get('safe-update')).toMatchObject({ status: 'investigating', prerequisitesMet: false });
  });

  it('indexes all-of and any-of prerequisites from IR edges', () => {
    expect(prerequisiteIndex(updateIr).get('safe-update')).toEqual({
      all: ['packaging', 'signing'],
      anyOf: [{ id: 'any-1', members: ['rollback', 'recovery'] }],
    });
  });
});

describe('skill model keeps its behaviour, now any-of aware', () => {
  it('any-of: one achieved member unlocks the dependent', () => {
    const ir = makeIr(['a', 'b', 'c'], [req('a', 'c', 'any-1'), req('b', 'c', 'any-1')]);
    expect(deriveStatuses(ir, null).get('c')).toBe('locked');
    const state = emptyState('u', 't');
    state.skills = { b: { status: 'achieved' } };
    expect(deriveStatuses(ir, state).get('c')).toBe('available');
  });
});

describe('treeStateSchema validates statuses against the profile model', () => {
  it('accepts capability statuses when profile is capability', () => {
    const ok = treeStateSchema.safeParse({
      user_id: 'demo',
      tree_id: 't',
      profile: 'capability',
      skills: { a: { status: 'operational', achieved_eurekas: ['x'], updated_by: 'grace' } },
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a skill status in a capability state and vice versa', () => {
    expect(
      treeStateSchema.safeParse({
        user_id: 'u',
        tree_id: 't',
        profile: 'capability',
        skills: { a: { status: 'achieved' } },
      }).success,
    ).toBe(false);
    expect(
      treeStateSchema.safeParse({ user_id: 'u', tree_id: 't', skills: { a: { status: 'operational' } } }).success,
    ).toBe(false);
  });
});

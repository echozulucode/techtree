import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { capabilityData } from '@echozedlabs/techtree-schema';
import {
  capabilityProfile,
  compile,
  detectTreeProfile,
  hasErrors,
  skillProfile,
  stableStringify,
} from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'test-fixtures');
const repo = join(here, '..', '..', '..');
const demoDir = join(repo, 'examples', 'engineering-platform');

async function codesFor(fixture: string): Promise<string[]> {
  const result = await compile(join(fixtures, fixture), capabilityProfile);
  return result.diagnostics.map((d) => d.code);
}

describe('capability profile — schema and mapping', () => {
  it('maps kind/era/branch onto category/band/track and packs card fields into data', async () => {
    const result = await compile(join(fixtures, 'capability-any-of'), capabilityProfile);
    expect(result.diagnostics).toEqual([]);
    const ir = result.ir!;
    expect(ir.tree.profile).toBe('capability');
    const goal = ir.nodes.find((n) => n.id === 't.cap/hardware-independent')!;
    expect(goal.category).toBe('milestone');
    expect(goal.band).toBe('two');
    expect(goal.track).toBe('bottom');
    const data = capabilityData(goal)!;
    expect(data).toMatchObject({
      kind: 'milestone',
      summary: 'Most work happens without hardware.',
      unlocks: ['Faster schedules'],
      eurekas: [{ id: 'first-sim-test', statement: 'A test passes against the simulator.' }],
      implementations: ['technology:qemu', 'Rust'],
      links: [{ type: 'example', ref: 'sim-bench', relation: 'demonstrates' }],
      owner: 'Test Engineering',
      target_status: 'operational',
    });
  });

  it('emits any-of members as grouped requires edges and plain prerequisites without a group', async () => {
    const ir = (await compile(join(fixtures, 'capability-any-of'), capabilityProfile)).ir!;
    const into = ir.edges.filter((e) => e.to === 't.cap/hardware-independent');
    expect(into).toEqual([
      { from: 't.cap/hal', to: 't.cap/hardware-independent', kind: 'requires' },
      { from: 't.cap/replay', to: 't.cap/hardware-independent', kind: 'requires', group: 'any-1' },
      { from: 't.cap/simulation', to: 't.cap/hardware-independent', kind: 'requires', group: 'any-1' },
    ]);
  });

  it('rejects unknown fields and bad statuses (strict schema)', () => {
    const bad = capabilityProfile.nodeSchema.safeParse({
      id: 't.cap/x',
      title: 'X',
      kind: 'capability',
      target_status: 'done',
      product: 'Jenkins',
    });
    expect(bad.success).toBe(false);
    const badLink = capabilityProfile.nodeSchema.safeParse({
      id: 't.cap/x',
      title: 'X',
      kind: 'capability',
      links: [{ type: 'example', ref: 'a', relation: 'mentions' }],
    });
    expect(badLink.success).toBe(false);
  });
});

describe('capability profile — lint rules', () => {
  it('era-regression: a prerequisite in a later era is an error that names both nodes', async () => {
    const result = await compile(join(fixtures, 'capability-era-regression'), capabilityProfile);
    const d = result.diagnostics.find((x) => x.code === 'era-regression');
    expect(d?.severity).toBe('error');
    expect(d?.message).toContain('t.cap/early-thing');
    expect(d?.message).toContain('t.cap/late-thing');
    expect(result.ir).toBeUndefined();
  });

  it('unreachable-milestone: a milestone with no prerequisites is flagged', async () => {
    expect(await codesFor('capability-unreachable')).toContain('unreachable-milestone');
  });

  it('wonder-missing-benefit: wonders must state a benefit', async () => {
    const result = await compile(join(fixtures, 'capability-wonder-benefit'), capabilityProfile);
    const d = result.diagnostics.find((x) => x.code === 'wonder-missing-benefit');
    expect(d?.severity).toBe('error');
  });

  it('duplicate-eureka: eureka ids are unique within a node', async () => {
    expect(await codesFor('capability-duplicate-eureka')).toContain('duplicate-eureka');
  });
});

describe('any-of groups — generic engine validation (ADR-0006)', () => {
  it('unknown references inside a group are errors with a did-you-mean hint', async () => {
    const result = await compile(join(fixtures, 'any-of-unknown-ref'), capabilityProfile);
    const d = result.diagnostics.find((x) => x.code === 'unknown-ref');
    expect(d?.message).toContain('t.cap/missing');
    expect(result.ir).toBeUndefined();
  });

  it('warns on single-member and redundant groups', async () => {
    const codes = await codesFor('any-of-hygiene');
    expect(codes).toContain('any-of-singleton');
    expect(codes).toContain('any-of-redundant');
  });

  it('a cycle through an any-of member is still a cycle, naming both nodes', async () => {
    const result = await compile(join(fixtures, 'any-of-cycle'), capabilityProfile);
    const d = result.diagnostics.find((x) => x.code === 'cycle');
    expect(d?.message).toContain('t.cap/platform-api');
    expect(d?.message).toContain('t.cap/product-platform');
  });
});

describe('lane layout', () => {
  it('places every node inside its track lane, lanes in declared order, without overlaps', async () => {
    const ir = (await compile(join(fixtures, 'capability-any-of'), capabilityProfile)).ir!;
    const top = ir.tracks.find((t) => t.id === 'top')!;
    const bottom = ir.tracks.find((t) => t.id === 'bottom')!;
    expect(top.order).toBe(0);
    expect(top.color).toBe('#336699');
    expect(top.lane!.y).toBeLessThan(bottom.lane!.y);
    for (const n of ir.nodes) {
      const lane = ir.tracks.find((t) => t.id === n.track)!.lane!;
      expect(n.position.y).toBeGreaterThanOrEqual(lane.y);
      expect(n.position.y + n.size.height).toBeLessThanOrEqual(lane.y + lane.height);
    }
    for (const a of ir.nodes) {
      for (const b of ir.nodes) {
        if (a.id >= b.id) continue;
        const overlap =
          a.position.x < b.position.x + b.size.width &&
          b.position.x < a.position.x + a.size.width &&
          a.position.y < b.position.y + b.size.height &&
          b.position.y < a.position.y + a.size.height;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });
});

describe('profile selection', () => {
  it('reads tree.profile from tree.yaml', () => {
    expect(detectTreeProfile(demoDir)).toBe('capability');
    expect(detectTreeProfile(join(fixtures, 'orphan'))).toBeUndefined();
  });

  it('warns when compiled with a different profile than tree.yaml declares', async () => {
    const result = await compile(join(fixtures, 'capability-any-of'), skillProfile);
    expect(result.diagnostics.map((d) => d.code)).toContain('profile-mismatch');
  });
});

describe('engineering-platform demo example', () => {
  it('compiles cleanly: 6 eras, 8 branches, milestones, wonders and any-of groups', async () => {
    const result = await compile(demoDir, capabilityProfile);
    expect(result.diagnostics).toEqual([]);
    expect(hasErrors(result.diagnostics)).toBe(false);
    const ir = result.ir!;
    expect(ir.bands).toHaveLength(6);
    expect(ir.tracks).toHaveLength(8);
    expect(ir.tracks.every((t) => t.lane !== undefined)).toBe(true);
    expect(ir.nodes.length).toBeGreaterThanOrEqual(40);
    const kinds = (k: string) => ir.nodes.filter((n) => n.category === k).map((n) => n.title);
    expect(kinds('milestone')).toEqual(
      expect.arrayContaining([
        'Platform SDK',
        'Push-Button Release',
        'Hardware-Independent Development',
        'Trusted Fleet Update',
      ]),
    );
    expect(kinds('wonder')).toEqual(
      expect.arrayContaining([
        'Developer Portal',
        'Hardware Simulation Lab',
        'Engineering Knowledge Graph',
        'Self-Service Development Environment',
        'Digital Twin',
      ]),
    );
    for (const w of ir.nodes.filter((n) => n.category === 'wonder')) {
      expect(capabilityData(w)?.benefit).toBeTruthy();
    }
    expect(ir.edges.some((e) => e.group !== undefined)).toBe(true);
    // write-up cross-link: packaging + signing + rollback → safe automatic update
    const sau = ir.edges.filter((e) => e.to === 'eng.platform/safe-automatic-update').map((e) => e.from);
    expect(sau.sort()).toEqual([
      'eng.platform/artifact-signing',
      'eng.platform/rollback-support',
      'eng.platform/software-packaging',
    ]);
  });

  it('is byte-stable and matches the committed IR', async () => {
    const a = await compile(demoDir, capabilityProfile);
    const b = await compile(demoDir, capabilityProfile);
    const fresh = stableStringify(a.ir) + '\n';
    expect(stableStringify(b.ir) + '\n').toBe(fresh);
    const committed = readFileSync(
      join(repo, 'packages', 'viewer', 'public', 'ir', 'engineering-platform.ir.json'),
      'utf8',
    );
    expect(committed).toBe(fresh);
  });
});

import {
  emptyState,
  skillStateEntry,
  treeStateSchema,
  type SetStatus,
  type SkillStateEntry,
  type TreeState,
} from './schema.js';

/**
 * Storage interface for tree state. Designed so the same viewer code works
 * against:
 *  - localStorage (single-user MVP, this package's LocalStorageStateAdapter)
 *  - a static JSON file fetched from the dev server (FetchStateAdapter — read-only)
 *  - a Phase 5 enterprise API server (ApiStateAdapter — future)
 *
 * The viewer always reads/writes through this interface; commitment §1.1
 * keeps structure (IR) and state strictly separate.
 */
export interface StateAdapter {
  load(): Promise<TreeState | null>;
  save(state: TreeState): Promise<void>;
  /** Convenience mutator: update a single skill entry; persists immediately. */
  setSkill(skillId: string, entry: SkillStateEntry): Promise<TreeState>;
  /** Convenience mutator: transition a skill to a new explicit status. */
  setStatus(skillId: string, status: SetStatus): Promise<TreeState>;
  /** Convenience mutator: remove a skill entry, reverting to derived status. */
  clearSkill(skillId: string): Promise<TreeState>;
}

export class LocalStorageStateAdapter implements StateAdapter {
  constructor(
    private readonly storageKey: string,
    private readonly userId: string,
    private readonly treeId: string,
    private readonly primaryPath?: string,
  ) {}

  async load(): Promise<TreeState> {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : null;
    if (!raw) return emptyState(this.userId, this.treeId, this.primaryPath);
    try {
      const parsed = treeStateSchema.parse(JSON.parse(raw));
      return parsed;
    } catch {
      // Corrupt state — start fresh rather than crash. Caller can inspect via dev tools.
      return emptyState(this.userId, this.treeId, this.primaryPath);
    }
  }

  async save(state: TreeState): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(state, null, 2));
  }

  async setSkill(skillId: string, entry: SkillStateEntry): Promise<TreeState> {
    const cur = await this.load();
    skillStateEntry.parse(entry); // validate
    const next: TreeState = { ...cur, skills: { ...cur.skills, [skillId]: entry } };
    await this.save(next);
    return next;
  }

  async setStatus(skillId: string, status: SetStatus): Promise<TreeState> {
    const cur = await this.load();
    const existing = cur.skills[skillId];
    const now = new Date().toISOString();
    const entry: SkillStateEntry = {
      ...existing,
      status,
      ...(status === 'in_progress' && !existing?.started_at ? { started_at: now } : {}),
      ...(status === 'submitted' || status === 'pending_approval'
        ? { submitted_at: existing?.submitted_at ?? now }
        : {}),
      ...(status === 'achieved' ? { completed_at: now } : {}),
    };
    return this.setSkill(skillId, entry);
  }

  async clearSkill(skillId: string): Promise<TreeState> {
    const cur = await this.load();
    const { [skillId]: _removed, ...rest } = cur.skills;
    const next: TreeState = { ...cur, skills: rest };
    await this.save(next);
    return next;
  }
}

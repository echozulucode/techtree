import type { IR } from '@echozedlabs/techtree-ir';
// The zod-free light entry: this module must stay free of zod (client bundles).
import { CAPABILITY_STATUSES } from '@echozedlabs/techtree-schema/capability-data';

/**
 * Status models — the profile-owned half of the state overlay.
 *
 * A model names the statuses people STORE (with labels, default colours and
 * icons), which stored statuses SATISFY a prerequisite, and the two DERIVED
 * statuses (`available` / `locked`) the engine computes from the prerequisite
 * graph. The engine (derivation, filters, renderer) is generic over the model;
 * themes override colours/icons per status id (`theme.statuses`).
 */

/**
 * Icon names understood by the viewer's status icon set. Kept as plain strings
 * so models and themes stay data (no React in this package).
 */
export const STATUS_ICON_NAMES = [
  'lock',
  'unlock',
  'circle',
  'circle-dashed',
  'search',
  'circle-half',
  'circle-check',
  'star',
  'alert-triangle',
  'x-circle',
  'check',
  'clock',
  'send',
  'hourglass',
  'x',
] as const;
export type StatusIconName = (typeof STATUS_ICON_NAMES)[number];

export interface StatusDef {
  id: string;
  label: string;
  /** Default colour; themes override via `theme.statuses[id].color`. */
  color: string;
  /** Default icon (one of STATUS_ICON_NAMES); omitted = no badge. */
  icon?: StatusIconName;
  /** Optional text glyph (e.g. the write-up's ○ ◔ ◑ ● ★ ⚠ ✕) for text views. */
  glyph?: string;
}

export interface StatusModel {
  /** Model id — usually the profile id ('skill', 'capability'). */
  id: string;
  /** Statuses a person sets, in display order. */
  stored: readonly StatusDef[];
  /**
   * Status assumed for a node with no stored entry (capability: 'not_started').
   * `null` means "no status" (skill: absent entries are purely derived).
   */
  defaultStatus: string | null;
  /** Stored statuses that satisfy a prerequisite for availability. */
  satisfying: readonly string[];
  /**
   * Stored statuses that are displayed as the derived available / locked
   * status (capability: 'not_started'). Absent entries always are.
   */
  derivedWhen: readonly string[];
  /** Derived: every prerequisite satisfied (any-of: one member suffices). */
  available: StatusDef;
  /** Derived: at least one prerequisite (or any-of group) unsatisfied. */
  locked: StatusDef;
  /** Order of effective statuses in filters / legends. */
  filterOrder: readonly string[];
}

// --- built-in models --------------------------------------------------------

/** The original learner model (skill + delivery profiles). */
export const skillStatusModel: StatusModel = {
  id: 'skill',
  stored: [
    { id: 'in_progress', label: 'In progress', color: '#b89a4a', icon: 'clock' },
    { id: 'submitted', label: 'Submitted', color: '#c4986d', icon: 'send' },
    { id: 'pending_approval', label: 'Pending approval', color: '#d9c977', icon: 'hourglass' },
    { id: 'achieved', label: 'Achieved', color: '#8fae5d', icon: 'check' },
    { id: 'rejected', label: 'Rejected', color: '#a85a5a', icon: 'x' },
  ],
  defaultStatus: null,
  satisfying: ['achieved'],
  derivedWhen: [],
  available: { id: 'available', label: 'Available', color: '#5a7399' },
  locked: { id: 'locked', label: 'Locked', color: '#3b4353', icon: 'lock' },
  filterOrder: ['in_progress', 'available', 'achieved', 'submitted', 'locked'],
};

const CAPABILITY_DEFS: Record<(typeof CAPABILITY_STATUSES)[number], Omit<StatusDef, 'id'>> = {
  not_started: { label: 'Not started', color: '#7d8597', icon: 'circle', glyph: '○' },
  investigating: { label: 'Investigating', color: '#6d8fc4', icon: 'search', glyph: '◔' },
  demonstrated: { label: 'Demonstrated', color: '#4fa3a5', icon: 'circle-half', glyph: '◑' },
  operational: { label: 'Operational', color: '#6fae5d', icon: 'circle-check', glyph: '●' },
  strategic_standard: { label: 'Strategic standard', color: '#e0b84c', icon: 'star', glyph: '★' },
  legacy: { label: 'Legacy', color: '#c4865a', icon: 'alert-triangle', glyph: '⚠' },
  retiring: { label: 'Retiring', color: '#b5545c', icon: 'x-circle', glyph: '✕' },
};

/**
 * Capability maturity model. A prerequisite is satisfied once it is at least
 * `demonstrated`; `legacy` and `retiring` still count (the capability exists,
 * it is just on its way out). A `not_started` node displays as the derived
 * `available` / `locked`; every other stored state displays as itself.
 */
export const capabilityStatusModel: StatusModel = {
  id: 'capability',
  stored: CAPABILITY_STATUSES.map((id) => ({ id, ...CAPABILITY_DEFS[id] })),
  defaultStatus: 'not_started',
  satisfying: ['demonstrated', 'operational', 'strategic_standard', 'legacy', 'retiring'],
  derivedWhen: ['not_started'],
  available: { id: 'available', label: 'Available', color: '#8fb8e8', icon: 'unlock', glyph: '○' },
  locked: { id: 'locked', label: 'Locked', color: '#4a5262', icon: 'lock', glyph: '○' },
  filterOrder: [
    'locked',
    'available',
    'investigating',
    'demonstrated',
    'operational',
    'strategic_standard',
    'legacy',
    'retiring',
  ],
};

/** Built-in models keyed by profile id. Unknown profiles fall back to skill. */
export const STATUS_MODELS: Readonly<Record<string, StatusModel>> = {
  skill: skillStatusModel,
  delivery: skillStatusModel,
  capability: capabilityStatusModel,
};

export function getStatusModel(profileId?: string | null): StatusModel {
  return (profileId && STATUS_MODELS[profileId]) || skillStatusModel;
}

/** Look up a status definition (stored or derived) by id. */
export function statusDef(model: StatusModel, id: string): StatusDef | undefined {
  if (id === model.available.id) return model.available;
  if (id === model.locked.id) return model.locked;
  return model.stored.find((s) => s.id === id);
}

// --- prerequisite structure (any-of aware) ---------------------------------

export interface PrerequisiteGroup {
  /** Group id from the IR edge (scoped to the dependent node). */
  id: string;
  members: string[];
}

export interface Prerequisites {
  /** Each one required. */
  all: string[];
  /** One member of each group required. */
  anyOf: PrerequisiteGroup[];
}

/** Index the IR's `requires` edges into per-node all-of / any-of prerequisites. */
export function prerequisiteIndex(ir: IR): Map<string, Prerequisites> {
  const out = new Map<string, Prerequisites>();
  const get = (id: string): Prerequisites => {
    let p = out.get(id);
    if (!p) {
      p = { all: [], anyOf: [] };
      out.set(id, p);
    }
    return p;
  };
  for (const e of ir.edges) {
    if (e.kind !== 'requires') continue;
    const p = get(e.to);
    if (e.group === undefined) {
      p.all.push(e.from);
    } else {
      let g = p.anyOf.find((x) => x.id === e.group);
      if (!g) {
        g = { id: e.group, members: [] };
        p.anyOf.push(g);
      }
      g.members.push(e.from);
    }
  }
  return out;
}

// --- derivation -------------------------------------------------------------

/**
 * What a host supplies per node: a status id, or an object with a `status`
 * (e.g. a TreeState entry, or a row from the host's own database).
 */
export type NodeStateInput = string | { status?: string | null } | null | undefined;

export type NodeStates = Readonly<Record<string, NodeStateInput>>;

export interface NodeStatusView {
  /** Effective status — stored, or derived available/locked. Drives colour + filters. */
  status: string;
  /** Stored status, or the model default; `null` when neither exists. */
  stored: string | null;
  /** True when every prerequisite is satisfied (any-of: one member suffices). */
  prerequisitesMet: boolean;
  /** Unsatisfied prerequisites, for "locked because…" messaging. */
  missing: { all: string[]; anyOf: string[][] };
}

function storedStatusOf(input: NodeStateInput): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') return input || null;
  return input.status ?? null;
}

/**
 * Derive every node's status view from the IR's prerequisite graph, the
 * host-supplied stored states, and a status model. Pure; no I/O.
 */
export function deriveStatusView(
  ir: IR,
  states: NodeStates | null | undefined,
  model: StatusModel = skillStatusModel,
): Map<string, NodeStatusView> {
  const satisfying = new Set(model.satisfying);
  const derivedWhen = new Set(model.derivedWhen);
  const storedById = new Map<string, string | null>();
  for (const n of ir.nodes) {
    storedById.set(n.id, storedStatusOf(states?.[n.id]) ?? model.defaultStatus);
  }
  const isSatisfied = (id: string): boolean => {
    const s = storedById.get(id);
    return s !== null && s !== undefined && satisfying.has(s);
  };

  const prereqs = prerequisiteIndex(ir);
  const out = new Map<string, NodeStatusView>();
  for (const n of ir.nodes) {
    const p = prereqs.get(n.id) ?? { all: [], anyOf: [] };
    const missingAll = p.all.filter((id) => !isSatisfied(id));
    const missingAnyOf = p.anyOf
      .filter((g) => !g.members.some(isSatisfied))
      .map((g) => [...g.members]);
    const met = missingAll.length === 0 && missingAnyOf.length === 0;
    const stored = storedById.get(n.id) ?? null;
    const derive = stored === null || derivedWhen.has(stored);
    out.set(n.id, {
      status: derive ? (met ? model.available.id : model.locked.id) : stored,
      stored,
      prerequisitesMet: met,
      missing: { all: missingAll, anyOf: missingAnyOf },
    });
  }
  return out;
}

/** Convenience: effective status per node (what renderers and filters consume). */
export function deriveEffectiveStatuses(
  ir: IR,
  states: NodeStates | null | undefined,
  model: StatusModel = skillStatusModel,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const [id, v] of deriveStatusView(ir, states, model)) out.set(id, v.status);
  return out;
}

import type { Diagnostic } from './diagnostics.js';
import { nearestMatch } from './did-you-mean.js';
import { allPrerequisiteRefs } from './profile.js';
import type { ValidatedNode, ValidatedTree } from './validate.js';

function diagAtNode(
  v: ValidatedNode,
  severity: 'error' | 'warning',
  code: string,
  message: string,
  hint?: string,
): Diagnostic {
  return {
    severity,
    code,
    message,
    file: v.file.relPath,
    // Line/col point at the node's top-level for now. Phase 4 polishes.
    hint,
  };
}

export function lintValidated(v: ValidatedTree): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const byId = new Map<string, ValidatedNode>();
  const aliasToId = new Map<string, string>();

  // Pass 1: detect duplicate IDs and build the id index.
  for (const s of v.nodes) {
    const id = s.node.id;
    if (byId.has(id)) {
      diags.push(
        diagAtNode(
          s,
          'error',
          'duplicate-id',
          `Duplicate node id "${id}". Already defined in "${byId.get(id)!.file.relPath}".`,
          'Node IDs must be globally unique. See docs/high-level-plan.md §1.2.',
        ),
      );
    } else {
      byId.set(id, s);
    }
  }

  // Pass 2: alias collisions.
  for (const s of v.nodes) {
    for (const alias of s.node.aliases) {
      if (byId.has(alias) && byId.get(alias)!.node.id !== s.node.id) {
        diags.push(
          diagAtNode(
            s,
            'warning',
            'alias-collision',
            `Alias "${alias}" on node "${s.node.id}" conflicts with an existing node id.`,
          ),
        );
      }
      if (aliasToId.has(alias) && aliasToId.get(alias) !== s.node.id) {
        diags.push(
          diagAtNode(
            s,
            'warning',
            'alias-collision',
            `Alias "${alias}" on node "${s.node.id}" is also claimed by "${aliasToId.get(alias)}".`,
          ),
        );
      } else {
        aliasToId.set(alias, s.node.id);
      }
    }
  }

  // Helper: resolve a reference (id or alias) to a canonical id.
  const resolveRef = (ref: string): string | undefined => {
    if (byId.has(ref)) return ref;
    return aliasToId.get(ref);
  };

  // Pass 3: unknown ID references in requires/recommends.
  const candidateIds = [...byId.keys(), ...aliasToId.keys()];
  const refHint = (ref: string): string => {
    const guess = nearestMatch(ref, candidateIds);
    return guess ? `Did you mean "${guess}"?` : 'Check the ID spelling or add the referenced node.';
  };
  for (const s of v.nodes) {
    for (const ref of s.node.requires) {
      if (!resolveRef(ref)) {
        diags.push(
          diagAtNode(
            s,
            'error',
            'unknown-ref',
            `Node "${s.node.id}" requires unknown node "${ref}".`,
            refHint(ref),
          ),
        );
      }
    }
    for (const group of s.node.requiresAnyOf ?? []) {
      for (const ref of group) {
        if (!resolveRef(ref)) {
          diags.push(
            diagAtNode(
              s,
              'error',
              'unknown-ref',
              `Node "${s.node.id}" lists unknown node "${ref}" in an any-of prerequisite group.`,
              refHint(ref),
            ),
          );
        }
      }
    }
    for (const ref of s.node.recommends) {
      if (!resolveRef(ref)) {
        diags.push(
          diagAtNode(
            s,
            'error',
            'unknown-ref',
            `Node "${s.node.id}" recommends unknown node "${ref}".`,
            refHint(ref),
          ),
        );
      }
    }
  }

  // Pass 3b: any-of group hygiene (ADR-0006). A one-member group is just a
  // plain prerequisite; a member that is also a plain prerequisite (or appears
  // twice) makes the alternative meaningless.
  for (const s of v.nodes) {
    const plain = new Set(s.node.requires.map((r) => resolveRef(r) ?? r));
    (s.node.requiresAnyOf ?? []).forEach((group, i) => {
      const canon = group.map((r) => resolveRef(r) ?? r);
      if (new Set(canon).size < 2) {
        diags.push(
          diagAtNode(
            s,
            'warning',
            'any-of-singleton',
            `Node "${s.node.id}" has an any-of group #${i + 1} with fewer than two distinct members.`,
            'List the member as a plain prerequisite instead, or add the alternatives.',
          ),
        );
      }
      const redundant = canon.filter((r) => plain.has(r));
      if (redundant.length > 0) {
        diags.push(
          diagAtNode(
            s,
            'warning',
            'any-of-redundant',
            `Node "${s.node.id}" lists "${redundant.join('", "')}" both as a required prerequisite and in any-of group #${i + 1}.`,
            'A required member already satisfies the group; drop one of the two.',
          ),
        );
      }
    });
  }

  // Pass 4: cycles in the requires graph (DFS with white/gray/black coloring).
  // Any-of members count: a group that can only be satisfied through the node
  // itself is still a cycle.
  const adj = new Map<string, string[]>();
  for (const s of v.nodes) {
    const outs: string[] = [];
    for (const ref of allPrerequisiteRefs(s.node)) {
      const canon = resolveRef(ref);
      if (canon) outs.push(canon);
    }
    adj.set(s.node.id, outs);
  }

  const color = new Map<string, 'white' | 'gray' | 'black'>();
  for (const id of byId.keys()) color.set(id, 'white');
  const reportedCycles = new Set<string>();

  function dfs(id: string, stack: string[]): void {
    color.set(id, 'gray');
    stack.push(id);
    for (const next of adj.get(id) ?? []) {
      const c = color.get(next);
      if (c === 'gray') {
        const cycleStart = stack.indexOf(next);
        const cycle = stack.slice(cycleStart).concat(next);
        const key = [...cycle].sort().join('|');
        if (!reportedCycles.has(key)) {
          reportedCycles.add(key);
          const s = byId.get(id)!;
          diags.push(
            diagAtNode(
              s,
              'error',
              'cycle',
              `Cycle detected in "requires" graph: ${cycle.join(' → ')}.`,
              'Break the cycle by removing one of the dependencies.',
            ),
          );
        }
      } else if (c === 'white') {
        dfs(next, stack);
      }
    }
    stack.pop();
    color.set(id, 'black');
  }
  for (const id of byId.keys()) {
    if (color.get(id) === 'white') dfs(id, []);
  }

  // Pass 5: orphaned nodes (no in-edges, no out-edges, not on any named track).
  const hasInEdge = new Set<string>();
  const hasOutEdge = new Set<string>();
  for (const s of v.nodes) {
    const refs = [...allPrerequisiteRefs(s.node), ...s.node.recommends];
    if (refs.length > 0) hasOutEdge.add(s.node.id);
    for (const ref of refs) {
      const canon = resolveRef(ref);
      if (canon) hasInEdge.add(canon);
    }
  }
  for (const s of v.nodes) {
    if (!hasInEdge.has(s.node.id) && !hasOutEdge.has(s.node.id) && !s.node.track) {
      diags.push(
        diagAtNode(
          s,
          'warning',
          'orphan',
          `Node "${s.node.id}" has no dependencies, no dependents, and no "track" — it stands alone.`,
          'Add it to a track, give it a prereq, or remove it.',
        ),
      );
    }
  }

  // Pass 6: unknown band references (warning, only if tree declares bands).
  const knownBands = new Set((v.tree.eras ?? []).map((e) => e.id));
  if (knownBands.size > 0) {
    for (const s of v.nodes) {
      if (s.node.band && !knownBands.has(s.node.band)) {
        diags.push(
          diagAtNode(
            s,
            'warning',
            'unknown-era',
            `Node "${s.node.id}" references band "${s.node.band}" which is not declared in tree.yaml.`,
          ),
        );
      }
    }
  }

  // Pass 7: unknown track references (warning, only if tree declares tracks).
  const knownTracks = new Set((v.tree.paths ?? []).map((p) => p.id));
  if (knownTracks.size > 0) {
    for (const s of v.nodes) {
      if (s.node.track && !knownTracks.has(s.node.track)) {
        diags.push(
          diagAtNode(
            s,
            'warning',
            'unknown-path',
            `Node "${s.node.id}" references track "${s.node.track}" which is not declared in tree.yaml.`,
          ),
        );
      }
    }
  }

  // Pass 8: tree-namespace check (warning, only if tree declares a namespace).
  // Node ids in this tree should start with `<namespace>.` or `<namespace>/`.
  // Trees that legitimately reference nodes from elsewhere just omit the field.
  const ns = v.tree.tree.namespace;
  if (ns) {
    const prefixDot = `${ns}.`;
    const prefixSlash = `${ns}/`;
    for (const s of v.nodes) {
      const id = s.node.id;
      if (id !== ns && !id.startsWith(prefixDot) && !id.startsWith(prefixSlash)) {
        diags.push(
          diagAtNode(
            s,
            'warning',
            'namespace-mismatch',
            `Node "${id}" is in tree "${v.tree.tree.id}" whose namespace is "${ns}", but its id doesn't start with "${prefixDot}" or "${prefixSlash}".`,
            `Either rename the node to start with "${ns}.", or remove \`namespace\` from tree.yaml to allow cross-namespace nodes.`,
          ),
        );
      }
    }
  }

  return diags;
}

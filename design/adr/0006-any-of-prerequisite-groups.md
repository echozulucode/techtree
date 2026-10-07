# ADR-0006: Any-of prerequisite groups in the engine

## Status

Accepted

## Context

Every `requires` edge has meant "this prerequisite is needed": a node's
prerequisites are a conjunction. The capability tech tree (the `capability`
profile, built for the Engineering Example Library) needs alternatives as well:
"Hardware-Independent Development needs the abstraction layer, the SDK, and
**either** hardware simulation **or** recorded-data replay". Push-Button Release
needs one automated hardware gate (board qualification *or* HIL regression), not
both. Modelling this as two required edges overstates the requirement, and
leaving one edge out loses the alternative from the graph and from path
highlighting.

The question is where the disjunction lives. A profile can't keep it in `data`:
availability is derived by the engine (`@echozedlabs/techtree-state`), cycle
detection and layout are engine passes, and a second profile (e.g. a
certification-path profile) will want the same thing.

## Decision

Add **any-of groups** to the engine as an additive extension of the existing
edge model:

1. **IR** — `IREdge.group?: string`, valid on `requires` edges and scoped to the
   edge's `to` node. Requires edges into one node that share a `group` form a
   disjunction (one satisfied member satisfies the group); requires edges
   without `group` stay individually required. A node's prerequisites are met
   when every ungrouped prerequisite and at least one member of every group is
   satisfied. `IR_VERSION` stays `1`: consumers that ignore `group` see the old
   meaning (all edges required), which is conservative, never permissive.
2. **CoreNode** — `requiresAnyOf?: string[][]` (optional, so existing profiles
   are untouched). The compiler emits group ids `any-1`, `any-2`, … in authored
   order, so output stays byte-stable.
3. **Validation** — group members go through the same unknown-ref (with
   did-you-mean), cycle and orphan passes as plain prerequisites. A cycle that
   runs through a group member is still a cycle (error). New warnings:
   `any-of-singleton` (a group with fewer than two distinct members) and
   `any-of-redundant` (a member that is also a plain prerequisite).
4. **Layout** — group members are laid out like any prerequisite (they are ELK
   edges), so alternatives sit upstream of the node they unlock.
5. **Derivation** — `prerequisiteIndex(ir)` and `deriveStatusView(...)` in the
   state package implement the any-of rule for every status model; the skill
   model's `deriveStatuses` inherits it.
6. **Rendering** — group edges are drawn dotted and labelled "or"; path
   highlighting includes every member (all are candidate paths); the detail
   drawer lists a group as "One of: A or B".

Authoring is profile-specific. The capability profile accepts
`requires: [id, { any_of: [id, id] }]`.

## Consequences

### Positive

- "One of these suffices" is first-class: availability, validation, layout and
  highlighting all agree, for every profile.
- Additive: no IR version bump, no change for the skill / delivery profiles.

### Negative

- Consumers that compute availability themselves must honour `group`;
  consumers that ignore it get the stricter (all-required) reading.
- Groups are flat (an OR of single nodes). Nested boolean expressions are out of
  scope.

### Risks

- If nested expressions are ever needed, `group` ids may need structure (e.g.
  `any-1.2`). The positional id format leaves room for that without breaking
  today's IR.

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|---|---|---|---|
| A new edge kind `requires-any` | No new field | Can't express two independent groups on one node | Ambiguous with more than one group |
| Keep alternatives in profile `data` | Zero engine change | Engine derivation, cycles and layout ignore them | Availability would be wrong |
| Group node in the graph (synthetic "OR" node) | Pure DAG semantics | Pollutes the node list, the IR and every consumer | Leaks a modelling trick into the contract |

## Related Documents

- `packages/ir/src/index.ts` (`IREdge.group`)
- `packages/state/src/status-model.ts` (`prerequisiteIndex`, `deriveStatusView`)
- `features/any_of_prerequisites.feature`
- ADR-0002 (the Profile / CoreNode seam this extends)

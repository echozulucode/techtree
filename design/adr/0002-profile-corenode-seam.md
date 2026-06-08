# ADR-0002: Profile / CoreNode seam for a domain-agnostic engine

## Status

Accepted

## Context

The engine began life as a skill-tree compiler+viewer. The IR baked skill-specific
fields directly into the node (`difficulty`, `estimated_hours`, `workflow`,
`learning_resources`) and used skill vocabulary (`era`, `path`, `skill_count`).
To make the engine reusable for other domains (project delivery narratives,
experiments, roadmaps) without forking, the domain semantics had to be separated
from the graph engine.

## Decision

Introduce two seams:

1. **An opaque `data` bag on `IRNode`** plus domain-neutral fields (`band`,
   `track`, `node_count`). Profile-specific fields are packed into `data`.
2. **A `Profile` interface** the compiler is parameterized by: it provides the
   node file suffix, a Zod `nodeSchema`, and `mapNode(raw) → CoreNode`. The
   pipeline (`loader → validate → lint → layout → emit`) operates only on the
   domain-agnostic `CoreNode`.

The skill domain becomes one profile (`skillProfile`); a `deliveryProfile`
(events/experiments/milestones) proves genericity. `compile(dir, profile)`
selects the domain; the CLI exposes `--profile`.

## Consequences

### Positive

- A new domain is a Profile with its own schema + `mapNode` — zero engine edits.
- The IR contract, layout, lint, renderer, and state overlay are all reusable.
- The skill app is now just the first consumer, validating the boundary.

### Negative

- `IRNode.data` is `Record<string, unknown>`; consumers cast to a profile's data
  type (e.g. `SkillData`). The cast is the price of an open engine.

### Risks

- Over-generalizing the status model before a second domain demanded it would
  invent the wrong abstraction — mitigated by building the delivery profile
  *before* generalizing the server's status machine.

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|---|---|---|---|
| Keep skill fields in the IR | Simplest, strongly typed | Engine forever skill-shaped | Defeats the reuse goal |
| Fork per domain | Independent evolution | Duplicate compiler/viewer/state | Unmaintainable; the whole point is one engine |

## Related Documents

- `docs/overview.md` (the Profile boundary)
- `docs/techtree-extraction.md` (how the seam was introduced before extraction)

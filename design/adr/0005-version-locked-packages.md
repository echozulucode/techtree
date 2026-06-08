# ADR-0005: Version-lock packages as one group through 0.x

## Status

Accepted

## Context

The monorepo publishes several packages (`@echozedlabs/techtree-{ir,schema,
compiler,state,themes,viewer,server}`). They have genuinely different cadences —
`server` evolves independently of `ir` — which normally argues for independent
versioning via Changesets. But during 0.x the IR contract and package boundaries
are still moving, and `ir` is the contract everything depends on, so breaking
changes tend to be cross-cutting.

## Decision

Version-lock all published packages as a single Changesets **`fixed`** group
through 0.x. One changeset bumps them together; consumers get a trivial
compatibility rule: "use the same version across all `@echozedlabs/techtree-*`."
Revisit at 1.0 — switch to independent versioning with `linked` only where
coupling is real, once the IR and boundaries have stabilized.

## Consequences

### Positive

- Trivial cross-package compatibility story during the volatile 0.x period.
- One mental model; matches the sibling `markdown-editor` repo's convention.

### Negative

- No-op version bumps on unchanged packages — a minor annoyance, not a problem.

### Risks

- Carrying the lock past the point it helps. Mitigated by the explicit 1.0 review.

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|---|---|---|---|
| Independent versioning now | No wasted bumps | Confusing compatibility matrix while APIs churn | Premature for 0.x |
| `linked` (bump touched + related) | Less churn than fixed | Still a non-trivial matrix during heavy change | Defer to 1.0 |

## Related Documents

- `.changeset/config.json` (the `fixed` group)
- `docs/techtree-extraction.md` (versioning rationale)

# ADR-0004: Apache-2.0 OSS core; commercial boundary at the workflow plane

## Status

Accepted

## Context

TechTree is open-sourced. The license must be enterprise-friendly (permissive,
with a patent grant) while leaving room for a commercial edition. A clean line is
needed between what every user can run and what constitutes the governed,
multi-user operation of it.

## Decision

License the core under **Apache-2.0**: compiler, schema, IR types, lint, the
read-only viewer SDK, themes, the state-adapter interface, and the file/local
adapters. The boundary between OSS core and any future commercial edition lives at
the **workflow / integration plane** — SSO/SCIM connectors, packaged HRIS/LMS
integrations, hosted workflow services, advanced dashboards, premium themes. This
mirrors the structure-vs-state separation: the OSS half is the authoring/delivery
engine; the commercial half is its governed operation.

## Consequences

### Positive

- Apache-2.0's explicit patent grant is what enterprises are comfortable depending on.
- The boundary is architectural (the server/integration plane), not arbitrary.

### Negative

- Permissive licensing allows hosted forks; accepted in exchange for adoption.

### Risks

- If forcing hosted forks back to the commons ever becomes strategic, AGPL would
  have to be reconsidered — a larger, adoption-dampening change.

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|---|---|---|---|
| MIT | Simplest | No explicit patent grant | Apache-2.0's patent grant matters for enterprise |
| AGPL | Forces fork contributions back | Discourages enterprise adoption | Conflicts with the adoption goal |

## Related Documents

- `LICENSE` (Apache-2.0 full text)
- `docs/overview.md` (in/out-of-scope boundaries)

# ADR-0003: `node:sqlite` for the server state store

## Status

Accepted

## Context

`techtree-server` needs a small embedded store for per-user state and an
append-only audit log. The first choice, `better-sqlite3`, failed to build on the
Windows VS2022 toolchain (`llvm-lib.exe` missing), and native builds add friction
to a library meant to be easy to adopt. Node ships an experimental built-in
SQLite (`node:sqlite`) since 22.5 with a near-identical synchronous API.

## Decision

Use the built-in **`node:sqlite`** (`DatabaseSync`). It is loaded via
`createRequire` (a sibling type-only import gives TypeScript the types) so that
Vite/vitest don't try to resolve the `node:` specifier at transform time. The
store is the only file that touches the driver, so swapping to Postgres or
`better-sqlite3` later is mechanical.

## Consequences

### Positive

- No native compilation — `pnpm install` works on any toolchain.
- Stable enough synchronous API; `.inject()`-testable server with no real DB.

### Negative

- **Requires Node 22.5+** (flagless on Node 24; needs `--experimental-sqlite` on
  22.x). CI pins Node 24 and `engines.node` is `>=22.5.0`. An emitted
  experimental warning is cosmetic.

### Risks

- API is experimental and could change across Node majors. Contained to
  `store.ts`; revisit if it churns or when multi-tenant Postgres is needed.

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|---|---|---|---|
| `better-sqlite3` | Mature, fast | Native build; failed on Windows toolchain | Install friction for an OSS library |
| Postgres | Production-grade, multi-tenant | Infra to run; overkill for a preview server | Deferred to the enterprise phase |

## Related Documents

- `docs/techtree-extraction.md` (Node version / CI note)
- ADR-0004 (the server is the boundary to the commercial edition)

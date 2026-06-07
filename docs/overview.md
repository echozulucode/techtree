# TechTree — High-Level Description

> **Naming:** the engine is **TechTree**, published as `@echozedlabs/techtree-*`
> (GitHub: `echozulucode/techtree`). The skill app becomes a profile layered over
> this core. See `techtree-extraction.md` for the extraction runbook.

## What it is

TechTree is a TypeScript toolkit for compiling, rendering, and governing **typed
dependency graphs that change state over time**. You author a graph as plain YAML
files; TechTree validates them, computes a deterministic layered layout, and emits a
stable intermediate representation (IR). A read-only viewer renders that IR as an
interactive, themeable canvas — Civ-IV "tech tree" feel by default — with a
per-node status overlay driven by a separate state store. An optional thin server
adds role-gated state transitions, an append-only audit log, and an approval
workflow.

The defining choice: TechTree knows nothing about *what* your nodes mean. Skills,
project milestones, experiments, roadmap items, certification paths, incident
timelines — all are **profiles** layered over one engine. A profile supplies the
node schema, the status model, and the presentation; the engine supplies
everything else.

## Mental model

```
   YAML (per profile)                    TechTree engine                        consumers
  ┌──────────────────┐   parse →   ┌──────────────────────┐            ┌──────────────────┐
  │ tree.yaml        │   validate  │  deterministic        │   IR.json  │  viewer (SPA)    │
  │ *.node.yaml      │ ─ resolve ─▶│  compiler pipeline    │ ─────────▶ │  server (API)    │
  │ *.theme.yaml     │   layout    │  (ELK band layout)    │            │  CI lint / editor│
  └──────────────────┘   emit      └──────────────────────┘            └──────────────────┘
                                              ▲                                  │
                                      Profile │ (schema, status model,          │ state overlay
                                              │  presentation, lint rules)       ▼
                                                                         ┌──────────────────┐
                                                                         │  state adapter   │
                                                                         │  (file/local/API)│
                                                                         └──────────────────┘
```

The **IR is the contract.** Nothing downstream re-parses YAML. The viewer, server,
future CI lint job, and future graphical editor all consume the same IR. Same
input always produces byte-identical IR (stable sort, no timestamps in payload,
deterministic layout seed) — so it diffs cleanly in git and caches safely.

## Boundaries

**TechTree owns (in scope):**

- The graph IR: typed nodes, typed edges, phase **bands**, named **tracks**,
  computed positions/sizes.
- The compiler pipeline: parse → validate → resolve → layout → emit, with
  `file:line:col` diagnostics and did-you-mean suggestions.
- Generic graph validation: duplicate IDs, unknown references, cycle detection,
  orphan detection, stable-ID/alias enforcement.
- The renderer contract and a reference React Flow renderer.
- The renderer-agnostic viewer shell: pan/zoom/fit, selection,
  ancestor/descendant highlighting, side panel, filter chips, band banners,
  focus-on-frontier, theme switcher, hot-reload.
- The declarative theme system (node/edge/band styling as data).
- The **state-overlay seam**: a per-node status model with history, behind a
  storage-adapter interface, with file, localStorage, and HTTP adapters.
- The optional governance server: state store, append-only audit log, role-gated
  transitions, approval workflow.

**A profile owns (configured on top of TechTree):**

- The node Zod schema and the set of valid edge kinds.
- The status model — the enum, which states are derived vs. stored, and the
  transition rules.
- Node presentation — declarative field descriptors (no React required for most
  profiles) or a custom node component.
- Domain-specific lint rules layered over the generic ones.
- Themes and category/status color slots.

**Explicitly out of scope (non-goals):**

- General-purpose graph visualization (free-form/non-DAG graphs, force layouts,
  network analysis). TechTree is layered DAGs with band/time semantics — not a
  Cytoscape/D3 replacement.
- Real-time collaborative editing.
- Authentication providers, RBAC matrices, SSO/OIDC/SCIM, HR/LMS integrations —
  these live in a commercial edition or downstream app, not the core.
- A graphical authoring editor (a possible downstream consumer of the IR, not
  part of the core).
- Storage engines beyond the adapter interface (the core ships
  file/localStorage/SQLite; Postgres et al. are adapter implementations, not
  core).

## Tech stack

| Layer               | Choice                                                              | Why                                                                                                          |
| ------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Language            | **TypeScript**, end-to-end                                          | One language across compiler (Node), viewer (browser), server. Shared schemas and IR types.                 |
| Schema / validation | **Zod**, with JSON Schema export                                    | Single source of truth; good errors; drives IDE autocomplete + CI.                                          |
| Parsing             | **`yaml`** (eemeli)                                                 | Spec-compliant with source-location tracking for precise diagnostics.                                        |
| Layout              | **ELK.js**                                                          | High-quality layered DAG layout; native support for the band/era row metaphor; author-overridable hints.    |
| Rendering           | **React Flow** (reference renderer behind a small contract)        | Custom-node ergonomics; declarative re-render on theme/status change. Contract allows alternate renderers.  |
| Viewer shell        | **Vite + React** SPA, static-hostable                              | Trivial to host; ships as a CLI artifact; embeds into a larger app.                                          |
| CLI                 | **commander** + **chalk**                                          | Standard, ergonomic.                                                                                          |
| Server (optional)   | **Fastify** + **`node:sqlite`** (built-in) behind the adapter      | No native build step; `.inject()`-testable; swap the driver for Postgres without touching routes.            |
| Tooling             | pnpm workspaces, TS project references, Vitest, ESLint, Prettier   | Monorepo with independently publishable packages.                                                            |
| License (intended)  | **Apache-2.0** core                                                | Permissive + explicit patent grant; enterprise-friendly. Commercial boundary at the workflow/integration plane. |

## Capabilities / features

**Authoring & compilation**

- Multi-file YAML authoring with modular `imports`; minimum is one tree file plus
  node files.
- Deterministic, byte-stable IR emission.
- Rich diagnostics: source snippet, caret, `file:line:col`, did-you-mean for
  misspelled references.
- Scaffolding (`new <node>` / `new theme`), safe **rename with auto-aliasing**
  (never silently breaks references), watch-mode serve with SSE hot reload.
- JSON Schema export for IDE autocomplete + CI validation; auto-generated schema
  reference docs.
- Stable, namespaced IDs as the durable contract across renames and restructures.

**Rendering & interaction**

- Layered band layout (tech eras / time / phases) with author position overrides.
- Pan, zoom, fit-to-view; click-to-select with ancestor/descendant highlighting.
- Side panel surfacing any profile-declared fields.
- Filter chips with live counts; focus-on-frontier initial camera.
- One-click theme switching; declarative themes as data.
- Renderer abstraction so the canvas tech can be swapped without touching the
  shell.

**State, governance & reporting**

- Per-node status overlay computed from the dependency graph + stored progress
  (locked/available derived automatically).
- Storage-adapter seam — identical viewer code against local files, localStorage,
  or a remote server (a single config flag).
- Save/load state round-trip with schema validation and tree-ID matching.
- Optional server: role-gated transitions, required-note approvals, append-only
  audit log written transactionally with each state change.
- Profile-defined status machines and transition rules (the engine enforces them
  generically).

**Extensibility**

- The **Profile** interface is the single extension point: schema + edge kinds +
  status model + presentation + lint rules + theme slots.
- The IR contract lets new consumers (CI jobs, editors, exporters, alternate
  renderers) attach without re-parsing source.
- Versioned schema and IR with first-class migration commands, so additive
  changes don't force rewrites.

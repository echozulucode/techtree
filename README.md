# TechTree

Compile, render, and govern **typed dependency graphs that change state over time**.
Skills, project milestones, capability tech trees, experiments, roadmaps — each is a
*profile* over one engine. Extracted from the skill-tree project; see `docs/` for the
overview and the original architecture plans.

```bash
pnpm install
pnpm build                 # all packages
pnpm build:examples        # compile examples/*/ (profile from tree.yaml) + refresh viewer/public/ir
pnpm --filter @echozedlabs/techtree-compiler cli build examples/ai-delivery --profile delivery
pnpm dev:harness           # the viewer + Playwright target (?embed=engineering-platform for the embed demo)
```

Packages (one fixed version group): `@echozedlabs/techtree-ir`, `@echozedlabs/techtree-schema`,
`@echozedlabs/techtree-compiler`, `@echozedlabs/techtree-state`, `@echozedlabs/techtree-themes`,
`@echozedlabs/techtree-viewer`, `@echozedlabs/techtree-server`.

## Profiles

| Profile | Node files | Nodes | Status model |
| --- | --- | --- | --- |
| `skill` (default) | `*.skill.yaml` | skills | learner: locked → available → in progress → submitted → achieved |
| `delivery` | `*.delivery.yaml` | events / experiments / milestones | learner (as skill) |
| `capability` | `*.capability.yaml` | capabilities / milestones / wonders | maturity: not started, investigating, demonstrated, operational, strategic standard, legacy, retiring; available / locked derived |

`tree.yaml` can declare `tree.profile`; the CLI uses it when `--profile` is omitted.

### Capability profile

A Civilization-style capability tech tree: eras are columns, branches are swimlanes
(`layout: { lanes: true }` in tree.yaml), prerequisites are `requires` edges — with
**any-of groups** for "one of these suffices" ([ADR-0006](design/adr/0006-any-of-prerequisite-groups.md)).
Demo: [`examples/engineering-platform`](examples/engineering-platform/tree.yaml) (6 eras × 8 branches,
48 nodes, fictional demo state in `demo.state.json`).

```yaml
# illustrative node file (the demo version requires all three plainly)
id: eng.platform/safe-automatic-update
title: Safe Automatic Update
kind: capability                # capability | milestone | wonder
era: platformization            # band (column)
branch: deployment              # track (lane)
summary: Devices update themselves from signed packages and roll back on failure.
requires:
  - eng.platform/software-packaging
  - eng.platform/artifact-signing
  - any_of: [eng.platform/rollback-support, eng.platform/recovery-image]   # one suffices
unlocks: [Fleet-wide updates without site visits]
benefit: ...                    # required for wonders
eurekas:
  - { id: rollback-drill, statement: A deliberately bad update rolls back on its own. }
implementations: [technology:yocto-project, feature:code-signing]     # opaque refs
links:                                                                 # opaque; the host resolves them
  - { type: example, ref: offline-update-bundle-zynq, relation: demonstrates }  # demonstrates|implements|evidence|eureka
owner: Platform Ops
target_status: operational
```

Lint rules on top of the generic graph checks: `era-regression` (a prerequisite in a later
era — error), `unreachable-milestone` (a milestone/wonder with no prerequisites — warning),
`wonder-missing-benefit` (error), `duplicate-eureka` (error). Availability: a node is
**available** when every plain prerequisite is at least `demonstrated` (legacy and retiring
still count) and every any-of group has one such member.

## Embedding the viewer (React 18 / 19, Next.js App Router)

```bash
pnpm add @echozedlabs/techtree-viewer @echozedlabs/techtree-ir @echozedlabs/techtree-state
```

```tsx
'use client';
import '@echozedlabs/techtree-viewer/style.css';          // once, e.g. in the layout
import { TechTreeView } from '@echozedlabs/techtree-viewer';

export function CapabilityMap({ ir, states }: { ir: IR; states: Record<string, { status: string }> }) {
  return (
    <div style={{ height: 720 }}>
      <TechTreeView
        ir={ir}                                   // compiled IR (stored by the host)
        state={states}                            // host-owned stored states: id → status | {status, achieved_eurekas?}
        theme="css-variables"                     // map your tokens onto --techtree-* variables
        colorScheme={resolvedTheme}               // 'light' | 'dark' | 'system'
        onSelectNode={(id) => router.push(`?node=${id}`)}
        renderLink={(link) =>                     // resolve opaque links; null = withhold (not shown, not counted)
          link.type === 'example' ? <Link href={`/examples/${link.ref}`}>{titles[link.ref]}</Link> : null}
      />
    </div>
  );
}
```

`TechTreeView` props:

| Prop | Purpose |
| --- | --- |
| `ir`, `state?`, `statusModel?` | data; the model defaults from `ir.tree.profile` |
| `theme?`, `colorScheme?`, `className?`, `style?`, `ariaLabel?` | presentation |
| `selectedId?` / `defaultSelectedId?` / `onSelectNode?(id, node)` | selection (controlled or not) |
| `highlightDirection?` / `defaultHighlightDirection?` / `onHighlightDirectionChange?`, `highlightNodeId?` | path highlighting: `ancestors` ("what does X need"), `descendants` ("what does X unlock"), `both` |
| `statusFilter?` / `defaultStatusFilter?` / `onStatusFilterChange?`, `nodeFilter?`, `filterMode?` (`hide` \| `dim`), `showStatusFilter?` | filtering; eras and lanes never move |
| `view?` / `defaultView?` / `onViewChange?` (`graph` \| `outline`), `showViewToggle?` | canvas or accessible outline |
| `detailPanel?` (`drawer` \| `none`), `renderNodeDetail?(ctx)`, `renderLink?(link, ctx)` | detail drawer; wrap `<NodeDetail ctx={ctx} />` to extend it |
| `focusNodeId?`, `showMiniMap?`, `showControls?` | camera and chrome |

The entry is a `'use client'` module with no `window`/`document` access at import time and
no CSS imports (the stylesheet is a separate export). Server-side helpers —
`deriveStatusView`, `prerequisiteIndex`, `getStatusModel` — live in `@echozedlabs/techtree-state`.
`examples/react19-host` is a dev-only React 19 host that server-renders and drives the
component ([ADR-0007](design/adr/0007-embeddable-viewer-and-status-models.md)).

Theming: set any `--techtree-*` variable on `.techtree-root` (graph: `canvas-bg`, `node-bg`,
`node-text`, `edge`, `accent`, `kind-milestone`, `status-operational`, …; chrome: `panel-bg`,
`panel-text`, `link`, …). The full list is `CSS_VARIABLE_NAMES` in `@echozedlabs/techtree-themes`
plus the chrome variables at the top of `style.css`.

## Documentation

`doc-map.yaml` (root) indexes where authoritative information lives.

- **What it is** — [`docs/overview.md`](docs/overview.md): boundaries, tech stack, capabilities.
- **Decisions** — [`design/adr/`](design/adr/README.md): renderer, profile seam, server store, licensing, versioning, any-of groups, embeddable viewer.
- **Conventions & runbook** — [`docs/techtree-extraction.md`](docs/techtree-extraction.md): toolchain, CI/release, testing strategy.
- **Living docs** — [`features/`](features/README.md): Gherkin specs executed by Playwright (`@unit` ones by unit tests).
- `ai/` is a low-authority scratch area for AI-generated drafts.

License: Apache-2.0.

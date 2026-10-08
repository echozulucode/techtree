# TechTree

Compile, render, and govern **typed dependency graphs that change state over time**.
Skills, project milestones, capability tech trees, experiments, roadmaps — each is a
*profile* over one engine. Extracted from the skill-tree project; see `docs/` for the
overview and the original architecture plans.

## Install

```bash
# embed the viewer in a React 18 / 19 app
pnpm add @echozedlabs/techtree-viewer @echozedlabs/techtree-ir @echozedlabs/techtree-state
# compile trees (CLI `techtree`), e.g. at build / import time
pnpm add -D @echozedlabs/techtree-compiler
```

All `@echozedlabs/techtree-*` packages are one fixed version group through 0.x
([ADR-0005](design/adr/0005-version-locked-packages.md)): use the same version of
each. React / React DOM are peers of the viewer (`^18.3.0 || ^19.0.0`). Client
code that needs schema constants or status derivation imports the zod-free
entries `@echozedlabs/techtree-schema/capability-data` and
`@echozedlabs/techtree-state/status-model`. Releases go out through Changesets and
the Release workflow (runbook: [docs/techtree-extraction.md](docs/techtree-extraction.md#publishing-runbook)).

Installing packed tarballs before a version is on npm (`file:…tgz`): pnpm resolves
the exact sibling versions from the registry, so point them at the tarballs too:

```json
"pnpm": { "overrides": {
  "@echozedlabs/techtree-ir": "file:vendor/techtree/echozedlabs-techtree-ir-<version>.tgz",
  "@echozedlabs/techtree-schema": "file:vendor/techtree/echozedlabs-techtree-schema-<version>.tgz",
  "@echozedlabs/techtree-state": "file:vendor/techtree/echozedlabs-techtree-state-<version>.tgz",
  "@echozedlabs/techtree-themes": "file:vendor/techtree/echozedlabs-techtree-themes-<version>.tgz"
} }
```

## Develop

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
        headingLevel={2}                          // drawer / outline headings continue the page outline
        initialFocus="frontier"                   // phones: start on the frontier, not the whole tree
        fitViewOptions={{ minZoom: 0.35 }}
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
| `drawerElement?` (`section` \| `div` \| `aside`) | drawer element; default `section` = labelled `region` (nests inside the view's region); `aside` only for views outside any landmark |
| `headingLevel?` (1–5, default 3) | drawer title and outline branch headings; sub-headings use the next level (also `ctx.headingLevel` / `<NodeDetail headingLevel>`) |
| `focusDetailOnSelect?` (default `true`) | selecting inside the view moves focus to the drawer heading; closing returns it; Escape closes |
| `focusNodeId?`, `showMiniMap?`, `showControls?` | camera and chrome |
| `initialFocus?` (`'frontier'` \| node id), `initialZoom?` | initial camera: centre the frontier (in progress / investigating, else available; leftmost first) or a node at `initialZoom` (default 0.9); `initialZoom` alone = whole tree at that zoom |
| `minZoom?`, `maxZoom?` (0.04 / 2), `fitViewOptions?` (`padding`, `minZoom`, `maxZoom`, `duration`, `nodeIds`, `includeHiddenNodes`) | zoom bounds; options for the initial fit and the fit button |

The entry is a `'use client'` module with no `window`/`document` access at import time and
no CSS imports (the stylesheet is a separate export). Server-side helpers —
`deriveStatusView`, `prerequisiteIndex`, `getStatusModel` — live in `@echozedlabs/techtree-state`.
`examples/react19-host` is a dev-only React 19 host that server-renders and drives the
component ([ADR-0007](design/adr/0007-embeddable-viewer-and-status-models.md)).

Theming: set any `--techtree-*` variable on `.techtree-root` (graph: `canvas-bg`, `node-bg`,
`node-text`, `edge`, `accent`, `kind-milestone`, `status-operational`, …; chrome: `panel-bg`,
`panel-text`, `link`, …). The full list is `CSS_VARIABLE_NAMES` in `@echozedlabs/techtree-themes`
plus the chrome variables at the top of `style.css`. `colorScheme` also sets React Flow's
`colorMode` (its container gets the matching `light` / `dark` class; `'system'` follows a
`.dark` / `.light` ancestor class, else `prefers-color-scheme`).

### Accessibility

The defaults meet WCAG 2.2 AA in light and dark (checked by token-contrast unit tests, axe in
jsdom, and axe in Chromium on the dev-harness host page — `features/accessibility.feature`):
the drawer is a labelled region, heading levels follow `headingLevel`, focus follows the drawer,
targets in the toolbar / drawer / outline are at least 24 px, and node states use colour, not
transparency. When you restyle, keep the pairs AA:

| Variable | Used for | Default |
| --- | --- | --- |
| `--techtree-on-status-<status>` | text / icon on a status fill (drawer pill, pressed filter chip, node badge) | per status and scheme (white or `#14171f`); falls back to the legacy single `--techtree-on-status` when you set that |
| `--techtree-on-accent` | text on the accent (pressed "All" chip, pressed segmented buttons) | `#14171f` |
| `--techtree-dim-node-bg`, `--techtree-dim-node-text`, `--techtree-dim-node-border` | nodes off the highlighted path (and `filterMode="dim"`), class `tt-graph-node-dim` | canvas; node text mixed 75 % toward the canvas; border mixed 50 % |
| `--techtree-dim-opacity`, `--techtree-dim-filter`, `--techtree-dim-edge-opacity` | extra dimming | `1`, `grayscale(1)`, `0.12` |
| `--techtree-locked-node-bg`, `--techtree-locked-opacity` | locked nodes (dashed border) | node fill mixed 55 % toward the canvas, `1` |

Override a status fill (`--techtree-status-<status>`) or the accent → override its on-colour too.

## Documentation

`doc-map.yaml` (root) indexes where authoritative information lives.

- **What it is** — [`docs/overview.md`](docs/overview.md): boundaries, tech stack, capabilities.
- **Decisions** — [`design/adr/`](design/adr/README.md): renderer, profile seam, server store, licensing, versioning, any-of groups, embeddable viewer, accessible embedding.
- **Conventions & runbook** — [`docs/techtree-extraction.md`](docs/techtree-extraction.md): toolchain, CI/release + publishing runbook, testing strategy.
- **Living docs** — [`features/`](features/README.md): Gherkin specs executed by Playwright (`@unit` ones by unit tests).
- `ai/` is a low-authority scratch area for AI-generated drafts.

License: Apache-2.0.

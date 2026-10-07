---
'@echozedlabs/techtree-ir': minor
'@echozedlabs/techtree-schema': minor
'@echozedlabs/techtree-compiler': minor
'@echozedlabs/techtree-state': minor
'@echozedlabs/techtree-themes': minor
'@echozedlabs/techtree-viewer': minor
'@echozedlabs/techtree-server': minor
---

Capability profile, any-of prerequisites, and an embeddable viewer.

- **capability profile** (`--profile capability`, `*.capability.yaml`): Civilization-style capability tech trees with `capability` / `milestone` / `wonder` nodes, era + branch placement, `unlocks`, `benefit`, `eurekas`, opaque `implementations` and `{type, ref, relation}` links, `owner`, `target_status`; lint rules `era-regression`, `unreachable-milestone`, `wonder-missing-benefit`, `duplicate-eureka`. Demo: `examples/engineering-platform` (fictional).
- **any-of prerequisite groups** in the engine (ADR-0006): `IREdge.group`, `CoreNode.requiresAnyOf`, validation (unknown refs, cycles, `any-of-singleton`, `any-of-redundant`), layout, and derivation.
- **lane layout**: `layout.lanes: true` in tree.yaml places tracks in swimlanes; `IRTrack.order` / `color` / `lane` and `IRTree.profile` are emitted (additive, IR v1). `tree.profile` in tree.yaml selects the CLI profile.
- **status models** (state): `StatusModel`, `skillStatusModel`, `capabilityStatusModel`, `deriveStatusView`, `prerequisiteIndex`; `TreeState` gains `profile` / `notice` and per-entry `updated_at` / `updated_by` / `note` / `achieved_eurekas`, with statuses validated against the profile's model.
- **themes**: per-status `statuses` map in the theme schema; capability colours in the built-in themes; new `css-variables` theme for host-driven light/dark.
- **viewer** is now published: `<TechTreeView>` (React 18 and 19, Next.js App Router ready: `'use client'` entry, SSR-safe, `style.css` export) with path highlighting, status filters, outline view, detail drawer and host-resolved links; renderer contract widened to model-driven statuses.

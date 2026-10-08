# @echozedlabs/techtree-schema

## 0.3.0

### Minor Changes

- 897f872: `initialFocus="auto"`: a readable first view at every canvas size, and pinned lane titles (ADR-0009).

  - **viewer — `initialFocus="auto"`:** fits the whole tree when that zoom is at least `readableZoom` (new prop, default 0.6), top-aligned under the era header and capped at 100 % (`fitViewOptions.maxZoom`); otherwise opens at `initialZoom` (default 0.8 for `'auto'`) top-aligned at the first lane and left-aligned at the lane titles, or at the frontier's era column when it does not fit beside them. Re-applied when the canvas is resized until the reader pans, zooms, clicks or uses the keyboard in the canvas; never afterwards. The view root carries `data-camera` / `data-camera-anchor` / `data-camera-fit-zoom`. The default (no `initialFocus`) is unchanged: fit the whole tree. `'frontier'`, node ids and `initialZoom` alone behave as before.
  - **viewer — pinned lane titles:** when the lane-title gutter scrolls off the left edge, the titles show in a rail pinned to the left of the canvas (`LaneRail`, `.tt-lane-rail`, `aria-hidden`, AA panel colours), with any camera.
  - **viewer — era titles:** an era whose column is cut by the canvas edge keeps its title inside the header row (sticky title), instead of centring it over the off-screen part.
  - **viewer — API:** `computeAutoCamera()` (pure decision), `AUTO_CAMERA_DEFAULTS`, `treeBounds()`, `bandColumn()`, `laneRailWidth()`, `LaneRail`, `laneRailLabels()`; the renderer contract gains optional `initialCamera(container) → viewport` (type `RendererInitialCamera`). Lane elements carry `data-track-id`, their titles `data-testid="lane-label"`.
  - Other packages: version bump only (fixed group).

## 0.2.0

### Minor Changes

- fd7fef4: Accessible-by-default embedding (WCAG 2.2 AA), small-screen camera, zod-free client entries, publish-ready packages (ADR-0008).

  - **viewer — landmarks, headings, focus:** the detail drawer is a labelled `<section role="region">` (was an `<aside>` nested in the view's region); `drawerElement` (`section` | `div` | `aside`) keeps the old element available. `headingLevel` (1–5, default 3) sets the drawer title / outline branch headings, sub-headings one level below (`ctx.headingLevel`, `<NodeDetail headingLevel>`). Selecting a node inside the view moves focus to the drawer heading and closing returns it, so Escape keeps working after drawer navigation; `focusDetailOnSelect={false}` opts out.
  - **viewer — colours:** `colorScheme` is passed to React Flow as `colorMode` (`'system'` resolved from a `.dark` / `.light` ancestor or the media query), so its container no longer carries a bare `light` class in dark hosts. Dimming uses `--techtree-dim-node-bg` / `-node-text` / `-node-border` / `-opacity` / `-filter` and `--techtree-dim-edge-opacity` (class `tt-graph-node-dim`) instead of opacity 0.18; locked nodes are muted by colour (`--techtree-locked-node-bg`, `--techtree-locked-opacity`, `statusVisual().muted`) instead of opacity 0.6. Pills, pressed chips and node badges use per-status `--techtree-on-status-<status>` (→ the legacy `--techtree-on-status`, no longer declared by the stylesheet → AA defaults per scheme); new `--techtree-on-accent`; `onStatusColor()` exported; `contrastTextOn()` measures WCAG contrast. Light-scheme fills for available / investigating / demonstrated / operational / achieved / legacy / submitted are slightly darker so their text reaches 4.5:1. `.tt-chip-count` drops its opacity; chips, segmented buttons and drawer / outline links get 24 px targets. Dark defaults now apply fully under a host `.dark` class, and a `.light` ancestor beats a dark OS preference.
  - **viewer — camera:** `initialFocus` (`'frontier'` | node id), `initialZoom`, `minZoom`, `maxZoom`, `fitViewOptions` (`padding`, `minZoom`, `maxZoom`, `duration`, `nodeIds`, `includeHiddenNodes`). The renderer contract gains optional `colorMode`, `minZoom`, `maxZoom`, `fitViewOptions`, `initialFitViewOptions`.
  - **schema:** zod-free entry `@echozedlabs/techtree-schema/capability-data` (`CAPABILITY_STATUSES` / `KINDS` / `LINK_RELATIONS`, their types, `capabilityData`); the main entry re-exports them from it.
  - **state:** zod-free entry `@echozedlabs/techtree-state/status-model` (status models, `deriveStatusView`, `prerequisiteIndex`, `pickFrontierNodeId`, …). The viewer now imports only the light entries — no zod in host client bundles.
  - **themes:** `css-variables` fallbacks follow the new light-scheme status fills.
  - **all packages:** ship `README.md`, `LICENSE` and `CHANGELOG.md`; release workflow publishes with an `NPM_TOKEN` secret.

- 7cc3933: Capability profile, any-of prerequisites, and an embeddable viewer.

  - **capability profile** (`--profile capability`, `*.capability.yaml`): Civilization-style capability tech trees with `capability` / `milestone` / `wonder` nodes, era + branch placement, `unlocks`, `benefit`, `eurekas`, opaque `implementations` and `{type, ref, relation}` links, `owner`, `target_status`; lint rules `era-regression`, `unreachable-milestone`, `wonder-missing-benefit`, `duplicate-eureka`. Demo: `examples/engineering-platform` (fictional).
  - **any-of prerequisite groups** in the engine (ADR-0006): `IREdge.group`, `CoreNode.requiresAnyOf`, validation (unknown refs, cycles, `any-of-singleton`, `any-of-redundant`), layout, and derivation.
  - **lane layout**: `layout.lanes: true` in tree.yaml places tracks in swimlanes; `IRTrack.order` / `color` / `lane` and `IRTree.profile` are emitted (additive, IR v1). `tree.profile` in tree.yaml selects the CLI profile.
  - **status models** (state): `StatusModel`, `skillStatusModel`, `capabilityStatusModel`, `deriveStatusView`, `prerequisiteIndex`; `TreeState` gains `profile` / `notice` and per-entry `updated_at` / `updated_by` / `note` / `achieved_eurekas`, with statuses validated against the profile's model.
  - **themes**: per-status `statuses` map in the theme schema; capability colours in the built-in themes; new `css-variables` theme for host-driven light/dark.
  - **viewer** is now published: `<TechTreeView>` (React 18 and 19, Next.js App Router ready: `'use client'` entry, SSR-safe, `style.css` export) with path highlighting, status filters, outline view, detail drawer and host-resolved links; renderer contract widened to model-driven statuses.

## 0.1.0

### Minor Changes

- initial release

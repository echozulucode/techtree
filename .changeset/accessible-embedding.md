---
'@echozedlabs/techtree-ir': minor
'@echozedlabs/techtree-schema': minor
'@echozedlabs/techtree-compiler': minor
'@echozedlabs/techtree-state': minor
'@echozedlabs/techtree-themes': minor
'@echozedlabs/techtree-viewer': minor
'@echozedlabs/techtree-server': minor
---

Accessible-by-default embedding (WCAG 2.2 AA), small-screen camera, zod-free client entries, publish-ready packages (ADR-0008).

- **viewer — landmarks, headings, focus:** the detail drawer is a labelled `<section role="region">` (was an `<aside>` nested in the view's region); `drawerElement` (`section` | `div` | `aside`) keeps the old element available. `headingLevel` (1–5, default 3) sets the drawer title / outline branch headings, sub-headings one level below (`ctx.headingLevel`, `<NodeDetail headingLevel>`). Selecting a node inside the view moves focus to the drawer heading and closing returns it, so Escape keeps working after drawer navigation; `focusDetailOnSelect={false}` opts out.
- **viewer — colours:** `colorScheme` is passed to React Flow as `colorMode` (`'system'` resolved from a `.dark` / `.light` ancestor or the media query), so its container no longer carries a bare `light` class in dark hosts. Dimming uses `--techtree-dim-node-bg` / `-node-text` / `-node-border` / `-opacity` / `-filter` and `--techtree-dim-edge-opacity` (class `tt-graph-node-dim`) instead of opacity 0.18; locked nodes are muted by colour (`--techtree-locked-node-bg`, `--techtree-locked-opacity`, `statusVisual().muted`) instead of opacity 0.6. Pills, pressed chips and node badges use per-status `--techtree-on-status-<status>` (→ the legacy `--techtree-on-status`, no longer declared by the stylesheet → AA defaults per scheme); new `--techtree-on-accent`; `onStatusColor()` exported; `contrastTextOn()` measures WCAG contrast. Light-scheme fills for available / investigating / demonstrated / operational / achieved / legacy / submitted are slightly darker so their text reaches 4.5:1. `.tt-chip-count` drops its opacity; chips, segmented buttons and drawer / outline links get 24 px targets. Dark defaults now apply fully under a host `.dark` class, and a `.light` ancestor beats a dark OS preference.
- **viewer — camera:** `initialFocus` (`'frontier'` | node id), `initialZoom`, `minZoom`, `maxZoom`, `fitViewOptions` (`padding`, `minZoom`, `maxZoom`, `duration`, `nodeIds`, `includeHiddenNodes`). The renderer contract gains optional `colorMode`, `minZoom`, `maxZoom`, `fitViewOptions`, `initialFitViewOptions`.
- **schema:** zod-free entry `@echozedlabs/techtree-schema/capability-data` (`CAPABILITY_STATUSES` / `KINDS` / `LINK_RELATIONS`, their types, `capabilityData`); the main entry re-exports them from it.
- **state:** zod-free entry `@echozedlabs/techtree-state/status-model` (status models, `deriveStatusView`, `prerequisiteIndex`, `pickFrontierNodeId`, …). The viewer now imports only the light entries — no zod in host client bundles.
- **themes:** `css-variables` fallbacks follow the new light-scheme status fills.
- **all packages:** ship `README.md`, `LICENSE` and `CHANGELOG.md`; release workflow publishes with an `NPM_TOKEN` secret.

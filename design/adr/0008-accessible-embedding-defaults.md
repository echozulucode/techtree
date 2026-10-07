# ADR-0008: Accessible-by-default embedding and zod-free client entries

## Status

Accepted

## Context

The Engineering Example Library embedded `<TechTreeView>` (ADR-0007) and had
to patch it to pass its WCAG 2.2 AA gate (axe on every page): a DOM effect
turning the drawer's `<aside>` into a region, CSS overrides for dimmed nodes
(opacity 0.18), pressed chips and the status pill (one white on-colour on
pastel dark-scheme fills), chip counts (opacity 0.75) and 24 px targets, and
an sr-only `<h2>` to repair the heading order. React Flow's default
`colorMode` put a bare `light` class on its container that re-resolved the
host's `.light` token selectors inside the canvas in dark mode. Selecting a
node from inside the drawer dropped focus to `<body>` (Escape stopped
working), fit-view made a 48-node tree unreadable at 390 px, and the viewer
pulled zod (via the schema / state main entries) into client bundles. The
host's requests are listed in its T3 handoff.

Every host would repeat these patches; they belong in the engine, as defaults.

## Decision

1. **AA is the default, configurable through CSS variables.** Every default
   text / background pair of the stylesheet meets 4.5:1 in both schemes
   (light-scheme status fills nudged darker where neither white nor dark text
   reached it). On-colours are per status — `--techtree-on-status-<status>`,
   falling back to the legacy single `--techtree-on-status` (no longer
   declared, so a host value still wins), then per-scheme defaults; hex theme
   fills get a measured WCAG choice. `--techtree-on-accent` covers the accent.
   Node states use colour instead of transparency: dimming
   (`--techtree-dim-*`, class `tt-graph-node-dim`) and locked nodes
   (`--techtree-locked-*`, `statusVisual().muted`) keep text contrast; hosts
   that want transparency set the opacity variables.
2. **Semantics follow the host page.** The drawer is a labelled
   `<section role="region">` (`drawerElement` keeps `aside` for top-level
   views); `headingLevel` sets the drawer / outline heading levels. Focus
   moves to the drawer heading on selections made inside the view and
   returns on close; selection from outside (initial / host-driven) never
   moves focus. `colorScheme` is resolved (ancestor `.dark` / `.light`, else
   the media query; `light` during SSR) and passed as React Flow `colorMode`.
3. **Small screens choose the camera:** `initialFocus` (`'frontier'` | id),
   `initialZoom`, `minZoom` / `maxZoom`, `fitViewOptions` — the initial fit is
   React Flow's own (no post-mount re-centre), the fit button keeps
   `fitViewOptions`.
4. **Zod-free client entries:** `@echozedlabs/techtree-schema/capability-data`
   (constants, types, `capabilityData`) and
   `@echozedlabs/techtree-state/status-model` (status models, derivation,
   prerequisite index, frontier). The viewer imports only these; the schema
   main entry re-exports the constants from the zod-free module.
5. **Verification lives in the repo:** stylesheet-token contrast tests, axe in
   jsdom (react19-host), axe in Chromium on the dev-harness host page
   (`e2e/a11y.spec.ts`, `features/accessibility.feature`), and an esbuild
   bundle test that no zod reaches a host bundle.

All new props are optional; existing hosts keep working. Visible changes for
existing hosts: the drawer element, slightly darker light-scheme status fills,
dimmed / locked nodes muted by colour, 24 px minimum targets.

## Consequences

### Positive

- Hosts delete their workarounds; new hosts are AA without patches.
- The on-colour / dim / locked variables are a documented theming surface.
- Client bundles of hosts no longer carry zod.

### Negative

- More CSS variables to document and keep consistent; the dark defaults are
  written twice (class/attribute block and media-query block) — a test keeps
  them identical.
- `statusVisual().opacity` is 1 for the built-in statuses; renderer authors
  that relied on it for locked nodes read `muted` instead.

### Risks

- Hosts overriding a status fill without its on-colour can still fail AA —
  documented next to the variables; the legacy single variable still applies.
- axe cannot measure text on the zoomed canvas (it reports "incomplete");
  node-text contrast is guarded by the token tests, not by axe.

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|---|---|---|---|
| Keep opacity, document host overrides | No visual change | Every host repeats the patches | The defaults must be AA |
| Contrast-aware text via CSS `contrast-color()` | No per-status table | Not supported widely enough yet | Revisit when baseline |
| Separate `-client` packages instead of subpath entries | Clear boundary | Two more packages in the fixed group | Subpath exports are enough |

## Related Documents

- ADR-0007 (embeddable viewer), ADR-0005 (fixed versioning)
- `packages/viewer/src/style.css`, `packages/viewer/src/contrast.test.ts`
- `examples/react19-host/src/{a11y,camera,color-mode,bundle,host}.test.tsx`
- `examples/dev-harness/e2e/a11y.spec.ts`, `features/accessibility.feature`

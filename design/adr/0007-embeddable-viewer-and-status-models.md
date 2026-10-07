# ADR-0007: Publishable embeddable viewer and profile status models

## Status

Accepted

## Context

The viewer was a private package whose `exports` pointed at TypeScript sources,
consumed only by the dev-harness through Vite. Its status handling was the
learner model (`locked / available / in_progress / submitted / achieved …`)
hard-coded through the shell, the renderer contract and the themes.

The Engineering Example Library (Next.js 16, React 19, PostgreSQL) will embed
TechTree to show a capability tech tree. It compiles trees at import time,
stores the IR and its own node states / history / item links in its database,
and needs a component it can drop into an App Router page. The capability
profile also brings a different status model (maturity states, with
availability derived from prerequisites).

## Decision

1. **Publish the viewer** as `@echozedlabs/techtree-viewer` in the fixed version
   group (ADR-0005), built with plain `tsc` (repo convention) plus two small
   scripts:
   - `dist/index.js` starts with `'use client'` — the whole entry is a client
     module, safe to import from an App Router client component. Pure helpers
     a server may want (derivation, prerequisite index) live in
     `@echozedlabs/techtree-state`.
   - No CSS imports in JS (they break Node ESM / SSR). One stylesheet,
     `@echozedlabs/techtree-viewer/style.css`, inlines React Flow's base CSS.
   - No `window` / `document` access at import time; the component
     server-renders (nodes carry fixed sizes from the IR).
   - React is a peer: `^18.3.0 || ^19.0.0`. A dev-only example
     (`examples/react19-host`) consumes the viewer as a pnpm *injected*
     dependency, so its peers resolve to React 19 exactly as an npm install in a
     host would, and runs server-render + jsdom interaction tests.
   - A `techtree-source` export condition maps the package to its sources for
     workspace dev servers (the dev-harness), so `pnpm dev` needs no prior build.
2. **`<TechTreeView>`** is the embedding API: the host passes `ir` and its stored
   per-node `state`, and gets selection, path highlighting (ancestors / descendants
   / both), status filters (hide or dim; bands and lanes never move), an
   accessible outline view, and a detail drawer. Everything stateful is
   controlled-or-uncontrolled (`selectedId` / `defaultSelectedId` /
   `onSelectNode`, and the same for highlight direction, status filter and view).
   Opaque links are resolved by the host through `renderLink` (return `null` to
   withhold an item — it is then neither shown nor counted), and
   `renderNodeDetail` replaces the drawer content.
3. **Status models** (`StatusModel` in the state package) make status a profile
   concern: stored statuses with labels / default colours / icon names, which
   stored statuses satisfy a prerequisite, and the derived `available` /
   `locked`. `deriveStatusView` returns, per node, the effective status (drives
   colour and filters), the stored status (what a card shows as "current"),
   `prerequisitesMet` and what is missing. The skill model reproduces the old
   behaviour; the capability model treats `demonstrated` and above (including
   `legacy` / `retiring`) as satisfying. The IR now records `tree.profile`, so
   consumers pick the model without guessing.
4. **Theming through CSS variables**: themes gain a `statuses` map (colour / icon
   / label per status id); a built-in `css-variables` theme makes every graph
   colour a `var(--techtree-*)`, and the stylesheet ships light and dark
   defaults selected by the `colorScheme` prop (`light | dark | system`, plus
   `.dark` / `.light` ancestor classes). A host maps its own tokens by setting
   the variables on `.techtree-root`.

## Consequences

### Positive

- Hosts embed one component, own their data, and theme it with their tokens.
- New profiles bring a status model instead of forking the shell.
- The standalone SPA keeps working; it delegates capability IRs to the same
  component, so the embed path is exercised by the harness and BDD suite.

### Negative

- `TreeState` entries now carry `status: string` (validated against the
  profile's model by `treeStateSchema`), widening the `SkillStateEntry` type.
- The viewer drops its `prepublishOnly` hook: injected installs would otherwise
  run a build during `pnpm install`. Publishing goes through `pnpm release`,
  which builds first.

### Risks

- Workspace consumers with a different React than the viewer's dev dependency
  must use an injected dependency (or dedupe React); documented in the example.
- The governance server still validates skill statuses only.

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|---|---|---|---|
| tsup / bundled build with a banner | Single file | Bundlers strip directives unless configured; diverges from the tsc convention | tsc preserves `'use client'` per file and keeps sourcemaps simple |
| Separate `techtree-react` package | Clear boundary | Another package to version while the API is young | The viewer already is the React package |
| Keep the skill status union and map capability states onto it | No engine change | Seven maturity states don't fit five learner states | Loses meaning |

## Related Documents

- `packages/viewer/src/embed/` (component, drawer, outline, filter)
- `packages/state/src/status-model.ts`
- `examples/react19-host/` (React 19 smoke)
- ADR-0001 (renderer), ADR-0005 (fixed versioning), ADR-0006 (any-of groups)

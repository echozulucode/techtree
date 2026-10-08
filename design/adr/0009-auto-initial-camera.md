# ADR-0009: `initialFocus="auto"` camera and pinned lane titles; default unchanged

## Status

Accepted

## Context

0.2 gave hosts two initial cameras (ADR-0008): React Flow's fit of the whole
tree (the default) and a node centred at a fixed zoom (`'frontier'` / an id).
The Engineering Example Library used `initialFocus="frontier"`,
`initialZoom={0.8}` everywhere and reported (its issue 25):

- on a 2560 × 1440 screen the frontier, centred vertically, leaves a ~200 px
  empty band above the first lane although the whole 48-node demo tree would
  fit at ~70 %;
- on phones and laptops centring the frontier cuts off the lane (branch)
  titles, which live in a gutter left of the first era column.

Neither fixed camera is right for every canvas size, and the host cannot pick
one without knowing the canvas size the engine sees (it changes with layout,
toolbars wrapping, window size).

Measured on the dev-harness host page, demo tree (3620 × 1648 canvas units
including the lane gutter):

| Window | Canvas (px) | Zoom that fits the whole tree |
| --- | --- | --- |
| 390 × 844 | 390 × 590 | 0.10 |
| 1024 × 768 | 1024 × 594 | 0.28 |
| 1440 × 900 | 1440 × 788 | 0.39 |
| 2560 × 1440 | 2560 × 1328 | 0.70 |

## Decision

1. **New `initialFocus="auto"`**, decided by a pure function
   (`computeAutoCamera`, exported) of the canvas size and the tree geometry:
   - **fit** when the zoom that fits the whole tree (nodes + lanes with their
     title gutter, 12 px padding, below the 44 px era header) is ≥
     `readableZoom` (new prop, default **0.6**): top-aligned under the era
     header, centred horizontally, capped at `fitViewOptions.maxZoom ?? 1` so a
     small tree is not blown up;
   - otherwise **focus** at `initialZoom` (default **0.8** for `'auto'`; 0.9
     stays the default for `'frontier'` / ids): top-aligned at the first lane
     (moved down only if the frontier node would be below the fold), and
     left-aligned at the tree — lane titles on screen — when the frontier's era
     column fits beside them; else left-aligned at that era column ("the first
     era column containing a frontier node", frontier as in `'frontier'`).
2. **Pinned lane titles.** When the lane-title gutter is scrolled off the left
   edge (any camera, any pan), the titles appear in a rail pinned to the left
   edge (`LaneRail`, `.tt-lane-rail`, 24 % of the canvas, 96–168 px), sticky
   within each lane below the era header — the counterpart of the pinned era
   header that already exists. This is what keeps "lane titles in view" true
   when the frontier is not in the first era (on a phone, the frontier column
   and the gutter never fit side by side at 0.8). The rail is `aria-hidden`
   (duplicates the canvas titles; the outline view is the accessible structure)
   and uses the AA panel colours.
   Era titles likewise stay inside the header row when their column is cut by
   the canvas edge (a sticky title inside each era's header box): on a 356 px
   phone canvas the focused era's title, centred over a box that reaches the
   next era, was otherwise clipped on the right.
3. **Resize behaviour.** The renderer contract gains
   `initialCamera(container) → viewport`; the React Flow renderer applies it
   when the canvas first has a size and again on every size change (coalesced
   by React Flow's resize observer) **until the reader interacts with the
   canvas** — pointer down, wheel, touch, key or focus inside it (canvas,
   minimap, controls, nodes) — or a `focusNodeId` request moves the camera.
   After that a resize never moves the camera. The viewport is transparent
   until the first camera is applied (no flash of the default viewport).
4. **The default stays the 0.2 one** (`initialFocus` omitted = fit the whole
   tree). `'auto'` changes what existing hosts see (top alignment, a 100 % cap,
   zoom 0.8 on small canvases); a minor 0.x bump allows it, but nothing forces
   it, and every host that cares already passes `initialFocus`. The README
   recommends `'auto'`; revisit the default for 1.0.
5. `'frontier'`, node ids, `initialZoom` alone and `fitViewOptions` behave as
   in 0.2. The view root exposes `data-camera` (`fit` | `focus`),
   `data-camera-anchor` (`tree` | `column`) and `data-camera-fit-zoom` for
   `'auto'` (tests, diagnostics).

## Consequences

### Positive

- One prop gives a readable first view at every size; the host no longer
  guesses a zoom per breakpoint.
- Lane titles stay readable while panning, also for `'frontier'` cameras.
- The decision is unit-testable without a DOM; the browser tests only check
  the outcome (lane title and era header on screen, no empty band > 48 px).

### Negative

- Hosts that panned the canvas before 0.3 now see the rail over the leftmost
  ~100–170 px strip at the top of each lane (behind the zoom controls).
- `'auto'` reads the frontier from the state present at mount (as
  `'frontier'` does); state that arrives later does not move the camera.

### Risks

- The rail width formula exists twice (CSS `clamp(96px, 24%, 168px)` and
  `laneRailWidth()`); a comment links them and the unit test pins the numbers.
- "Interaction" is detected by DOM events on the canvas: a host that moves the
  camera through its own React Flow instance (not the props) is not detected.
- Server-rendered HTML has the viewport transparent until hydration applies
  the camera.

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|---|---|---|---|
| Make `'auto'` the default now | Best first view without host changes | Silent camera change for every 0.2 host | No strong reason; hosts opt in with one prop |
| Host computes the camera (expose bounds only) | No engine policy | Host doesn't know the canvas size or era header; every host repeats it | Belongs in the engine (as ADR-0008) |
| Focus mode always left-aligned at the lane gutter | No rail needed | On phones (or late frontiers) the frontier is off screen | Fails "frontier top-left" |
| Recompute only on the first resize | Simpler | A later resize before any interaction leaves a stale camera | Interaction is the meaningful boundary |
| Use React Flow's `fitView` + `fitViewOptions` | No custom camera code | Centres; cannot top-align or anchor a column; can't decide fit vs. focus | Doesn't meet the brief |

## Related Documents

- `packages/viewer/src/shell/camera.ts`, `shell/lane-geometry.ts`, `shell/LaneRail.tsx`
- `packages/viewer/src/camera.test.ts`, `examples/react19-host/src/camera.test.tsx`
- `examples/dev-harness/e2e/camera.spec.ts`, `features/embedding.feature`
- ADR-0008 (camera props), ADR-0005 (fixed versioning)

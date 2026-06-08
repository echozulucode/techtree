# ADR-0001: React Flow as the canvas renderer

## Status

Accepted

## Context

The viewer renders the IR as an interactive, themeable graph with a Civ-IV "tech
tree" feel: custom node anatomy (category color, band badge, status icon, lock
overlay), per-status visuals, dependency-path highlighting, and one-click theme
switching. Two renderers were evaluated head-to-head against a written rubric on
real example trees and a 10k-node stress fixture: **React Flow** (`@xyflow/react`)
and **Cytoscape**. Both shipped behind a toggle while the decision was validated
with real authoring and use.

## Decision

Use **React Flow** as the single canvas renderer. Cytoscape was dropped from the
viewer and its bake-off implementation archived for any future graphical-editor
ADR. The renderer sits behind a small `Renderer` contract (`renderer.ts`) so an
alternate renderer (e.g. PixiJS/WebGL for very large graphs) can be added later
without touching the shell.

## Consequences

### Positive

- Custom-node ergonomics: corner status badges, band labels, and lock overlays
  are natural in React Flow's HTML node model.
- Declarative re-render on theme/status change — no imperative instance rebuild.
- Bundle dropped ~57% gzip after removing the second renderer.

### Negative

- Cytoscape's perf edge at 10k+ nodes is forfeited; not relevant at realistic
  tree sizes, but revisit if very large graphs become common (see PixiJS path).

### Risks

- A future write-heavy graphical editor may want a different renderer; the
  archived Cytoscape work and the `Renderer` contract keep that door open.

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|---|---|---|---|
| Cytoscape | Strong perf at 10k+ nodes, graph algorithms | Corner badges/HTML overlays awkward; theme switch needs instance rebuild | Loses on custom-node anatomy (40% of rubric) at realistic sizes |
| PixiJS / WebGL | Scales to very large graphs | Heavier custom-node work; overkill now | Deferred as a fallback if perf demands it |

## Related Documents

- `docs/overview.md` (rendering & interaction capabilities)
- ADR-0002 (the renderer is an IR consumer behind the Profile/CoreNode seam)

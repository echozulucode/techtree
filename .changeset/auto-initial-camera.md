---
'@echozedlabs/techtree-ir': minor
'@echozedlabs/techtree-schema': minor
'@echozedlabs/techtree-compiler': minor
'@echozedlabs/techtree-state': minor
'@echozedlabs/techtree-themes': minor
'@echozedlabs/techtree-viewer': minor
'@echozedlabs/techtree-server': minor
---

`initialFocus="auto"`: a readable first view at every canvas size, and pinned lane titles (ADR-0009).

- **viewer — `initialFocus="auto"`:** fits the whole tree when that zoom is at least `readableZoom` (new prop, default 0.6), top-aligned under the era header and capped at 100 % (`fitViewOptions.maxZoom`); otherwise opens at `initialZoom` (default 0.8 for `'auto'`) top-aligned at the first lane and left-aligned at the lane titles, or at the frontier's era column when it does not fit beside them. Re-applied when the canvas is resized until the reader pans, zooms, clicks or uses the keyboard in the canvas; never afterwards. The view root carries `data-camera` / `data-camera-anchor` / `data-camera-fit-zoom`. The default (no `initialFocus`) is unchanged: fit the whole tree. `'frontier'`, node ids and `initialZoom` alone behave as before.
- **viewer — pinned lane titles:** when the lane-title gutter scrolls off the left edge, the titles show in a rail pinned to the left of the canvas (`LaneRail`, `.tt-lane-rail`, `aria-hidden`, AA panel colours), with any camera.
- **viewer — era titles:** an era whose column is cut by the canvas edge keeps its title inside the header row (sticky title), instead of centring it over the off-screen part.
- **viewer — API:** `computeAutoCamera()` (pure decision), `AUTO_CAMERA_DEFAULTS`, `treeBounds()`, `bandColumn()`, `laneRailWidth()`, `LaneRail`, `laneRailLabels()`; the renderer contract gains optional `initialCamera(container) → viewport` (type `RendererInitialCamera`). Lane elements carry `data-track-id`, their titles `data-testid="lane-label"`.
- Other packages: version bump only (fixed group).

import type { RendererInfo } from '../renderer.js';
import { ReactFlowRenderer } from './react-flow/index.js';

/**
 * Viewer renderer registry. React Flow is the sole renderer from Phase 4 onward
 * per the Phase 3 decision gate (see `docs/decisions/renderer-bakeoff.md` §5).
 * The Cytoscape implementation is archived at
 * `docs/decisions/archive-cytoscape-renderer/` for future-phase consideration
 * (matrix overlay, graphical editor).
 *
 * The registry shape (array of `RendererInfo`) is preserved deliberately. Adding
 * a future renderer (e.g., a PixiJS/WebGL implementation for >5k visible nodes,
 * per high-level-plan §8 Phase 11) is a one-line addition here.
 */
export const RENDERERS: RendererInfo[] = [
  { id: 'react-flow', label: 'React Flow', Component: ReactFlowRenderer },
];

export const DEFAULT_RENDERER_ID = 'react-flow';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, type ColorScheme } from '@echozedlabs/techtree-viewer';
import '@echozedlabs/techtree-viewer/style.css';
import { EmbedDemo } from './EmbedDemo.js';

// The dev-harness mounts the published viewer exactly as a host app would. It
// serves the bundled example IRs from /ir/ (see scripts/setup-ir.mjs) so the
// viewer's `?ir=` / dropdown options resolve. This is the Playwright + BDD target.
//
// `?embed=<tree>` mounts the embeddable <TechTreeView> the way a host app does
// (e.g. `?embed=engineering-platform&scheme=dark`).
const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

const params = new URLSearchParams(window.location.search);
const embed = params.get('embed');
const scheme = (params.get('scheme') ?? 'light') as ColorScheme;

ReactDOM.createRoot(root).render(
  <React.StrictMode>{embed ? <EmbedDemo name={embed} colorScheme={scheme} /> : <App />}</React.StrictMode>,
);

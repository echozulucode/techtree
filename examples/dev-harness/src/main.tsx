import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@echozedlabs/techtree-viewer';

// The dev-harness mounts the published viewer exactly as a host app would. It
// serves the bundled example IRs from /ir/ (see scripts/setup-ir.mjs) so the
// viewer's `?ir=` / dropdown options resolve. This is the Playwright + BDD target.
const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

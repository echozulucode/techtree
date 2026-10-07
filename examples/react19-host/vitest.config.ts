import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The viewer is an *injected* workspace dependency (see package.json
// dependenciesMeta and pnpm-workspace.yaml): pnpm installs a copy whose peers
// (React, React Flow, lucide, zustand…) resolve to THIS package's React 19 —
// exactly what an npm install in a host app produces. No aliasing needed.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

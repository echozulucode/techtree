import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // `techtree-source` resolves workspace packages that publish it (the viewer)
  // to their TypeScript sources, so `pnpm dev` works without a prior build.
  // One React instance for the app and the linked viewer.
  resolve: { conditions: ['techtree-source'], dedupe: ['react', 'react-dom'] },
  server: { port: 5173, strictPort: true },
});

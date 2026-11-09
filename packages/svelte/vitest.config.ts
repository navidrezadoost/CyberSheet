import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // Inline component CSS into the test DOM so computed-style assertions exercise
  // the component stylesheet under jsdom, matching a browser-loaded bundle.
  plugins: [svelte({ emitCss: false, compilerOptions: { css: 'injected' } })],
  resolve: {
    conditions: ['browser'],
    alias: {
      '@cyber-sheet/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
      '@cyber-sheet/renderer-canvas': fileURLToPath(new URL('../renderer-canvas/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});

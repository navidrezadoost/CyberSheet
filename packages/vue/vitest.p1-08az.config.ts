import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: '@cyber-sheet/core',
        replacement: fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
      },
      {
        find: '@cyber-sheet/renderer-canvas',
        replacement: fileURLToPath(new URL('./src/__tests__/fixtures/renderer-canvas.ts', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    include: ['src/__tests__/useCyberSheet-initialization.p1-08az.spec.ts'],
  },
});

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: packageRoot,
  build: {
    lib: {
      entry: resolve(packageRoot, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: resolve(packageRoot, 'dist/node'),
    emptyOutDir: true,
    rollupOptions: {
      external: (id) => id === '@cyber-sheet/core' || id.startsWith('@cyber-sheet/core/'),
    },
  },
});

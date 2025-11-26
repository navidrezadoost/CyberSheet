import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: '/examples/react-index.html',
    proxy: {
      '/api': {
        target: 'http://192.168.100.60:4008',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@cybersheet/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@cybersheet/renderer-canvas': path.resolve(__dirname, './packages/renderer-canvas/src/index.ts'),
      '@cybersheet/io-xlsx': path.resolve(__dirname, './packages/io-xlsx/src/index.ts'),
      '@cyber-sheet/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@cyber-sheet/react': path.resolve(__dirname, './packages/react/src/index.ts'),
    },
  },
});

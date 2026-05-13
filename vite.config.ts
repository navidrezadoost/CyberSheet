import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}
  },
  server: {
    port: 5173,
    open: '/examples/excel-app-demo.html',
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;",
    },
    proxy: {
      '/api': {
        target: 'http://192.168.100.60:4009',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: 'http://192.168.100.60:4008',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('service', 'Gateway');
          });
        },
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
      '@cyber-sheet/cf-ui-core': path.resolve(__dirname, './packages/cf-ui-core/src/index.ts'),
    },
  },
});

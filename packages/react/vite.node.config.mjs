import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const peerPackages = [
  '@cyber-sheet/core',
  '@cyber-sheet/renderer-canvas',
  'react',
  'react-dom',
];
const subpathBuilds = {
  ribbon: {
    entry: resolve(packageRoot, 'src/components/ribbon/index.ts'),
    outDir: resolve(packageRoot, 'dist/node/components/ribbon'),
    fileName: 'index.js',
  },
  findReplace: {
    entry: resolve(packageRoot, 'src/components/dialogs/FindReplaceDialog.tsx'),
    outDir: resolve(packageRoot, 'dist/node/components/dialogs'),
    fileName: 'FindReplaceDialog.js',
  },
};
const selectedSubpath = process.env.CS_REACT_NODE_SUBPATH;
const selectedBuild = selectedSubpath ? subpathBuilds[selectedSubpath] : undefined;

if (selectedSubpath && !selectedBuild) {
  throw new Error(`Unknown React Node subpath build: ${selectedSubpath}`);
}

export default defineConfig({
  root: packageRoot,
  plugins: [
    {
      name: 'exclude-css-imports-from-node-target',
      enforce: 'pre',
      transform(code, id) {
        if (!/\.[jt]sx?$/.test(id)) return null;

        const withoutCssImports = code.replace(
          /^\s*import\s+(?:[^'";]+\s+from\s+)?['"][^'"\n]+\.css['"];?\s*$/gm,
          '',
        );

        return withoutCssImports === code
          ? null
          : { code: withoutCssImports, map: null };
      },
    },
  ],
  build: {
    lib: {
      entry: selectedBuild?.entry ?? resolve(packageRoot, 'src/index.ts'),
      formats: ['es'],
      fileName: () => selectedBuild?.fileName ?? 'index.js',
    },
    outDir: selectedBuild?.outDir ?? resolve(packageRoot, 'dist/node'),
    emptyOutDir: !selectedBuild,
    rollupOptions: {
      external: (id) =>
        peerPackages.some((peer) => id === peer || id.startsWith(`${peer}/`)),
    },
  },
});

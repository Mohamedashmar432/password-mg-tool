import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const srcRoot = resolve(__dirname, 'src');
const distDir = resolve(__dirname, 'dist');

function copyManifestPlugin() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      const iconsDir = resolve(distDir, 'icons');
      if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
      copyFileSync(resolve(__dirname, 'manifest.json'), resolve(distDir, 'manifest.json'));
      ['icon16.png', 'icon48.png', 'icon128.png'].forEach(f => {
        const src = resolve(__dirname, `public/icons/${f}`);
        if (existsSync(src)) copyFileSync(src, resolve(iconsDir, f));
      });
    },
  };
}

export default defineConfig({
  root: srcRoot,
  plugins: [svelte({ preprocess: preprocess() }), copyManifestPlugin()],
  build: {
    outDir: distDir,
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        background: resolve(srcRoot, 'background/index.ts'),
        content:    resolve(srcRoot, 'content/index.ts'),
        popup:      resolve(srcRoot, 'popup/index.html'),
        dashboard:  resolve(srcRoot, 'dashboard/index.html'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background' || chunk.name === 'content') {
            return '[name]/index.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    target: 'es2022',
  },
  resolve: {
    alias: { '@': srcRoot },
  },
});

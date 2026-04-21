import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: './test.tsx',
      output: {
        entryFileNames: 'bundle.js',
        assetFileNames: 'bundle.[ext]',
      },
    },
    assetsInlineLimit: 0, // Inline all assets
  },
});
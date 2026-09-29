import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: false,
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
  },
});

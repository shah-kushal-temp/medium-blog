import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: false,
  server: {
    port: 5174,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the build works from any folder, e.g. GitHub Pages at /summer-days/.
  base: './',
  server: {
    port: 5173,
  },
});

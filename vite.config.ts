import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative base path so the built assets work seamlessly on GitHub Pages
  // whether deployed at root (wen.domain.com) or subfolder (user.github.io/wen/)
  base: './',
  server: {
    port: 3333,
    host: true
  },
  preview: {
    port: 3333,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});

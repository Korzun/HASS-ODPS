import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiUrl,
      '/login': apiUrl,
      '/logout': apiUrl,
    },
    watch: process.env['DOCKER'] ? { usePolling: true } : {},
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setup.ts'],
  },
});

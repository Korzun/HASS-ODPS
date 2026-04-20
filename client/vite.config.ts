import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiUrl,
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

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Repairs the non-functional native localStorage that Node >= 22 leaks into
    // jsdom test files. No-op in the global node env (no window). See the setup
    // file for details. This does NOT change the global `environment`.
    setupFiles: ['./src/test/setup-localstorage.ts'],
  },
});

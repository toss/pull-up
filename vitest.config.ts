import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest_cache',
  test: {
    globals: true,
    environment: 'node',
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest_cache',
  test: {
    globals: true,
    environment: 'node',
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/**/*.spec.ts'],
          globalSetup: './tests/build-cli.ts',
          testTimeout: 30_000,
        },
      },
      {
        test: {
          name: 'exe',
          include: ['tests/cli/**/*.spec.ts'],
          globalSetup: './tests/build-cli.ts',
          testTimeout: 30_000,
        },
      },
    ],
  },
});

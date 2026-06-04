import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    testTimeout: 10_000,
    server: {
      deps: {
        external: ['**/scripts/ppt/*.mjs'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json', 'json-summary'],
      include: ['lib/**/*.ts'],
      exclude: ['node_modules/', 'test/', 'dist/', '**/*.d.ts'],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 75,
        lines: 80,
      },
    },
  },
});

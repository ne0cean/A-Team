import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json'],
      include: ['lib/**/*.ts'],
      exclude: ['node_modules/', 'test/', 'dist/', '**/*.d.ts'],
    },
  },
});

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: ['lib/**/*.ts', '!lib/**/*.d.ts'],
  testRunner: 'vitest',
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  reporters: ['clear-text', 'progress', 'html'],
  htmlReporter: { fileName: 'reports/mutation.html' },
  incremental: true,
  incrementalFile: 'reports/stryker-incremental.json',
  thresholds: { high: 80, low: 60, break: 50 },
  tempDirName: '.stryker-tmp',
  concurrency: 4,
};

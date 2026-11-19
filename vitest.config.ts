import { defineConfig } from 'vitest/config';

// One test run across the workspace; each package defines its own project. Browser tests run
// separately (pnpm test:storybook). Do not add a --project filter to `pnpm test:coverage`: it
// changes what the patterns below are relative to, and a pattern that matches nothing passes
// silently. scripts/ci/check-coverage.mjs fails if the money code is missing from the report.
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*', 'scripts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'lcov'],
      include: ['packages/*/src/**', 'apps/*/src/**', 'apps/web/lib/**'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.stories.tsx', '**/test/**', '**/index.ts'],
      thresholds: {
        // Money, IDs, dates and document numbers: 100% (phase-0-plan.md step 0.4).
        'packages/shared-kernel/src/**': { 100: true },
      },
    },
  },
});

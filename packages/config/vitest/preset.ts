import { defineProject } from 'vitest/config';
import type { ViteUserConfig } from 'vitest/config';

/**
 * Shared Vitest project settings. Each package's vitest.config.ts calls this with its name.
 * Coverage thresholds are set per package (shared-kernel: 100%, see testing-strategy.md).
 */
export function pitchforgeProject(
  name: string,
  overrides: ViteUserConfig['test'] = {},
): ViteUserConfig {
  return defineProject({
    test: {
      name,
      include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
      environment: 'node',
      restoreMocks: true,
      ...overrides,
    },
  });
}

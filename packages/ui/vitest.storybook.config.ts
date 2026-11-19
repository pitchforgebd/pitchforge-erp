import path from 'node:path';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineProject } from 'vitest/config';

// Runs every story in a real Chromium: it must render, pass its play test and pass axe.
export default defineProject({
  plugins: [storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') })],
  test: {
    name: 'ui-stories',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});

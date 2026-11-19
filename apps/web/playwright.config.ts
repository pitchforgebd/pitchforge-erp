import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

// Runs the production build, so the strict Content-Security-Policy is what gets tested.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: process.env['CI'] === 'true',
  retries: process.env['CI'] === 'true' ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${String(PORT)}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec next build && pnpm exec next start -p ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { API_MODE: 'mock', ALLOW_MOCK_API: 'true', NEXT_TELEMETRY_DISABLED: '1' },
  },
});

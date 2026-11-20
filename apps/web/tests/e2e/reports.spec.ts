import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { FINANCE, PARTNER, PM, axeViolations, hasNoSidewaysScroll, signIn } from './helpers.ts';

/* Sprint F5: financial statements, the trial balance, reports, schedules and the PWA. */

const toast = (page: Page, text: string) => page.getByText(text).first();
const openTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true }).click();

test('the statements open an account’s ledger', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/reports');
  await expect(page.getByText('Profit for the period').first()).toBeVisible();
  await openTab(page, 'Trial balance');
  await page.getByRole('button', { name: 'Bank · current account' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('JE-2627-00412')).toBeVisible();
  await expect(dialog.getByText('Closing balance')).toBeVisible();
});

test('comparing with last year adds the earlier figures', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/reports');
  await expect(page.getByText('৳81,50,000')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Compare with last year' }).click();
  await expect(page.getByText('৳81,50,000').first()).toBeVisible();
});

test('a salary column reaches partners, not finance', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/reports');
  await openTab(page, 'Reports');
  await page.getByLabel('Report', { exact: true }).selectOption('payroll_summary');
  await expect(page.getByRole('columnheader', { name: 'Gross' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Average salary' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Export' }).click();
  await expect(
    toast(page, 'Export started; it is logged and filtered like the report.'),
  ).toBeVisible();
});

test('a report is scheduled to the person who asks', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/reports');
  await openTab(page, 'Schedules');
  await expect(page.getByRole('cell', { name: 'Budget against actual' })).toBeVisible();
  await page.getByRole('button', { name: 'Schedule monthly' }).click();
  await expect(toast(page, 'Report scheduled.')).toBeVisible();
});

test('a project manager has no reports', async ({ page }) => {
  await signIn(page, PM);
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Reports' })).toHaveCount(0);
});

test('the app can be installed: manifest and icon load without a session', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);
  expect(await manifest.json()).toMatchObject({ short_name: 'Pitchforge', display: 'standalone' });
  const icon = await request.get('/icon.svg');
  expect(icon.status()).toBe(200);
  expect(icon.headers()['x-content-type-options']).toBe('nosniff');
});

test('the reports pass axe and fit a phone', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/reports');
  for (const tab of ['Statements', 'Trial balance', 'Reports', 'Schedules']) {
    await openTab(page, tab);
    await page.waitForLoadState('networkidle');
    expect(await axeViolations(page), tab).toEqual([]);
  }
  await page.setViewportSize({ width: 360, height: 780 });
  await openTab(page, 'Statements');
  expect(await hasNoSidewaysScroll(page)).toBe(true);
});

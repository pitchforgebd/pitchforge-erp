import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  EMPLOYEE,
  FINANCE,
  PARTNER,
  PM,
  axeViolations,
  hasNoSidewaysScroll,
  signIn,
} from './helpers.ts';

/* Sprint F3.2: the pipeline, leads, clients, quotations, contracts and tenders. */

const toast = (page: Page, text: string) => page.getByText(text).first();

test('a partner moves a deal and marks one lost with a reason', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/crm');
  await expect(page.getByRole('region', { name: 'Negotiation' })).toBeVisible();
  await page.getByLabel('Stage of Warehouse management').selectOption({ label: 'Proposal' });
  await expect(toast(page, 'Deal moved.')).toBeVisible();

  await page.getByRole('button', { name: 'Mark Warehouse management as lost' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Why it was lost').fill('Chose an Indian vendor');
  await dialog.getByRole('button', { name: 'Mark as lost' }).click();
  await expect(toast(page, 'Marked lost.')).toBeVisible();
});

test('a project manager reads the pipeline but cannot act on it', async ({ page }) => {
  await signIn(page, PM);
  await page.goto('/crm');
  await expect(page.getByRole('region', { name: 'Negotiation' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Mark .* as won$/ })).toHaveCount(0);
});

test('an employee has no sales screens', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto('/crm');
  await expect(page.getByRole('heading', { name: 'Sales and tenders' })).toHaveCount(0);
});

test('a qualified lead becomes a client', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/crm');
  await page.getByRole('tab', { name: 'Leads' }).click();
  await page
    .getByRole('button', { name: 'Convert to client: Chattogram Port Users Forum' })
    .click();
  await expect(toast(page, 'Chattogram Port Users Forum is now a client.')).toBeVisible();
});

test('a draft quotation shows the server’s totals and is submitted', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/crm');
  await page.getByRole('tab', { name: 'Quotations' }).click();
  await page.getByRole('button', { name: 'Draft quotation' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Discount, VAT and the total come from the server.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit' }).click();
  await expect(toast(page, 'Quotation submitted.')).toBeVisible();
});

test('a submitted tender gets its outcome, and its bid checklist shows who owes what', async ({
  page,
}) => {
  await signIn(page, PARTNER);
  await page.goto('/crm');
  await page.getByRole('tab', { name: 'Tenders' }).click();
  await page.getByRole('button', { name: 'Billing and customer service system' }).click();
  await expect(page.getByText(/Bid documents · \d+ of 10 ready/)).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Website and e-services revamp' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Record outcome' }).click();
  await dialog.getByLabel('Rank').fill('2');
  await dialog.getByLabel('Winning price').fill('52,00,000');
  await dialog.getByRole('button', { name: 'Record outcome' }).click();
  await expect(toast(page, 'Outcome recorded.')).toBeVisible();
});

test('finance reads guarantees but cannot release them', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/crm');
  await page.getByRole('tab', { name: 'Guarantees and documents' }).click();
  await expect(page.getByText('CBL/PG/2026/0544')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Record release:/ })).toHaveCount(0);
});

test('the sales screens pass axe and fit a phone', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/crm');
  await expect(page.getByRole('region', { name: 'Negotiation' })).toBeVisible();
  for (const tab of [
    'Pipeline',
    'Leads',
    'Clients',
    'Quotations',
    'Tenders',
    'Guarantees and documents',
  ]) {
    await page.getByRole('tab', { name: tab }).click();
    await page.waitForLoadState('networkidle');
    expect(await axeViolations(page), tab).toEqual([]);
  }
  await page.setViewportSize({ width: 360, height: 780 });
  await page.getByRole('tab', { name: 'Pipeline' }).click();
  expect(await hasNoSidewaysScroll(page)).toBe(true);
});

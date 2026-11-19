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

/* Sprint F2.2: invoices, receipts, tax and partners. */

const toast = (page: Page, text: string) => page.getByText(text).first();

async function confirmPassword(page: Page): Promise<void> {
  const stepUp = page.getByRole('dialog', { name: 'Confirm it is you' });
  await stepUp.getByLabel('Password').fill('sample-only');
  await stepUp.getByRole('button', { name: 'Confirm' }).click();
}

test('finance posts a draft invoice from a milestone', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/billing');
  await page.getByRole('button', { name: 'Draft invoice' }).click();
  const invoice = page.getByRole('dialog');
  await expect(invoice.getByText('Milestone sign-off')).toBeVisible();
  await invoice.getByRole('button', { name: 'Post and send' }).click();
  await expect(toast(page, 'Posted as INV-2627-00051.')).toBeVisible();
});

test('a receipt shows the AIT the client deducted', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/billing');
  await page.getByRole('tab', { name: 'Receipts' }).click();
  await page.getByRole('button', { name: 'RCP-2627-00098' }).click();
  const receipt = page.getByRole('dialog');
  await expect(receipt.getByText('৳1,08,000')).toBeVisible();
  await expect(receipt.getByText('INV-2627-00045')).toBeVisible();
});

test('finance records a receipt with AIT deducted', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/billing');
  await page.getByRole('tab', { name: 'Receipts' }).click();
  await page.getByRole('button', { name: 'Record receipt' }).click();
  const form = page.getByRole('dialog', { name: 'Record receipt' });
  await form.getByLabel('Invoice').selectOption({ label: 'INV-2627-00044 · Kaashful Retail' });
  await expect(form.getByText('Open balance')).toBeVisible();
  await form.getByLabel('Received into').selectOption({ label: 'City Bank · current' });
  await form.getByRole('textbox', { name: /^Received/ }).fill('1,21,125');
  await form.getByLabel('AIT').fill('6375');
  await form.getByRole('button', { name: 'Save draft' }).click();
  await expect(toast(page, 'Draft receipt saved.')).toBeVisible();
});

test('a write-off goes to a Partner for approval', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/billing');
  await page.getByRole('tab', { name: 'Credit notes' }).click();
  await page.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(toast(page, 'Sent for approval.')).toBeVisible();
});

test('receivables ageing opens a client’s statement', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/billing');
  await page.getByRole('tab', { name: 'Receivables ageing' }).click();
  await page.getByRole('button', { name: 'Nodi Microfinance' }).click();
  const statement = page.getByRole('dialog', { name: 'Statement · Nodi Microfinance' });
  await expect(statement.getByText('RCP-2627-00098')).toBeVisible();
  await expect(statement.getByText('Closing')).toBeVisible();
});

test('the VAT return shows the server’s figures for each month', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await page.getByRole('tab', { name: 'VAT and withholding' }).click();
  await expect(page.getByText('৳59,800')).toBeVisible();
  await page.getByLabel('Month').selectOption('2026-09');
  await expect(page.getByText('৳72,100').first()).toBeVisible();
  await expect(page.getByText('NMF/AIT/2026/0412')).toBeVisible();
});

test('a partner sends a drawing for approval after step-up', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/partners');
  await page.getByRole('button', { name: 'Submit for approval' }).first().click();
  await confirmPassword(page);
  await expect(toast(page, 'Sent to the other partners for approval.')).toBeVisible();
});

test('a drawing above the withdrawable balance is refused', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/partners');
  await page.getByRole('button', { name: 'Submit for approval' }).last().click();
  await confirmPassword(page);
  await expect(page.getByRole('alert').first()).toContainText('more than the partner may withdraw');
});

test('a partner previews and posts a profit distribution', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/partners');
  await page.getByRole('button', { name: 'Preview distribution' }).click();
  const preview = page.getByRole('dialog', { name: 'Preview' });
  await expect(preview.getByText('৳8,04,600')).toBeVisible();
  await preview.getByRole('button', { name: 'Post distribution' }).click();
  await confirmPassword(page);
  await expect(toast(page, 'Posted as DIST-2627-00003.')).toBeVisible();
});

test('a partner’s withdrawable balance carries the server’s warning', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/partners');
  await page.getByRole('button', { name: 'Withdrawable and statement of Sabbir Rahman' }).click();
  await expect(page.getByRole('dialog').getByText('is owed to the company')).toBeVisible();
});

test('finance sees partner balances but cannot run a distribution', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/partners');
  await expect(page.getByText('৳16,00,000')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Preview distribution' })).toHaveCount(0);
});

for (const [role, email] of [
  ['project manager', PM],
  ['employee', EMPLOYEE],
] as const) {
  test(`a ${role} is told they have no access to billing or partners`, async ({ page }) => {
    await signIn(page, email);
    for (const path of ['/billing', '/partners']) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: 'You do not have access to this' }),
      ).toBeVisible();
    }
  });
}

for (const path of ['/billing', '/partners']) {
  test(`${path} passes axe and fits 360 px`, async ({ page }) => {
    await signIn(page, PARTNER);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('table').first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await page.setViewportSize({ width: 360, height: 700 });
    expect(await hasNoSidewaysScroll(page)).toBe(true);
  });
}

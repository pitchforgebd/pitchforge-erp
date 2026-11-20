import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { EMPLOYEE, FINANCE, PARTNER, axeViolations, signIn } from './helpers.ts';

/* Sprint F6: create and edit forms in finance, the ledger, billing and partners. */

const toast = (page: Page, text: string) => page.getByText(text).first();
const openTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true }).click();

async function confirmStepUp(page: Page): Promise<void> {
  const stepUp = page.getByRole('dialog', { name: 'Confirm it is you' });
  await stepUp.getByLabel('Password').fill('sample-only');
  await stepUp.getByRole('button', { name: 'Confirm' }).click();
}

test('an employee files an expense claim, checked against the contract first', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto('/hr');
  await page.getByRole('button', { name: 'New expense claim' }).click();
  const dialog = page.getByRole('dialog', { name: 'New expense claim' });
  await dialog.getByRole('button', { name: 'Save draft' }).click();
  await expect(dialog.locator('[aria-invalid="true"]').first()).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await dialog.getByLabel(/Description/).fill('Bus to the Gazipur client site');
  await dialog.getByLabel(/Kind of expense/).selectOption('5610');
  await dialog.getByLabel(/Amount/).fill('1,250');
  await dialog.getByRole('button', { name: /Date/ }).click();
  await page
    .getByRole('gridcell')
    .filter({ hasText: /^1[0-9]$/ })
    .first()
    .click();
  await dialog.getByRole('button', { name: 'Save draft' }).click();
  await expect(toast(page, 'Claim saved as a draft.')).toBeVisible();
});

test('an employee submits a draft claim; finance pays an approved one', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto('/hr');
  await page.getByRole('button', { name: 'Submit claim: Ride to the BRAC Bank branch' }).click();
  await expect(toast(page, 'Claim sent for approval.')).toBeVisible();
});

test('finance pays an approved claim from a bank account', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await openTab(page, 'Claims and advances');
  const dialog = page.getByRole('dialog', { name: 'Pay Mehedi Hasan' });
  // Under load the first click can land before the page is interactive.
  await expect(async () => {
    await page.getByRole('button', { name: 'Pay Mehedi Hasan' }).first().click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await dialog.getByLabel(/Pay from/).selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'Pay', exact: true }).click();
  await expect(toast(page, 'Paid and posted.')).toBeVisible();
});

test('finance raises an invoice with two lines; the server works out the VAT', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/billing');
  await page.getByRole('button', { name: 'New invoice' }).click();
  const dialog = page.getByRole('dialog', { name: 'New invoice' });
  await expect(dialog.getByText('VAT, totals and the posting come from the server.')).toBeVisible();
  await dialog.getByLabel(/^Client/).selectOption({ index: 1 });
  await dialog.getByLabel('Description, line 1').fill('Support, November');
  await dialog.getByLabel('Quantity, line 1').fill('1');
  await dialog.getByLabel('Unit price, line 1').fill('1,20,000');
  await dialog.getByRole('button', { name: 'Add a line' }).click();
  await dialog.getByLabel('Description, line 2').fill('Extra training day');
  await dialog.getByLabel('Quantity, line 2').fill('2');
  await dialog.getByLabel('Unit price, line 2').fill('15,000');
  await dialog.getByRole('button', { name: 'Save draft' }).click();
  await expect(toast(page, 'Invoice saved as a draft.')).toBeVisible();
});

test('finance edits a draft invoice', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/billing');
  await page.getByRole('button', { name: 'Draft invoice' }).first().click();
  await page.getByRole('button', { name: 'Edit Draft invoice' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Draft invoice' });
  await expect(dialog.getByLabel('Description, line 1')).not.toHaveValue('');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('a new VAT code waits for the partner’s password', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/ledger');
  await openTab(page, 'Rules and rates');
  await page.getByRole('button', { name: 'New VAT code' }).click();
  const dialog = page.getByRole('dialog', { name: 'New VAT code' });
  await dialog.getByLabel(/^Code/).fill('VAT-7.5');
  await dialog.getByLabel(/^Name/).fill('Reduced rate services');
  await dialog.getByLabel(/^Rate/).fill('0.075');
  await dialog.getByRole('button', { name: /Valid from/ }).click();
  await page
    .getByRole('gridcell')
    .filter({ hasText: /^2[0-9]$/ })
    .first()
    .click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await confirmStepUp(page);
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('finance cannot add VAT codes: the server refuses', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/ledger');
  await openTab(page, 'Rules and rates');
  await page.getByRole('button', { name: 'New VAT code' }).click();
  const dialog = page.getByRole('dialog', { name: 'New VAT code' });
  await dialog.getByLabel(/^Code/).fill('VAT-7.5');
  await dialog.getByLabel(/^Name/).fill('Reduced rate services');
  await dialog.getByLabel(/^Rate/).fill('0.075');
  await dialog.getByRole('button', { name: /Valid from/ }).click();
  await page
    .getByRole('gridcell')
    .filter({ hasText: /^2[0-9]$/ })
    .first()
    .click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  // Refused on the role, before any password is asked for.
  await expect(dialog.getByText('You do not have permission to do this.')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Confirm it is you' })).toHaveCount(0);
});

test('finance edits a draft manual journal with the same line editor', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/ledger');
  await openTab(page, 'Manual journals');
  await page.getByRole('button', { name: 'Draft voucher' }).first().click();
  await page.getByRole('button', { name: 'Edit draft' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit draft' });
  await expect(dialog.getByRole('textbox').first()).not.toHaveValue('');
});

test('a partner reverses a distribution with a reason, after step-up', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/partners');
  await page
    .getByRole('button', { name: /^Reverse distribution/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: /^Reverse distribution/ });
  await dialog.getByLabel(/Reason/).fill('Posted against the wrong quarter');
  await dialog.getByRole('button', { name: 'Reverse', exact: true }).click();
  await confirmStepUp(page);
  await expect(toast(page, 'Distribution reversed.')).toBeVisible();
});

test('the new forms pass axe', async ({ page }) => {
  await signIn(page, PARTNER);
  for (const [url, tab, button] of [
    ['/finance', 'Bank and cash', 'New bank or cash account'],
    ['/finance', 'Cheques', 'New cheque'],
    ['/ledger', 'Rules and rates', 'New posting rule version'],
    ['/partners', null, 'New equity version'],
  ] as const) {
    await page.goto(url);
    if (tab !== null) await openTab(page, tab);
    await page.getByRole('button', { name: button }).click();
    await expect(page.getByRole('dialog', { name: button })).toBeVisible();
    expect(await axeViolations(page), button).toEqual([]);
    await page.keyboard.press('Escape');
  }
});

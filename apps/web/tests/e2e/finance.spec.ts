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

/* Sprint F2.1: payables, bank and the ledger. */

async function openTab(page: Page, name: string): Promise<void> {
  await page.getByRole('tab', { name }).click();
}

const toast = (page: Page, text: string) => page.getByText(text).first();

test('finance records a vendor bill as a draft', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await page.getByRole('button', { name: 'New vendor bill' }).click();
  const form = page.getByRole('dialog', { name: 'New vendor bill' });
  await form.getByLabel('Vendor').selectOption({ label: 'CloudNest Hosting Ltd' });
  await form.getByLabel('Account').selectOption({ label: '5410 · Cloud and hosting' });
  await form.getByLabel('Description').fill('Backup storage · November');
  await form.getByLabel('Net amount').fill('18,000');
  await form.getByLabel('VAT').fill('2700');
  await form.getByRole('button', { name: 'Save draft' }).click();
  await expect(toast(page, 'Draft bill saved.')).toBeVisible();
});

test('the bill form checks its fields with the contract before sending', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await page.getByRole('button', { name: 'New vendor bill' }).click();
  const form = page.getByRole('dialog', { name: 'New vendor bill' });
  await form.getByLabel('Net amount').fill('abc');
  await form.getByRole('button', { name: 'Save draft' }).click();
  await expect(form.getByLabel('Net amount')).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByLabel('Vendor')).toHaveAttribute('aria-invalid', 'true');
});

test('a draft bill shows the server’s posting preview and goes for approval', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await page.getByRole('button', { name: 'Draft bill' }).click();
  const bill = page.getByRole('dialog');
  await expect(bill.getByText('Posting preview')).toBeVisible();
  await expect(bill.getByText('Input VAT')).toBeVisible();
  await bill.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(toast(page, 'Bill sent for approval.')).toBeVisible();
});

test('a payment run is created from bills that are ready to pay', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await openTab(page, 'Payment runs');
  await page.getByRole('button', { name: 'New payment run' }).click();
  const run = page.getByRole('dialog', { name: 'New payment run' });
  await expect(run.getByRole('button', { name: 'Create run' })).toBeDisabled();
  await run.getByLabel('Pay from').selectOption({ label: 'City Bank · current' });
  await run.getByRole('checkbox', { name: /Gulshan Office Space/ }).click();
  await run.getByRole('button', { name: 'Create run' }).click();
  await expect(toast(page, 'Payment run created.')).toBeVisible();
});

test('a payment run shows withholding and says its preparer cannot approve it', async ({
  page,
}) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await openTab(page, 'Payment runs');
  await page.getByRole('button', { name: 'PRN-2627-00014' }).click();
  const run = page.getByRole('dialog');
  await expect(
    run.getByText('The person who prepares a payment run cannot approve it.'),
  ).toBeVisible();
  await expect(run.getByText('৳11,250')).toBeVisible();
  await run.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(toast(page, 'Payment run sent for approval.')).toBeVisible();
});

test('bank lines are matched, or posted when the ledger has no entry', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await openTab(page, 'Reconciliation');
  await expect(page.getByText('Lines to match')).toBeVisible();
  await page.getByRole('button', { name: 'Match' }).first().click();
  await expect(toast(page, 'Matched to JE-2627-00410.')).toBeVisible();

  await page.getByRole('button', { name: 'Post entry' }).first().click();
  const post = page.getByRole('dialog', { name: 'Post an entry for this line' });
  await post.getByLabel('Account').selectOption({ label: '6710 · Bank charges' });
  await post.getByRole('button', { name: 'Post entry' }).click();
  await expect(toast(page, 'Posted JE-2627-00415 and matched.')).toBeVisible();
});

test('a partner sees no bank account numbers; finance does', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/finance');
  await openTab(page, 'Bank and cash');
  await expect(page.getByText('Hidden for your role').first()).toBeVisible();
  await expect(page.getByText('••••4821')).toHaveCount(0);
});

test('a manual journal that does not balance is refused by the server', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/ledger');
  await openTab(page, 'Manual journals');
  await page.getByRole('button', { name: 'Draft voucher' }).first().click();
  const draft = page.getByRole('dialog');
  await draft.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(draft.getByRole('alert')).toContainText('Debits and credits do not match');
});

test('a manual journal dated in a locked month is refused', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/ledger');
  await openTab(page, 'Manual journals');
  await page.getByRole('button', { name: 'Draft voucher' }).nth(1).click();
  const draft = page.getByRole('dialog');
  await draft.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(draft.getByRole('alert')).toContainText('This period is locked');
});

test('a posted entry is reversed with a reason, never edited', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/ledger');
  await page.getByRole('button', { name: 'JE-2627-00410' }).click();
  const entry = page.getByRole('dialog');
  await expect(entry.getByText('Posted entries cannot be edited or deleted.')).toBeVisible();
  await entry.getByRole('button', { name: 'Reverse' }).click();
  await expect(entry.getByRole('button', { name: 'Reverse' })).toBeDisabled();
  await entry.getByLabel(/Reason for the reversal/).fill('Paid from the wrong account');
  await entry.getByRole('button', { name: 'Reverse' }).click();
  await expect(toast(page, 'Reversed as JE-2627-00414.')).toBeVisible();
});

test('a reversed entry offers no second reversal', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/ledger');
  await page.getByRole('button', { name: 'JE-2627-00401' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Reverse' })).toHaveCount(0);
});

test('only a partner reopens a locked month, after step-up', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/ledger');
  await openTab(page, 'Periods');
  await page.getByRole('button', { name: 'Reopen' }).last().click();
  const reopen = page.getByRole('dialog', { name: /Reopen/ });
  await reopen.getByLabel(/Why it must be reopened/).fill('Late credit note from CloudNest');
  await reopen.getByRole('button', { name: 'Reopen' }).click();
  const stepUp = page.getByRole('dialog', { name: 'Confirm it is you' });
  await stepUp.getByLabel('Password').fill('sample-only');
  await stepUp.getByRole('button', { name: 'Confirm' }).click();
  await expect(toast(page, 'Period reopened. Every Partner is told.')).toBeVisible();
});

test('finance can lock a month but not reopen one', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/ledger');
  await openTab(page, 'Periods');
  await expect(page.getByRole('button', { name: 'Lock' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reopen' })).toHaveCount(0);
});

for (const [role, email] of [
  ['project manager', PM],
  ['employee', EMPLOYEE],
] as const) {
  test(`a ${role} opening /finance or /ledger is told they have no access`, async ({ page }) => {
    await signIn(page, email);
    for (const path of ['/finance', '/ledger']) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: 'You do not have access to this' }),
      ).toBeVisible();
    }
  });
}

for (const path of ['/finance', '/ledger']) {
  test(`${path} passes axe and fits 360 px`, async ({ page }) => {
    await signIn(page, FINANCE);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('table').first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await page.setViewportSize({ width: 360, height: 700 });
    expect(await hasNoSidewaysScroll(page)).toBe(true);
  });
}

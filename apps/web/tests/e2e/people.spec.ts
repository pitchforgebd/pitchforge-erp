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

/* Sprint F4: self-service, employees, attendance, leave, payroll and procurement. */

const toast = (page: Page, text: string) => page.getByText(text).first();
const openTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true }).click();

async function confirmStepUp(page: Page): Promise<void> {
  const stepUp = page.getByRole('dialog', { name: 'Confirm it is you' });
  await stepUp.getByLabel('Password').fill('sample-only');
  await stepUp.getByRole('button', { name: 'Confirm' }).click();
}

test('an employee checks in, sees their leave and submits a draft', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto('/hr');
  await page.getByRole('button', { name: 'Check in' }).click();
  await expect(toast(page, 'Recorded.')).toBeVisible();
  await expect(page.getByText('7 days left')).toBeVisible();
  await page.getByRole('button', { name: 'Submit leave 2026-12-24 – 2026-12-31' }).click();
  await expect(toast(page, 'Leave request sent for approval.')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Payroll' })).toHaveCount(0);
});

test('an employee opens their own payslip', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto('/hr');
  await page.getByRole('button', { name: 'Open payslip of Arif Hossain for 2026-10' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('− Salary loan')).toBeVisible();
  await expect(dialog.getByText('Net pay')).toBeVisible();
});

test('a partner sees no one’s NID; a leaver shows the clearance checklist', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/hr');
  await openTab(page, 'Employees');
  await page.getByRole('button', { name: 'Rumana Sultana' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Hidden for your role').first()).toBeVisible();
  await expect(dialog.getByText('Clearance before 2026-11-30')).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Return laptop AST-0136' }).click();
  await expect(toast(page, 'Clearance updated.')).toBeVisible();
});

test('a partner locks an approved payroll run after step-up', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/hr');
  await openTab(page, 'Payroll');
  await page.getByRole('button', { name: 'PAY-2627-00005' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('cell', { name: 'Arif Hossain' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Lock and post' }).click();
  await confirmStepUp(page);
  await expect(toast(page, 'Run locked and posted to the ledger.')).toBeVisible();
});

test('the run wizard refuses a month whose attendance is still open', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/hr');
  await openTab(page, 'Payroll');
  await page.getByRole('button', { name: 'Start a run' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Kind').selectOption('monthly');
  await dialog.getByLabel('Month').selectOption('2026-12');
  await dialog.getByRole('button', { name: 'Calculate' }).click();
  await expect(dialog.getByText('This record has moved on.', { exact: false })).toBeVisible();
  await dialog.getByLabel('Kind').selectOption('festival_bonus');
  await dialog.getByLabel('Month').selectOption('2026-11');
  await dialog.getByRole('button', { name: 'Calculate' }).click();
  await expect(dialog.getByText('Calculating in the background')).toBeVisible();
});

test('finance reads payroll totals but nobody else’s pay', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/hr');
  await openTab(page, 'Payroll');
  await page.getByRole('button', { name: 'PAY-2627-00004' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Hidden for your role').first()).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Lock and post' })).toHaveCount(0);
});

test('a manager sees the team’s leave but not payroll', async ({ page }) => {
  await signIn(page, PM);
  await page.goto('/hr');
  await openTab(page, 'Leave');
  await expect(page.getByRole('cell', { name: 'Tahmid Karim' }).first()).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Payroll' })).toHaveCount(0);
});

test('a requisition is checked against the contract, then saved', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto('/procurement');
  await page.getByRole('button', { name: 'New requisition' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Save draft' }).click();
  await expect(toast(page, 'Requisition saved as a draft.')).toHaveCount(0);
  await dialog.getByLabel(/Purpose/).fill('Headsets for client calls');
  await dialog.getByLabel(/Item/).fill('USB headset');
  await dialog.getByLabel(/Quantity/).fill('2');
  await dialog.getByLabel(/Estimated unit price/).fill('3,500');
  await dialog.getByRole('button', { name: 'Save draft' }).click();
  await expect(toast(page, 'Requisition saved as a draft.')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Vendors' })).toHaveCount(0);
});

test('a partner receives goods against an approved order', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/procurement');
  await openTab(page, 'Purchase orders');
  await page.getByRole('button', { name: 'PO-2627-00062' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Record goods received' }).click();
  await expect(toast(page, 'Goods receipt recorded.')).toBeVisible();
});

test('depreciation refuses a locked month and posts an open one', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/procurement');
  await openTab(page, 'Depreciation');
  await page.getByLabel('Month', { exact: true }).selectOption('2026-09');
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByText('This period is locked.', { exact: false })).toBeVisible();
  await page.getByLabel('Month', { exact: true }).selectOption('2026-11');
  await page.getByRole('button', { name: 'Preview' }).click();
  await page.getByRole('button', { name: 'Post to ledger' }).click();
  await expect(toast(page, 'Depreciation posted.')).toBeVisible();
});

test('the people and procurement screens pass axe and fit a phone', async ({ page }) => {
  await signIn(page, PARTNER);
  for (const [url, tabs] of [
    [
      '/hr',
      ['My HR', 'Employees', 'Attendance', 'Leave', 'Payroll', 'Payslips', 'Loans and settlements'],
    ],
    [
      '/procurement',
      [
        'Requisitions',
        'Purchase orders',
        'Assets',
        'Vendors',
        'Depreciation',
        'Renewals and deposits',
      ],
    ],
  ] as const) {
    await page.goto(url);
    for (const tab of tabs) {
      await openTab(page, tab);
      await page.waitForLoadState('networkidle');
      expect(await axeViolations(page), `${url} ${tab}`).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/hr');
  expect(await hasNoSidewaysScroll(page)).toBe(true);
  await page.goto('/procurement');
  expect(await hasNoSidewaysScroll(page)).toBe(true);
});

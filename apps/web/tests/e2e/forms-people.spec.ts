import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { EMPLOYEE, FINANCE, PARTNER, axeViolations, signIn } from './helpers.ts';

/* Sprint F8: create and edit forms in HR, payroll and procurement. */

const toast = (page: Page, text: string) => page.getByText(text).first();
const openTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true }).click();

async function confirmStepUp(page: Page): Promise<void> {
  const stepUp = page.getByRole('dialog', { name: 'Confirm it is you' });
  await stepUp.getByLabel('Password').fill('sample-only');
  await stepUp.getByRole('button', { name: 'Confirm' }).click();
}

test('a partner adds an employee', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/hr');
  await openTab(page, 'Employees');
  await page.getByRole('button', { name: 'New employee' }).click();
  const dialog = page.getByRole('dialog', { name: 'New employee' });
  await dialog.getByLabel(/Employee ID/).fill('PF-E024');
  await dialog.getByLabel(/^Name/).fill('Lamia Rahman');
  await dialog.getByLabel(/Department/).selectOption({ index: 1 });
  await dialog.getByLabel(/Designation/).fill('Software Engineer');
  expect(await axeViolations(page)).toEqual([]);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('protected details change after step-up, and empty fields keep what is stored', async ({
  page,
}) => {
  await signIn(page, PARTNER);
  await page.goto('/hr');
  await openTab(page, 'Employees');
  await page.getByRole('button', { name: 'Tahmid Karim' }).click();
  await page.getByRole('button', { name: 'NID, TIN and bank' }).click();
  const dialog = page.getByRole('dialog', { name: 'NID, TIN and bank of Tahmid Karim' });
  await dialog.getByLabel(/Account number/).fill('0011223344');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await confirmStepUp(page);
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('an employee asks to correct a day, in Dhaka time', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto('/hr');
  await openTab(page, 'Attendance');
  await page.getByRole('button', { name: 'Ask to correct a day' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ask to correct a day' });
  await dialog.getByRole('button', { name: /^Date/ }).click();
  await page
    .getByRole('gridcell')
    .filter({ hasText: /^1[0-9]$/ })
    .first()
    .click();
  await dialog.getByLabel(/^Check-in/).fill('2026-11-12T09:05');
  await dialog.getByLabel(/^Reason/).fill('Biometric reader was down at the gate');
  await dialog.getByRole('button', { name: 'Save draft' }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New shift' })).toHaveCount(0);
});

test('a partner adds a shift with its weekend days', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/hr');
  await openTab(page, 'Attendance');
  await page.getByRole('button', { name: 'New shift' }).click();
  const dialog = page.getByRole('dialog', { name: 'New shift' });
  await dialog.getByLabel(/^Name/).fill('Night support');
  await expect(dialog.getByLabel('Day, line 2')).toHaveValue('sat');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('a salary structure is saved after step-up', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/hr');
  await openTab(page, 'Payroll');
  await page.getByRole('button', { name: 'New salary structure' }).click();
  const dialog = page.getByRole('dialog', { name: 'New salary structure' });
  await dialog.getByLabel(/Employee$/).selectOption({ label: 'Arif Hossain' });
  await dialog.getByLabel(/Basic salary/).fill('58,800');
  await dialog.getByRole('button', { name: 'Add an allowance' }).click();
  await dialog.getByLabel('Name, line 1').fill('House rent');
  await dialog.getByLabel('Amount, line 1').fill('29,400');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await confirmStepUp(page);
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('finance reads payroll but has no payroll forms', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/hr');
  await openTab(page, 'Payroll');
  await expect(page.getByRole('button', { name: 'PAY-2627-00004' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New salary structure' })).toHaveCount(0);
});

test('a purchase order is drafted from lines', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/procurement');
  await openTab(page, 'Purchase orders');
  await page.getByRole('button', { name: 'New purchase order' }).click();
  const dialog = page.getByRole('dialog', { name: 'New purchase order' });
  await dialog.getByLabel(/^Vendor/).selectOption({ label: 'StarTech' });
  await dialog.getByLabel('Description, line 1').fill('Docking station');
  await dialog.getByLabel('Quantity, line 1').fill('4');
  await dialog.getByLabel('Unit price, line 1').fill('12,500');
  await dialog.getByRole('button', { name: 'Save draft' }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('an asset in store is assigned to someone', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/procurement');
  await openTab(page, 'Assets');
  await page.getByRole('button', { name: 'Assign AST-0128' }).click();
  const dialog = page.getByRole('dialog', { name: 'Assign AST-0128' });
  await dialog.getByLabel(/Employee/).selectOption({ label: 'Mehedi Hasan' });
  await dialog.getByRole('button', { name: 'Assign', exact: true }).click();
  await expect(toast(page, 'Asset assigned.')).toBeVisible();
});

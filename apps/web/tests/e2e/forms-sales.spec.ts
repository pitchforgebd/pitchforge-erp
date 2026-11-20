import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { EMPLOYEE, PARTNER, PM, axeViolations, signIn } from './helpers.ts';

/* Sprint F7: create and edit forms in sales, tenders and projects. */

const toast = (page: Page, text: string) => page.getByText(text).first();
const openTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true }).click();
const LOANS = '0190f2a4-7c3b-7d2e-8f00-000000002001';

test('a new lead warns about a possible duplicate before it is saved', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/crm');
  await openTab(page, 'Leads');
  await page.getByRole('button', { name: 'New lead' }).click();
  const dialog = page.getByRole('dialog', { name: 'New lead' });
  await dialog.getByLabel(/Company or organisation/).fill('Padma Life');
  await expect(dialog.getByText('Possible duplicates')).toBeVisible();
  await expect(dialog.getByText('Padma Life Insurance (lead)')).toBeVisible();
  await dialog.getByLabel(/^Source/).fill('Referral');
  await dialog.getByLabel(/^Owner/).selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('a quotation is drafted with lines; the server works out the totals', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/crm');
  await openTab(page, 'Quotations');
  await page.getByRole('button', { name: 'New quotation' }).click();
  const dialog = page.getByRole('dialog', { name: 'New quotation' });
  await dialog.getByLabel(/^Client/).selectOption({ index: 1 });
  await dialog.getByLabel(/^Title/).fill('Document management system');
  await dialog.getByLabel('Description, line 1').fill('Build and rollout');
  await dialog.getByLabel('Quantity, line 1').fill('1');
  await dialog.getByLabel('Unit price, line 1').fill('18,00,000');
  await dialog.getByRole('button', { name: 'Save draft' }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('a tender deadline is typed in Dhaka time', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/crm');
  await openTab(page, 'Tenders');
  await page.getByRole('button', { name: 'New tender' }).click();
  const dialog = page.getByRole('dialog', { name: 'New tender' });
  await dialog.getByLabel(/^Title/).fill('Hospital appointment system');
  await dialog.getByLabel(/Procuring entity/).fill('District Health Office (sample)');
  await dialog.getByLabel(/Submission deadline/).fill('2026-12-10T11:00');
  await dialog.getByRole('button', { name: 'Add a person' }).click();
  await dialog.getByLabel('Person, line 1').selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('the bid checklist is edited, keeping its rows', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/crm');
  await openTab(page, 'Tenders');
  await page.getByRole('button', { name: 'Billing and customer service system' }).click();
  await page.getByRole('button', { name: 'Edit checklist' }).click();
  const dialog = page.getByRole('dialog', { name: /^Bid documents for/ });
  await expect(dialog.getByLabel('Document, line 1', { exact: true })).not.toHaveValue('');
  expect(await axeViolations(page)).toEqual([]);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('a manager comments on a task', async ({ page }) => {
  await signIn(page, PM);
  await page.goto(`/projects/${LOANS}`);
  await page
    .getByRole('button', { name: /^Comments on/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: /^Comments on/ });
  await dialog.getByLabel('Comment').fill('UAT data is loaded; please start tomorrow.');
  await dialog.getByRole('button', { name: 'Post comment' }).click();
  await expect(toast(page, 'Comment posted.')).toBeVisible();
});

test('a manager cannot edit the team, whose rates they cannot see', async ({ page }) => {
  await signIn(page, PM);
  await page.goto(`/projects/${LOANS}`);
  await openTab(page, 'Team');
  await expect(page.getByText('Hidden for your role').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit team' })).toHaveCount(0);
});

test('a partner edits the team with its billing rates', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto(`/projects/${LOANS}`);
  await openTab(page, 'Team');
  await page.getByRole('button', { name: 'Edit team' }).click();
  const dialog = page.getByRole('dialog', { name: /^Team of/ });
  await expect(dialog.getByLabel('Billing rate per hour, line 1')).not.toHaveValue('');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
});

test('a project code is checked against the contract', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByLabel(/Project code/).fill('pf2606');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByLabel(/Project code/)).toHaveAttribute('aria-invalid', 'true');
  await expect(toast(page, 'Saved.')).toHaveCount(0);
});

test('an employee drafts a timesheet', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto('/projects');
  await openTab(page, 'Timesheets');
  await page.getByRole('button', { name: 'New timesheet' }).click();
  const dialog = page.getByRole('dialog', { name: 'New timesheet' });
  await dialog.getByLabel('Project, line 1').selectOption({ index: 1 });
  await dialog.getByRole('button', { name: /^Date, line 1/ }).click();
  await page
    .getByRole('gridcell')
    .filter({ hasText: /^2[0-9]$/ })
    .first()
    .click();
  await dialog.getByLabel('Hours, line 1').fill('7.5');
  await dialog.getByRole('button', { name: 'Save draft' }).click();
  await expect(toast(page, 'Saved.')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

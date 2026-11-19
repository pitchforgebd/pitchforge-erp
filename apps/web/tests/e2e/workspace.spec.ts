import { expect, test } from '@playwright/test';

import {
  EMPLOYEE,
  FINANCE,
  PARTNER,
  PM,
  axeViolations,
  hasNoSidewaysScroll,
  signIn,
} from './helpers.ts';

/* Sprint F1.2: home, approvals, search, audit log, administration, account. */

test('each role opens its own home dashboard', async ({ page }) => {
  await signIn(page, PARTNER);
  await expect(page.getByRole('heading', { name: 'Company overview' })).toBeVisible();
  await expect(page.getByText('Revenue · year to date')).toBeVisible();
  await expect(page.getByText('৳1,42,40,000')).toBeVisible();
  await expect(page.getByText('CloudNest Hosting Ltd · October cloud hosting')).toBeVisible();
});

test('an employee’s home shows their own figures, not the company’s', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await expect(page.getByRole('heading', { name: 'Good morning, Arif' })).toBeVisible();
  await expect(page.getByText('Open tasks')).toBeVisible();
  await expect(page.getByText('Revenue · year to date')).toHaveCount(0);
});

test('a partner approves a bill: step-up, then the posting is confirmed', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/approvals');
  await page.getByRole('button', { name: /CloudNest Hosting Ltd/ }).click();

  const review = page.getByRole('dialog');
  await expect(review.getByText('Posting preview · created on approval')).toBeVisible();
  await expect(review.getByText('Input VAT')).toBeVisible();
  await review.getByRole('button', { name: 'Approve and post' }).click();

  const stepUp = page.getByRole('dialog', { name: 'Confirm it is you' });
  await stepUp.getByLabel('Password').fill('sample-only');
  await stepUp.getByRole('button', { name: 'Confirm' }).click();

  await expect(page.getByText('Approved and posted as JE-2627-00414.').first()).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('cancelling step-up leaves the request undecided', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/approvals');
  await page.getByRole('button', { name: /statutory audit fee/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve and post' }).click();
  await page
    .getByRole('dialog', { name: 'Confirm it is you' })
    .getByRole('button', { name: 'Cancel' })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Confirm your password');
});

test('the requester cannot approve their own bill', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/approvals');
  await page.getByRole('tab', { name: /Submitted by me/ }).click();
  await page.getByRole('button', { name: /CloudNest Hosting Ltd/ }).click();
  const review = page.getByRole('dialog');
  await expect(review.getByText('You requested this, so you cannot approve it.')).toBeVisible();
  await expect(review.getByRole('button', { name: /Approve/ })).toHaveCount(0);
});

test('a project manager rejects leave with a reason', async ({ page }) => {
  await signIn(page, PM);
  await page.goto('/approvals');
  await page.getByRole('button', { name: /Casual leave/ }).click();
  const review = page.getByRole('dialog');
  await review.getByRole('button', { name: 'Reject' }).click();
  await expect(review.getByRole('button', { name: 'Reject request' })).toBeDisabled();
  await review.getByLabel(/Reason/).fill('The UAT on 12 Nov needs you; take 16–17 Nov instead.');
  await review.getByRole('button', { name: 'Reject request' }).click();
  await expect(page.getByText('Rejected. The requester is told why.').first()).toBeVisible();
});

test('search from the header finds a client', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.getByRole('searchbox', { name: 'Search records' }).first().fill('nodi');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=nodi$/);
  await expect(page.getByRole('link', { name: /Nodi Microfinance/ }).first()).toBeVisible();
});

test('the audit log filters by area', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/audit');
  await expect(page.getByText('JV-2627-00021')).toBeVisible();
  await page.getByLabel('Table').selectOption({ label: 'Payroll' });
  await expect(page.getByText('PAY-2627-00004').first()).toBeVisible();
  await expect(page.getByText('JV-2627-00021')).toHaveCount(0);
});

test('administration lists users, roles and approval rules', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/admin');
  await expect(page.getByText('tanvir@pitchforge.example')).toBeVisible();
  await page.getByRole('tab', { name: 'Roles' }).click();
  await expect(
    page.getByText('Read-only access for the statutory audit, time-boxed.'),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Approval rules' }).click();
  await expect(page.getByText('Partner drawings above ৳1,50,000')).toBeVisible();
  await expect(page.getByText('Every approver')).toBeVisible();
});

test('the account page lists devices and signs one out', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.getByRole('link', { name: /Your account/ }).click();
  await expect(page.getByText('This device')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).last().click();
  await expect(page.getByText('That device is signed out.').first()).toBeVisible();
});

test('an idle session warns five minutes before it ends', async ({ page }) => {
  await page.clock.install();
  await signIn(page, FINANCE);
  await page.clock.fastForward('55:30');
  const warning = page.getByRole('dialog', { name: 'Are you still there?' });
  await expect(warning).toBeVisible();
  await warning.getByRole('button', { name: 'Stay signed in' }).click();
  await expect(warning).toHaveCount(0);
});

for (const path of ['/home', '/approvals', '/search?q=nodi', '/audit', '/admin', '/account']) {
  test(`${path} passes axe and fits 360 px`, async ({ page }) => {
    await signIn(page, PARTNER);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await page.setViewportSize({ width: 360, height: 700 });
    expect(await hasNoSidewaysScroll(page)).toBe(true);
  });
}

import { expect, test } from '@playwright/test';

import { FINANCE, axeViolations, hasNoSidewaysScroll, signIn } from './helpers.ts';

const PUBLIC_PAGES = ['/login', '/two-factor', '/reset-password', '/session-expired'];

for (const path of PUBLIC_PAGES) {
  test(`${path} passes axe`, async ({ page }) => {
    await page.goto(path);
    expect(await axeViolations(page)).toEqual([]);
  });

  test(`${path} fits a 360 px screen`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await page.goto(path);
    expect(await hasNoSidewaysScroll(page)).toBe(true);
  });
}

test('the signed-in shell passes axe, in both themes', async ({ page }) => {
  await signIn(page, FINANCE);
  expect(await axeViolations(page)).toEqual([]);

  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await axeViolations(page)).toEqual([]);
});

test('an open notifications panel passes axe', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.getByRole('dialog').getByText('Bill waiting for approval')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

test('the shell works at 360 px through the menu', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await signIn(page, FINANCE);
  expect(await hasNoSidewaysScroll(page)).toBe(true);

  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Ledger' }).click();
  await expect(page).toHaveURL(/\/ledger$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('sign-in works with the keyboard alone', async ({ page }) => {
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email')).toBeFocused();
  await page.keyboard.type(FINANCE);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password')).toBeFocused();
  await page.keyboard.type('sample-only');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/two-factor$/);

  await page.keyboard.press('Tab');
  await page.keyboard.type('123456');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/home$/);
});

test('the shell can be reached by keyboard', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Home' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/approvals$/);
});

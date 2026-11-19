import { expect, test } from '@playwright/test';

import { EMPLOYEE, FINANCE, PARTNER, signIn } from './helpers.ts';

test('a visitor with no session is sent to login', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/login$/);
});

test('login → 2FA → home', async ({ page }) => {
  await signIn(page, FINANCE);
  await expect(page.getByRole('heading', { name: 'Finance today' })).toBeVisible();
});

test('an unknown account gets a message that reveals nothing', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('nobody@pitchforge.example');
  await page.getByLabel('Password').fill('sample-only');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'do not match' })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('a locked account is told so', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('locked@pitchforge.example');
  await page.getByLabel('Password').fill('sample-only');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'locked' })).toBeVisible();
});

test('the form validates shape before calling the API', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
});

test('a wrong code keeps the user on the 2FA step', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(FINANCE);
  await page.getByLabel('Password').fill('sample-only');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/two-factor$/);
  await page.getByLabel('Authentication code').fill('000000');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'not valid' })).toBeVisible();
});

test('the 2FA page refuses anyone who has not passed the password step', async ({ page }) => {
  await page.goto('/two-factor');
  await page.getByLabel('Authentication code').fill('123456');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'session has ended' })).toBeVisible();
});

test('2FA enrolment shows recovery codes once, then home', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('sadia@pitchforge.example');
  await page.getByLabel('Password').fill('sample-only');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/two-factor\/enrol$/);
  await expect(page.getByText('otpauth://totp/')).toBeVisible();
  await page.getByLabel('Authentication code').fill('123456');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('heading', { name: 'Save your recovery codes' })).toBeVisible();
  await page.getByRole('button', { name: 'I have saved them' }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test('a password reset request answers the same for any address', async ({ page }) => {
  await page.goto('/reset-password');
  await page.getByLabel('Email').fill('nobody@pitchforge.example');
  await page.getByRole('button', { name: 'Send the link' }).click();
  await expect(page.getByText('If that address has an account')).toBeVisible();
});

test('an ended session goes to the session-expired page', async ({ page }) => {
  // Sent as a header: a __Host- cookie cannot be planted on a plain-http test address.
  await page.setExtraHTTPHeaders({ cookie: '__Host-pf_session=ended' });
  await page.goto('/home');
  await expect(page).toHaveURL(/\/session-expired$/);
  await expect(page.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/login');
});

test('sign out ends the session', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/home');
  await expect(page).toHaveURL(/\/login$/);
});

test('navigation follows the session’s permissions', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Finance' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Ledger' })).toHaveCount(0);

  await page.goto('/finance');
  await expect(page.getByRole('heading', { name: 'You do not have access to this' })).toBeVisible();
});

test('a partner sees every section', async ({ page }) => {
  await signIn(page, PARTNER);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link')).toHaveCount(13);
  await nav.getByRole('link', { name: 'Ledger' }).click();
  await expect(page.getByRole('link', { name: 'Ledger' })).toHaveAttribute('aria-current', 'page');
});

test('an unknown address shows not found', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/no-such-section');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('notifications open in a panel and load through the BFF', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.getByRole('button', { name: 'Notifications' }).click();
  const panel = page.getByRole('dialog', { name: 'Notifications' });
  await expect(panel.getByText('Bill waiting for approval')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Notifications' })).toBeFocused();
});

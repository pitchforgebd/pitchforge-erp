import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { FINANCE, PARTNER, axeViolations, signIn } from './helpers.ts';

/* Sprint F9: files, PDFs, imports, administration, notifications and delegation. */

const toast = (page: Page, text: string) => page.getByText(text).first();
const openTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true }).click();

async function confirmStepUp(page: Page): Promise<void> {
  const stepUp = page.getByRole('dialog', { name: 'Confirm it is you' });
  await stepUp.getByLabel('Password').fill('sample-only');
  await stepUp.getByRole('button', { name: 'Confirm' }).click();
}

const PDF = {
  name: 'receipt.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%%EOF'),
};
const TEXT = { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not allowed') };
const CSV = {
  name: 'contacts.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from('name,kind\nSample Vendor Ltd,vendor\n'),
};

test('finance attaches a file to a vendor bill, through signed upload', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await page.getByRole('button', { name: 'Draft bill' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Attach a file').setInputFiles(PDF);
  await dialog.getByRole('button', { name: 'Upload' }).click();
  await expect(toast(page, 'File attached; it is checked for viruses')).toBeVisible();
});

test('a file type outside the contract is refused before anything is sent', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await page.getByRole('button', { name: 'Draft bill' }).first().click();
  const dialog = page.getByRole('dialog');
  let uploads = 0;
  page.on('request', (request) => {
    if (request.url().includes('files:create-upload')) uploads += 1;
  });
  await dialog.getByLabel('Attach a file').setInputFiles(TEXT);
  await dialog.getByRole('button', { name: 'Upload' }).click();
  await expect(dialog.getByText('Only PDF, JPEG, PNG, CSV, Excel and Word files')).toBeVisible();
  expect(uploads).toBe(0);
});

test('a posted invoice downloads as a PDF', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/billing');
  await page.getByRole('button', { name: 'INV-2627-00050' }).click();
  const pdf = page
    .context()
    .waitForEvent('response', (response) => response.url().includes('/bff/mock-storage/download/'));
  await page.getByRole('dialog').getByRole('button', { name: 'Download PDF' }).click();
  const response = await pdf;
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/pdf');
});

test('finance imports a bank statement', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto('/finance');
  await openTab(page, 'Reconciliation');
  await page.getByRole('button', { name: 'Import statement' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import statement' });
  await dialog.getByLabel(/^Bank account/).selectOption({ index: 1 });
  await dialog.getByLabel('Statement file').setInputFiles(CSV);
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(toast(page, 'Statement imported')).toBeVisible();
});

test('a contact import is checked in a dry run before anything changes', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/admin');
  await openTab(page, 'Contacts');
  await page.getByRole('button', { name: 'Import data' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import data' });
  await dialog.getByLabel('What to import').selectOption('contacts');
  await dialog.getByLabel('File').setInputFiles(CSV);
  await dialog.getByRole('button', { name: 'Check the file' }).click();
  await expect(dialog.getByText('42 rows, 2 with problems')).toBeVisible();
  await expect(dialog.getByRole('cell', { name: 'Not a date: "31/02/2026"' })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await dialog.getByRole('button', { name: 'Import 40 rows' }).click();
  await expect(toast(page, 'Import started')).toBeVisible();
});

test('a partner invites a user after step-up', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Invite a user' }).click();
  const dialog = page.getByRole('dialog', { name: 'Invite a user' });
  await dialog.getByLabel(/^Name/).fill('Lamia Rahman');
  await dialog.getByLabel(/^Email/).fill('lamia@pitchforge.example');
  await dialog.getByLabel('Role, line 1').selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'Invite', exact: true }).click();
  await confirmStepUp(page);
  await expect(toast(page, 'Invitation sent.')).toBeVisible();
});

test('the admin forms pass axe', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/admin');
  for (const [tab, button] of [
    ['Roles', 'New role'],
    ['Approval rules', 'New approval rule'],
    ['Contacts', 'New contact'],
  ] as const) {
    await openTab(page, tab);
    await page.getByRole('button', { name: button }).click();
    await expect(page.getByRole('dialog', { name: button })).toBeVisible();
    expect(await axeViolations(page), button).toEqual([]);
    await page.keyboard.press('Escape');
  }
});

test('notifications are marked read, and preferences are saved', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.getByRole('button', { name: 'Notifications' }).click();
  const panel = page.getByRole('dialog');
  await expect(panel.getByRole('button', { name: /^Mark read:/ }).first()).toBeVisible();
  await panel.getByRole('button', { name: 'Mark all read' }).click();
  await page.keyboard.press('Escape');

  await page.goto('/account');
  await page.getByRole('checkbox', { name: 'One daily summary instead of each message' }).click();
  await expect(toast(page, 'Preferences saved.')).toBeVisible();
});

test('an approver delegates a request with a reason', async ({ page }) => {
  await signIn(page, PARTNER);
  await page.goto('/approvals');
  await page.getByRole('button', { name: /CloudNest Hosting Ltd/ }).click();
  await page.getByRole('button', { name: 'Delegate', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Delegate this approval' });
  await dialog.getByLabel(/Hand over to/).selectOption({ index: 1 });
  await dialog.getByLabel(/^Reason/).fill('On leave until Sunday');
  await dialog.getByRole('button', { name: 'Delegate', exact: true }).click();
  await expect(toast(page, 'Delegated.')).toBeVisible();
});

test('a reset link sets a new password, and its token leaves the address bar', async ({ page }) => {
  await page.goto(`/reset-password#token=${'a'.repeat(48)}`);
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await page.getByLabel('New password').fill('a-long-sample-passphrase');
  await page.getByLabel('Type it again').fill('a-long-sample-passphrase');
  await page.getByRole('button', { name: 'Save the new password' }).click();
  await expect(page.getByText('Password changed')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

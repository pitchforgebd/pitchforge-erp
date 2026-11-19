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

/* Sprint F3.1: projects, milestones, the task board and timesheets. */

const LOANS = '0190f2a4-7c3b-7d2e-8f00-000000002001';
const AMC = '0190f2a4-7c3b-7d2e-8f00-000000002003';
const toast = (page: Page, text: string) => page.getByText(text).first();

test('each role sees the projects it works on', async ({ page }) => {
  await signIn(page, PM);
  await page.goto('/projects');
  await expect(page.getByText('Loan Origination Portal')).toBeVisible();
  await expect(page.getByText('Data Platform AMC')).toHaveCount(0);
});

test('a project manager sees the project’s money and its budget alert', async ({ page }) => {
  await signIn(page, PM);
  await page.goto(`/projects/${PROJECT_FIELD_SALES}`);
  await expect(page.getByText('Margin to date')).toBeVisible();
  await expect(page.getByText('-6.4%')).toBeVisible();
  await expect(page.getByText('More than 75% of the budget is used.')).toBeVisible();
});

test('an employee sees the board and team, not the money', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto(`/projects/${LOANS}`);
  await expect(page.getByText('Budgets and profit are hidden for your role.')).toBeVisible();
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Fix rounding in repayment schedule (poisha)' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Team' }).click();
  await expect(page.getByText('Hidden for your role').first()).toBeVisible();
});

test('a project the viewer is not on is not found', async ({ page }) => {
  await signIn(page, PM);
  await page.goto(`/projects/${AMC}`);
  await expect(page.getByRole('heading', { name: 'Project not found' })).toBeVisible();
});

test('a task moves across the board from its card', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto(`/projects/${LOANS}`);
  await page
    .getByLabel('Status of Prepare UAT scripts for loan approval flow')
    .selectOption({ label: 'In progress' });
  await expect(toast(page, 'Moved to In progress.')).toBeVisible();
});

test('a project manager adds a task for someone on the team', async ({ page }) => {
  await signIn(page, PM);
  await page.goto(`/projects/${LOANS}`);
  await page.getByRole('button', { name: 'Add task' }).click();
  const form = page.getByRole('dialog', { name: 'Add task' });
  await form.getByLabel('Task').fill('Write the go-live checklist');
  await form.getByLabel('Assignee').selectOption({ label: 'Arif Hossain' });
  await form.getByRole('button', { name: 'Add task' }).click();
  await expect(toast(page, 'Task added; the assignee is told.')).toBeVisible();
});

test('a deadline moves only with a reason', async ({ page }) => {
  await signIn(page, PM);
  await page.goto(`/projects/${LOANS}`);
  await page.getByRole('tab', { name: 'Milestones' }).click();
  await page.getByRole('button', { name: 'Change the deadline of Go-live and handover' }).click();
  const form = page.getByRole('dialog', { name: 'Change deadline' });
  await expect(form.getByRole('button', { name: 'Move deadline' })).toBeDisabled();
  await form.getByLabel(/Reason/).fill('Client asked for a December freeze');
  await form.getByRole('button', { name: 'Move deadline' }).click();
  await expect(toast(page, 'Deadline moved. Reminders are rescheduled.')).toBeVisible();
});

test('a delivered milestone is signed off by its manager', async ({ page }) => {
  await signIn(page, PM);
  await page.goto(`/projects/${LOANS}`);
  await page.getByRole('tab', { name: 'Milestones' }).click();
  await expect(page.getByText('Delivered, awaiting sign-off')).toBeVisible();
  await page.getByRole('button', { name: 'Record sign-off' }).click();
  await expect(toast(page, 'Sign-off recorded. Finance gets a draft invoice.')).toBeVisible();
});

test('an employee submits their timesheet', async ({ page }) => {
  await signIn(page, EMPLOYEE);
  await page.goto('/projects');
  await page.getByRole('tab', { name: 'My work' }).click();
  await expect(page.getByText('Your timesheet for this week is not submitted yet.')).toBeVisible();
  await page.getByRole('tab', { name: 'Timesheets' }).click();
  await page.getByRole('button', { name: 'Arif Hossain' }).first().click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('30.5')).toBeVisible();
  await sheet.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(toast(page, 'Timesheet sent to your manager.')).toBeVisible();
});

test('finance sees billing rates on the team', async ({ page }) => {
  await signIn(page, FINANCE);
  await page.goto(`/projects/${LOANS}`);
  await page.getByRole('tab', { name: 'Team' }).click();
  await expect(page.getByText('৳2,200')).toBeVisible();
});

for (const path of ['/projects', `/projects/${LOANS}`]) {
  test(`${path} passes axe and fits 360 px`, async ({ page }) => {
    await signIn(page, PARTNER);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await page.setViewportSize({ width: 360, height: 700 });
    expect(await hasNoSidewaysScroll(page)).toBe(true);
  });
}

const PROJECT_FIELD_SALES = '0190f2a4-7c3b-7d2e-8f00-000000002002';

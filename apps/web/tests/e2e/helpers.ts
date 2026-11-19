import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const FINANCE = 'rafiq@pitchforge.example';
export const PARTNER = 'farhana@pitchforge.example';
export const EMPLOYEE = 'arif@pitchforge.example';
export const PM = 'nusrat@pitchforge.example';

/** Sign in through the real screens. Mock mode accepts any password for a sample user. */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('sample-only');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/two-factor$/);
  await page.getByLabel('Authentication code').fill('123456');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL(/\/home$/);
}

/** Collect every Content-Security-Policy violation on the page, including silent ones. */
export async function recordCspViolations(page: Page): Promise<string[]> {
  const violations: string[] = [];
  await page.exposeFunction('reportCspViolation', (violation: string) => {
    violations.push(violation);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      const report = (window as unknown as { reportCspViolation: (v: string) => void })
        .reportCspViolation;
      report(`${event.violatedDirective} ${event.blockedURI} ${event.sourceFile}`);
    });
  });
  return violations;
}

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export async function axeViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

export async function hasNoSidewaysScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

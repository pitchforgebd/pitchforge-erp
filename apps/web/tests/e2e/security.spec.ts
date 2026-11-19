import { expect, test } from '@playwright/test';

import { FINANCE, recordCspViolations, signIn } from './helpers.ts';

test('every page has strict security headers', async ({ request }) => {
  const response = await request.get('/login');
  const headers = response.headers();
  const csp = headers['content-security-policy'] ?? '';

  expect(csp).toMatch(/script-src 'self' 'nonce-[0-9a-f]{32}' 'strict-dynamic'/);
  expect(csp).toMatch(/style-src 'self' 'nonce-[0-9a-f]{32}'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("base-uri 'self'");
  expect(csp).not.toContain('unsafe-inline');
  expect(csp).not.toContain('unsafe-eval');

  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['strict-transport-security']).toContain('max-age=');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('the nonce is different on every response', async ({ request }) => {
  const nonce = async () => {
    const csp = (await request.get('/login')).headers()['content-security-policy'] ?? '';
    return /nonce-([0-9a-f]+)/.exec(csp)?.[1];
  };
  expect(await nonce()).not.toBe(await nonce());
});

test('the whole journey runs with no CSP violation', async ({ page }) => {
  const violations = await recordCspViolations(page);
  await signIn(page, FINANCE);
  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.getByRole('dialog').getByText('Bill waiting for approval')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(violations).toEqual([]);
});

test('a script injected into the HTML does not run, and a nonced one does', async ({ page }) => {
  // Stored XSS: the page arrives with a script the server did not put a nonce on.
  await page.route('**/login', async (route) => {
    const response = await route.fetch();
    const nonce = /nonce-([0-9a-f]+)/.exec(
      response.headers()['content-security-policy'] ?? '',
    )?.[1];
    const body = (await response.text()).replace(
      '</body>',
      `<script>window.injected = true</script><script nonce="${nonce ?? ''}">window.trusted = true</script></body>`,
    );
    await route.fulfill({ response, body });
  });
  await page.goto('/login');
  const seen = await page.evaluate(() => ['injected' in window, 'trusted' in window]);
  expect(seen).toEqual([false, true]);
});

test('nothing sensitive is kept in the browser', async ({ page, context }) => {
  await signIn(page, FINANCE);

  const storage = await page.evaluate(() => [
    // eslint-disable-next-line no-restricted-properties -- proves that browser storage stays empty
    window.localStorage.length,
    // eslint-disable-next-line no-restricted-properties -- proves that browser storage stays empty
    window.sessionStorage.length,
  ]);
  expect(storage).toEqual([0, 0]);
  expect(page.url()).not.toMatch(/token|session|code=/i);

  const session = (await context.cookies()).find((cookie) => cookie.name === '__Host-pf_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.secure).toBe(true);
  expect(session?.sameSite).toBe('Lax');
  expect(await page.evaluate(() => document.cookie)).toBe('');
});

test('the BFF refuses a cross-site write', async ({ request }) => {
  const response = await request.post('/bff/v1/core/auth:login', {
    headers: { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
    data: { email: FINANCE, password: 'x' },
  });
  expect(response.status()).toBe(403);
  expect(((await response.json()) as { code: string }).code).toBe('FORBIDDEN');
});

test('the BFF forwards only known endpoints', async ({ request }) => {
  expect((await request.get('/bff/v1/core/nothing')).status()).toBe(404);
  expect((await request.get('/bff/v1/..%2f..%2fetc%2fpasswd')).status()).toBe(404);
  expect((await request.delete('/bff/v1/core/company')).status()).toBe(403);
});

test('errors from the API reach the browser as problem+json with no internals', async ({
  request,
}) => {
  const response = await request.get('/bff/v1/core/auth/session');
  expect(response.status()).toBe(401);
  expect(response.headers()['content-type']).toContain('application/problem+json');
  expect(await response.text()).not.toMatch(/stack|node_modules|at .*\.ts/);
});

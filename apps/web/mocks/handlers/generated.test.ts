import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ALL_ENDPOINTS } from '@pitchforge/contracts';

import { mockHandlers } from '../server.ts';

import { SESSION_COOKIE } from './core.ts';

const server = setupServer(...mockHandlers([]));
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});

const API = 'http://localhost:4000';
const ID = '0190f2a4-7c3b-7d2e-8f00-000000000001';

/** A concrete URL for a contract path. */
function urlOf(path: string): string {
  return `${API}${path.replace('{id}', ID).replace('{kind}', 'finance').replace('{report}', 'vat_summary')}`;
}

const signedIn = { cookie: `${SESSION_COOKIE}=finance` };

const rows = ALL_ENDPOINTS.filter(
  // These read their request body or a partial session: core handlers cover them in api.test.ts.
  (e) =>
    ![
      'core.login',
      'core.verifyTwoFactor',
      'core.beginTwoFactorEnrolment',
      'core.confirmTwoFactorEnrolment',
    ].includes(e.id),
).map((e) => [e.id, e] as const);

describe('every endpoint has a mock', () => {
  it('covers the whole API', () => {
    expect(mockHandlers([]).length).toBe(ALL_ENDPOINTS.length);
  });

  it.each(rows)('%s answers with data that matches its contract', async (_id, endpoint) => {
    const response = await fetch(urlOf(endpoint.path), {
      method: endpoint.method,
      headers: signedIn,
    });
    // An approval with a made-up id gets a fixed error, which is contract-valid too.
    if (endpoint.id === 'core.approve') {
      expect(response.status).toBe(404);
      return;
    }
    expect(response.status).toBe(endpoint.status);
    if (endpoint.response !== null) {
      expect(endpoint.response.safeParse(await response.json()).success).toBe(true);
    }
  });

  it('refuses a caller with no session, unless the endpoint is public', async () => {
    const response = await fetch(`${API}/api/v1/accounting/vendor-bills`);
    expect(response.status).toBe(401);
  });

  it('leaves out a module that has moved to the real API', () => {
    const accounting = ALL_ENDPOINTS.filter((e) => e.module === 'accounting').length;
    expect(mockHandlers(['accounting']).length).toBe(ALL_ENDPOINTS.length - accounting);
  });
});

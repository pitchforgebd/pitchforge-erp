import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ALL_ENDPOINTS, Problem } from '@pitchforge/contracts';
import { sampleFor } from '@pitchforge/contracts/fixtures';

import { WRITE_ACCESS } from '../data/write-access.ts';
import { mockHandlers } from '../server.ts';
import { STEP_UP_COOKIE } from '../session.ts';

import { SESSION_COOKIE } from './core.ts';
import { generatedHandlers } from './generated.ts';

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
      'core.stepUp',
      'accounting.createManualJournal',
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
    // A record-backed mock answers a made-up id with a problem the contract declares.
    if (!response.ok) {
      const problem = Problem.parse(await response.json());
      expect(endpoint.errors).toContain(problem.code);
      return;
    }
    expect(response.status).toBe(endpoint.status);
    if (endpoint.response !== null) {
      expect(endpoint.response.safeParse(await response.json()).success).toBe(true);
    }
  });

  it('lists every write it answers in WRITE_ACCESS, and nothing else', () => {
    const generated = new Set(generatedHandlers.map((handler) => handler.endpointId));
    const writes = ALL_ENDPOINTS.filter(
      (e) => generated.has(e.id) && e.method !== 'GET' && e.public !== true,
    ).map((e) => e.id);
    expect([...WRITE_ACCESS.keys()].sort()).toEqual(writes.sort());
  });

  const writes = ALL_ENDPOINTS.filter((e) => WRITE_ACCESS.has(e.id)).map((e) => [e.id, e] as const);

  it.each(writes)('%s answers its roles and refuses the rest', async (id, endpoint) => {
    const call = (role: string) =>
      fetch(urlOf(endpoint.path), {
        method: endpoint.method,
        headers: {
          cookie: `${SESSION_COOKIE}=${role}; ${STEP_UP_COOKIE}=1`,
          'content-type': 'application/json',
        },
        ...(endpoint.body !== undefined && { body: JSON.stringify(sampleFor(endpoint.body)) }),
      });
    const allowed = WRITE_ACCESS.get(id) ?? [];
    for (const role of ['partner', 'finance', 'pm', 'employee']) {
      const response = await call(role);
      if (allowed.includes(role as never)) {
        expect(response.status, `${role} may call it`).toBe(endpoint.status);
      } else {
        expect(Problem.parse(await response.json()).code, role).toBe('FORBIDDEN');
      }
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

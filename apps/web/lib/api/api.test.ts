import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { coreEndpoints as core } from '@pitchforge/contracts';

import { problemBody } from '../../mocks/define.ts';
import { PARTIAL_COOKIE, SESSION_COOKIE } from '../../mocks/handlers/core.ts';
import { mockHandlers } from '../../mocks/server.ts';

import { ApiError, callEndpoint } from './client.ts';
import type { Transport } from './client.ts';
import { forwardToApi, isSameOriginWrite } from './forward.ts';
import { fillPath, matchEndpoint, pathPattern } from './routes.ts';

const server = setupServer(...mockHandlers([]));
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});

const API = 'http://localhost:4000';
const direct: Transport = (path, init) => fetch(`${API}${path}`, init);
const withCookie =
  (cookie: string): Transport =>
  (path, init) => {
    const headers = new Headers(init.headers);
    headers.set('cookie', cookie);
    return fetch(`${API}${path}`, { ...init, headers });
  };

function sameOrigin(
  path: string,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {},
): Request {
  return new Request(`http://app.local${path}`, {
    method: 'POST',
    ...init,
    headers: {
      host: 'app.local',
      origin: 'http://app.local',
      'sec-fetch-site': 'same-origin',
      'content-type': 'application/json',
      ...init.headers,
    },
  });
}

describe('routes', () => {
  it('matches contract paths, including commands', () => {
    expect(matchEndpoint('POST', '/api/v1/core/auth:login')?.id).toBe('core.login');
    expect(matchEndpoint('POST', '/api/v1/core/approvals/abc:approve')?.id).toBe('core.approve');
    expect(matchEndpoint('GET', '/api/v1/core/approvals/abc')?.id).toBe('core.getApproval');
  });

  it('matches nothing else', () => {
    expect(matchEndpoint('GET', '/api/v1/core/auth:login')).toBeNull();
    expect(matchEndpoint('GET', '/api/v1/internal/secrets')).toBeNull();
    expect(matchEndpoint('GET', '/api/v1/core/users/a/../b')).toBeNull();
    expect(matchEndpoint('POST', '/api/v1/core/approvals/a:b:approve')).toBeNull();
  });

  it('escapes literal parts of a path', () => {
    expect(pathPattern('/a.b/{id}:c')).toBe(String.raw`\/a\.b\/[^/:]+:c`);
  });

  it('fills and encodes parameters', () => {
    expect(fillPath('/x/{id}:go', { id: 'a/b' })).toBe('/x/a%2Fb:go');
    expect(() => fillPath('/x/{id}', {})).toThrow('Missing path parameter');
  });
});

describe('callEndpoint', () => {
  it('parses a response through its contract', async () => {
    const result = await callEndpoint(
      core.login,
      { body: { email: 'rafiq@pitchforge.example', password: 'x' } },
      direct,
    );
    expect(result).toEqual({ status: 'two_factor_required' });
  });

  it('throws an ApiError with the stable code', async () => {
    const failure = callEndpoint(
      core.login,
      { body: { email: 'nobody@pitchforge.example', password: 'x' } },
      direct,
    );
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });

  it('sends a new Idempotency-Key per call where the contract requires one', async () => {
    const transport = vi.fn<Transport>(() =>
      Promise.resolve(Response.json({ accepted: true }, { status: 202 })),
    );
    const options = { body: { email: 'a@pitchforge.example' } };
    await callEndpoint(core.requestPasswordReset, options, transport);
    await callEndpoint(core.requestPasswordReset, options, transport);
    const keys = transport.mock.calls.map(([, init]) =>
      new Headers(init.headers).get('idempotency-key'),
    );
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('sends If-Match and query values, and handles 204', async () => {
    const transport = vi.fn<Transport>(() => Promise.resolve(new Response(null, { status: 204 })));
    await callEndpoint(
      core.deleteHoliday,
      { params: { id: '0190f2a4-7c3b-7d2e-8f00-000000000001' }, ifMatch: '"3"' },
      transport,
    );
    const [path, init] = transport.mock.calls[0] ?? [];
    expect(path).toBe('/api/v1/core/holidays/0190f2a4-7c3b-7d2e-8f00-000000000001');
    expect(new Headers(init?.headers).get('if-match')).toBe('"3"');
  });

  it('refuses a response that breaks the contract', async () => {
    const transport: Transport = () => Promise.resolve(Response.json({ status: 'surprise' }));
    await expect(
      callEndpoint(
        core.login,
        { body: { email: 'a@pitchforge.example', password: 'x' } },
        transport,
      ),
    ).rejects.toThrow();
  });
});

describe('mock handlers', () => {
  const session = withCookie(`${SESSION_COOKIE}=finance`);

  it('serve the session of a sample user, and refuse anyone else', async () => {
    const user = await callEndpoint(core.getSession, {}, session);
    expect(user.name).toBe('Rafiq Islam');
    await expect(
      callEndpoint(core.getSession, {}, withCookie(`${SESSION_COOKIE}=ended`)),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('need the password step before 2FA', async () => {
    await expect(
      callEndpoint(core.verifyTwoFactor, { body: { code: '123456' } }, direct),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    const user = await callEndpoint(
      core.verifyTwoFactor,
      { body: { code: '123456' } },
      withCookie(`${PARTIAL_COOKIE}=pm`),
    );
    expect(user.name).toBe('Nusrat Jahan');
  });

  it.each([
    ['0190f2a4-7c3b-7d2e-8f00-000000000201', 'SOD_VIOLATION'],
    ['0190f2a4-7c3b-7d2e-8f00-000000000202', 'PERIOD_LOCKED'],
    ['0190f2a4-7c3b-7d2e-8f00-000000000203', 'STALE_VERSION'],
    ['0190f2a4-7c3b-7d2e-8f00-000000000204', 'FORBIDDEN'],
    ['0190f2a4-7c3b-7d2e-8f00-000000000999', 'NOT_FOUND'],
  ])('return the fixed error for approval %s: %s', async (id, code) => {
    await expect(
      callEndpoint(
        core.approve,
        { params: { id }, body: { comment: null }, ifMatch: '"1"' },
        session,
      ),
    ).rejects.toMatchObject({ code });
  });

  it('leave out modules that use the real API', () => {
    expect(mockHandlers(['core']).length).toBeLessThan(mockHandlers([]).length);
  });

  it('build a valid problem body', () => {
    expect(problemBody('PERIOD_LOCKED')).toMatchObject({ code: 'PERIOD_LOCKED', status: 409 });
  });
});

describe('isSameOriginWrite', () => {
  it('lets reads through', () => {
    expect(isSameOriginWrite(new Request('http://app.local/x'))).toBe(true);
  });

  it('accepts a same-origin write', () => {
    expect(isSameOriginWrite(sameOrigin('/x'))).toBe(true);
  });

  it.each([
    ['cross-site', { 'sec-fetch-site': 'cross-site' }],
    ['another origin', { origin: 'http://evil.example' }],
    ['a malformed origin', { origin: 'not a url' }],
  ])('refuses %s', (_label, headers) => {
    expect(isSameOriginWrite(sameOrigin('/x', { headers }))).toBe(false);
  });

  it('refuses a write with no browser headers', () => {
    expect(isSameOriginWrite(new Request('http://app.local/x', { method: 'POST' }))).toBe(false);
  });
});

describe('forwardToApi', () => {
  const login = JSON.stringify({ email: 'rafiq@pitchforge.example', password: 'x' });

  it('forwards a known endpoint and passes Set-Cookie back', async () => {
    const response = await forwardToApi(sameOrigin('/bff/v1/core/auth:login', { body: login }), [
      'core',
      'auth:login',
    ]);
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().join()).toContain(`${PARTIAL_COOKIE}=finance`);
  });

  it('refuses an unknown endpoint without calling the API', async () => {
    const response = await forwardToApi(new Request('http://app.local/x'), ['core', 'nothing']);
    expect(response.status).toBe(404);
  });

  it('refuses a cross-site write before anything else', async () => {
    const request = new Request('http://app.local/x', { method: 'POST', body: login });
    expect((await forwardToApi(request, ['core', 'auth:login'])).status).toBe(403);
  });

  it('forwards the API’s errors unchanged', async () => {
    const response = await forwardToApi(new Request('http://app.local/x'), [
      'core',
      'auth',
      'session',
    ]);
    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
  });

  it('keeps an empty 204', async () => {
    const response = await forwardToApi(sameOrigin('/bff/v1/core/auth:logout'), [
      'core',
      'auth:logout',
    ]);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});

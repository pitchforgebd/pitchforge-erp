import { coreEndpoints as core } from '@pitchforge/contracts';

import {
  ENROLMENT_EMAIL,
  LOCKED_EMAIL,
  SAMPLE_NOTIFICATIONS,
  SAMPLE_RECOVERY_CODES,
  SAMPLE_USERS,
  WRONG_TWO_FACTOR_CODE,
} from '../data/sample-company.ts';
import type { SampleRole, SampleUser } from '../data/sample-company.ts';
import { mock } from '../define.ts';
import type { MockHandler, MockReply, MockRequest } from '../define.ts';
import { PARTIAL_COOKIE, SESSION_COOKIE } from '../session.ts';

export { PARTIAL_COOKIE, SESSION_COOKIE };

const COOKIE_ATTRIBUTES = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const setCookie = (name: string, value: string) => `${name}=${value}; ${COOKIE_ATTRIBUTES}`;
const clearCookie = (name: string) => `${name}=; Max-Age=0; ${COOKIE_ATTRIBUTES}`;

const SAMPLE_ROLES = new Map(Object.entries(SAMPLE_USERS)) as ReadonlyMap<string, SampleUser>;

function sessionOf(user: SampleUser) {
  return {
    ...user,
    twoFactorEnabled: true,
    idleExpiresAt: '2026-11-04T09:30:00Z',
    absoluteExpiresAt: '2026-11-04T20:30:00Z',
  };
}

const roleOfEmail = (email: string): SampleRole | undefined =>
  (Object.entries(SAMPLE_USERS) as [SampleRole, SampleUser][]).find(
    ([, user]) => user.email === email,
  )?.[0];

const userOf = (role: string | undefined) => SAMPLE_ROLES.get(role ?? '');

/** The sample user of this session, from its fixed cookie value. */
function signedIn(request: MockRequest): SampleUser | undefined {
  return userOf(request.cookie(SESSION_COOKIE));
}

function requireSession(request: MockRequest, reply: (user: SampleUser) => MockReply): MockReply {
  const user = signedIn(request);
  return user === undefined ? { problem: 'UNAUTHENTICATED' } : reply(user);
}

function signInComplete(role: string): readonly string[] {
  return [setCookie(SESSION_COOKIE, role), clearCookie(PARTIAL_COOKIE)];
}

async function login(request: MockRequest): Promise<MockReply> {
  const { email } = (await request.request.json()) as { email: string };
  if (email === LOCKED_EMAIL) return { problem: 'ACCOUNT_LOCKED' };
  if (email === ENROLMENT_EMAIL) {
    return {
      json: { status: 'two_factor_enrolment_required' },
      cookies: [setCookie(PARTIAL_COOKIE, 'employee')],
    };
  }
  const role = roleOfEmail(email);
  if (role === undefined) return { problem: 'INVALID_CREDENTIALS' };
  return { json: { status: 'two_factor_required' }, cookies: [setCookie(PARTIAL_COOKIE, role)] };
}

async function verifyTwoFactor(request: MockRequest): Promise<MockReply> {
  const role = request.cookie(PARTIAL_COOKIE);
  const user = userOf(role);
  if (role === undefined || user === undefined) return { problem: 'UNAUTHENTICATED' };
  const { code } = (await request.request.json()) as { code?: string };
  if (code === WRONG_TWO_FACTOR_CODE) return { problem: 'INVALID_TWO_FACTOR_CODE' };
  return { json: sessionOf(user), cookies: signInComplete(role) };
}

export const coreHandlers: readonly MockHandler[] = [
  mock(core.login, login),
  mock(core.verifyTwoFactor, verifyTwoFactor),
  mock(core.beginTwoFactorEnrolment, (request) =>
    userOf(request.cookie(PARTIAL_COOKIE)) === undefined
      ? { problem: 'UNAUTHENTICATED' }
      : { json: { otpauthUri: 'otpauth://totp/Pitchforge:sample?secret=SAMPLEONLY' } },
  ),
  mock(core.confirmTwoFactorEnrolment, async (request) => {
    const role = request.cookie(PARTIAL_COOKIE);
    const user = userOf(role);
    if (role === undefined || user === undefined) return { problem: 'UNAUTHENTICATED' };
    const { code } = (await request.request.json()) as { code: string };
    if (code === WRONG_TWO_FACTOR_CODE) return { problem: 'INVALID_TWO_FACTOR_CODE' };
    return {
      json: { session: sessionOf(user), recoveryCodes: SAMPLE_RECOVERY_CODES },
      cookies: signInComplete(role),
    };
  }),
  mock(core.getSession, (request) =>
    requireSession(request, (user) => ({ json: sessionOf(user) })),
  ),
  mock(core.logout, () => ({ empty: true, cookies: [clearCookie(SESSION_COOKIE)] })),
  mock(core.requestPasswordReset, () => ({ json: { accepted: true } })),
  mock(core.listNotifications, (request) =>
    requireSession(request, () => ({
      json: { items: SAMPLE_NOTIFICATIONS, nextCursor: null },
    })),
  ),
  mock(core.markNotificationRead, (request) => requireSession(request, () => ({ empty: true }))),
];

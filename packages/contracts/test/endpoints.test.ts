import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ERROR_CODES } from '@pitchforge/shared-kernel';

import { walkFields } from '../scripts/schema-walk.ts';
import {
  ALL_ENDPOINTS,
  IdParams,
  accountingEndpoints,
  coreEndpoints,
  defineEndpoints,
  featureMap,
  listQuery,
  pathParams,
} from '../src/index.ts';

const rows = ALL_ENDPOINTS.map((e) => [e.id, e] as const);

describe('API conventions, on every endpoint', () => {
  it('has a unique id and a unique method + path', () => {
    const ids = ALL_ENDPOINTS.map((e) => e.id);
    const routes = ALL_ENDPOINTS.map((e) => `${e.method} ${e.path}`);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(routes).size).toBe(routes.length);
  });

  const KEBAB = /^[a-z][a-z-]*$/;
  const PARAM = /^\{[a-zA-Z]+\}$/;

  // /api/v1/{module}/{resource}[/{param}][/{sub-resource}][:{command}]
  it.each(rows)('%s has a conventional path', (_id, e) => {
    const [route = '', command, extra] = e.path.split(':');
    const [resource = '', ...rest] = route.split('/').slice(4);
    expect(route.startsWith(`/api/v1/${e.module}/`)).toBe(true);
    expect(resource).toMatch(KEBAB);
    expect(rest.length).toBeLessThanOrEqual(2); // one level of nesting
    for (const part of rest) expect(KEBAB.test(part) || PARAM.test(part), part).toBe(true);
    if (command !== undefined) expect(command).toMatch(KEBAB);
    expect(extra).toBeUndefined();
  });

  // Resources are plural; these are the singletons and sub-resources that are not.
  const SINGULAR = new Set([
    'auth',
    'company',
    'search',
    'activity',
    'audit-log',
    'audit-chain',
    'notification-preferences',
    'payables-ageing',
    'receivables-ageing',
    'vat-return',
    'forecast',
    'my-work',
    'attendance-records',
    'leave-calendar',
    'trial-balance',
    'profit-and-loss',
    'balance-sheet',
    'cash-flow',
    'general-ledger',
  ]);

  it.each(rows)('%s names a plural resource', (_id, e) => {
    const resource = (e.path.split('/')[4] ?? '').split(':')[0] ?? '';
    expect(resource.endsWith('s') || SINGULAR.has(resource), resource).toBe(true);
  });

  it.each(rows)('%s states features and errors', (_id, e) => {
    expect(e.featureIds.length).toBeGreaterThan(0);
    expect(e.errors.length).toBeGreaterThan(0);
    for (const code of e.errors) expect(ERROR_CODES).toContain(code);
  });

  it.each(rows)('%s denies by default', (_id, e) => {
    if (e.public === true) return;
    expect(e.errors).toContain('UNAUTHENTICATED');
    expect(e.errors).toContain('FORBIDDEN');
  });

  it.each(rows)('%s requires Idempotency-Key if it moves money or sends messages', (_id, e) => {
    const idempotent = e.movesMoney === true || e.sendsMessages === true;
    expect(e.headers?.shape['idempotency-key'] !== undefined).toBe(idempotent);
    if (idempotent) {
      expect(e.method).toBe('POST');
      expect(e.errors).toContain('IDEMPOTENCY_CONFLICT');
    }
  });

  it.each(rows)('%s uses a state-changing POST for commands', (_id, e) => {
    if (e.path.includes(':')) expect(e.method).toBe('POST');
  });

  it.each(rows)('%s, if a list, uses cursor pagination', (_id, e) => {
    expect(e.query?.shape['cursor'] !== undefined).toBe(e.list === true);
  });
});

describe('which endpoints are public', () => {
  it('is exactly the sign-in and password-reset flow', () => {
    const open = ALL_ENDPOINTS.filter((e) => e.public === true)
      .map((e) => e.id)
      .sort();
    expect(open).toEqual([
      'core.beginTwoFactorEnrolment',
      'core.confirmTwoFactorEnrolment',
      'core.login',
      'core.requestPasswordReset',
      'core.resetPassword',
      'core.verifyTwoFactor',
    ]);
  });
});

describe('money paths', () => {
  it('every command that posts to the ledger is idempotent', () => {
    const posting = ALL_ENDPOINTS.filter(
      (e) =>
        e.method === 'POST' &&
        e.errors.includes('PERIOD_LOCKED') &&
        e.errors.includes('NOT_BALANCED'),
    );
    expect(posting.length).toBeGreaterThan(10);
    const notIdempotent = posting
      .filter((e) => e.movesMoney !== true)
      .map((e) => e.id)
      .sort();
    // Submitting a manual journal is checked, not posted; posting happens on approval.
    expect(notIdempotent).toEqual(['accounting.submitManualJournal']);
  });

  it('a posted journal entry has no update or delete, only a reversal', () => {
    const journal = ALL_ENDPOINTS.filter((e) => e.path.includes('/journal-entries'));
    expect(journal.map((e) => e.method).sort()).toEqual(['GET', 'GET', 'POST']);
    expect(accountingEndpoints.reverseJournalEntry.path).toContain(':reverse');
  });

  it('core approvals are the only way to decide a document', () => {
    const decisions = ALL_ENDPOINTS.filter((e) => /:(approve|reject|return)$/.test(e.path))
      .map((e) => e.id)
      .sort();
    expect(decisions).toEqual(['core.approve', 'core.reject', 'core.returnForChanges']);
  });

  it('segregation of duties is declared on every approval decision', () => {
    const approvals = ALL_ENDPOINTS.filter((e) =>
      /:(approve|reject|return|delegate)$/.test(e.path),
    );
    expect(approvals).toHaveLength(4);
    for (const e of approvals) expect(e.errors, e.id).toContain('SOD_VIOLATION');
  });

  it('approving is idempotent and can ask for step-up', () => {
    expect(coreEndpoints.approve.movesMoney).toBe(true);
    expect(coreEndpoints.approve.errors).toContain('STEP_UP_REQUIRED');
  });
});

describe('no floats in money positions', () => {
  // Every number in the API. A new key fails here until someone confirms it is not an amount.
  const NUMBER_KEYS = new Set([
    'version',
    'number',
    'lastIssued',
    'fiscalYearStartMonth',
    'slaHours',
    'daysBefore',
    'sizeBytes',
    'progressPercent',
    'rowsTotal',
    'rowsWithErrors',
    'rowsVerified',
    'row',
    'unmatchedLines',
    'paymentTermsDays',
    'activeProjects',
    'activeContracts',
    'revision',
    'rank',
    'amendment',
    'headcount',
    'assets',
    'count',
    'lateAfterMinutes',
    'earlyLeaveMinutes',
    'limit',
    'status', // HTTP status in Problem
  ]);

  it.each(rows)('%s uses numbers only for counts', (id, e) => {
    const schemas = [e.body, e.query, e.params, e.response].filter(
      (s): s is z.ZodType => s !== undefined && s !== null,
    );
    for (const schema of schemas) {
      walkFields(schema, ({ key, path, schema: field }) => {
        if (field instanceof z.ZodNumber) {
          expect(NUMBER_KEYS.has(key ?? ''), `${id}: ${path}`).toBe(true);
        }
      });
    }
  });
});

describe('no secrets in responses', () => {
  it.each(rows)('%s returns no password, token or secret', (id, e) => {
    if (e.response === null) return;
    walkFields(e.response, ({ key, path }) => {
      expect(/password|token|secret|hash/i.test(key ?? ''), `${id}: ${path}`).toBe(false);
    });
  });
});

describe('defineEndpoints', () => {
  const base = {
    method: 'GET',
    path: '/api/v1/core/things',
    summary: 'x',
    featureIds: ['CORE-01'],
    response: z.object({}),
  } as const;
  const strictBody = z.strictObject({ a: z.string() });

  it('adds the id, default status and conventional errors', () => {
    const { get } = defineEndpoints('core', { get: base });
    expect(get.id).toBe('core.get');
    expect(get.module).toBe('core');
    expect(get.status).toBe(200);
    expect(get.errors).toEqual(['FORBIDDEN', 'UNAUTHENTICATED']);
    expect(get.headers).toBeUndefined();
  });

  it('a record write needs If-Match unless it opts out', () => {
    const { update, ping } = defineEndpoints('core', {
      update: {
        ...base,
        method: 'PATCH',
        path: '/api/v1/core/things/{id}',
        params: IdParams,
        body: strictBody,
      },
      ping: {
        ...base,
        method: 'POST',
        path: '/api/v1/core/things/{id}:ping',
        params: IdParams,
        versioned: false,
      },
    });
    expect(update.headers?.shape['if-match']).toBeDefined();
    expect(update.errors).toEqual(
      expect.arrayContaining(['NOT_FOUND', 'STALE_VERSION', 'VALIDATION']),
    );
    expect(ping.headers).toBeUndefined();
    expect(ping.errors).not.toContain('STALE_VERSION');
  });

  it('step-up adds its error', () => {
    const { x } = defineEndpoints('core', { x: { ...base, stepUp: true } });
    expect(x.errors).toContain('STEP_UP_REQUIRED');
  });

  it.each([
    ['wrong module prefix', { ...base, path: '/api/v1/hr/things' }, 'must start with'],
    ['undeclared parameter', { ...base, path: '/api/v1/core/things/{id}' }, 'do not match'],
    ['parameter not in path', { ...base, params: IdParams }, 'do not match'],
    ['GET with a body', { ...base, body: strictBody }, 'GET cannot have a body'],
    [
      'loose body',
      { ...base, method: 'POST', body: z.object({ a: z.string() }) },
      'z.strictObject',
    ],
    ['query on a write', { ...base, method: 'POST', query: listQuery({}) }, 'only GET'],
    ['loose query', { ...base, query: z.object({}) }, 'query must be strict'],
    ['list without a cursor', { ...base, list: true }, 'cursor pagination'],
    ['empty response without 204', { ...base, response: null }, 'status 204'],
    ['money on PATCH', { ...base, method: 'PATCH', movesMoney: true }, 'must be POST'],
    ['messages on GET', { ...base, sendsMessages: true }, 'must be POST'],
  ] as const)('rejects %s', (_label, input, message) => {
    expect(() => defineEndpoints('core', { bad: input })).toThrow(message);
  });
});

describe('helpers', () => {
  it('pathParams reads placeholders', () => {
    expect(pathParams('/api/v1/core/users/{id}:deactivate')).toEqual(['id']);
    expect(pathParams('/api/v1/core/users')).toEqual([]);
  });

  it('featureMap lists endpoints per feature', () => {
    expect(featureMap().get('CORE-14')).toEqual(expect.arrayContaining([coreEndpoints.approve.id]));
  });
});

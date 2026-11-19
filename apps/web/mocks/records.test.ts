import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  ApprovalOutcome,
  ApprovalRequest,
  Problem,
  SalarySheetRow,
  TeamMember,
  Vendor,
  coreEndpoints as core,
  page,
} from '@pitchforge/contracts';
import { VALID_EXAMPLES } from '@pitchforge/contracts/fixtures';

import { PEOPLE, rid } from './data/core-records.ts';
import { SAMPLE_USERS } from './data/sample-company.ts';
import type { SampleRole } from './data/sample-company.ts';
import { withoutRestricted } from './serve.ts';
import type { Viewer } from './serve.ts';
import { mockHandlers } from './server.ts';
import { SESSION_COOKIE } from './session.ts';

const USERS = new Map(Object.entries(SAMPLE_USERS));
const EXAMPLES = new Map(Object.entries(VALID_EXAMPLES));
const viewer = (role: SampleRole): Viewer => ({
  ...USERS.get(role)!,
  role,
});
const example = (name: string) => EXAMPLES.get(name) as Record<string, unknown>;

describe('withoutRestricted', () => {
  it('leaves out labour cost for a project manager, and keeps it for finance', () => {
    const member = example('TeamMember');
    expect(withoutRestricted(TeamMember, member, viewer('pm'))).not.toHaveProperty('billingRate');
    expect(withoutRestricted(TeamMember, member, viewer('finance'))).toHaveProperty('billingRate');
  });

  it('shows an employee their own salary only', () => {
    const own = { ...example('SalarySheetRow'), employee: PEOPLE.arif };
    const colleague = { ...example('SalarySheetRow'), employee: PEOPLE.mehedi };
    expect(withoutRestricted(SalarySheetRow, own, viewer('employee'))).toHaveProperty('netPay');
    expect(withoutRestricted(SalarySheetRow, colleague, viewer('employee'))).not.toHaveProperty(
      'netPay',
    );
    expect(withoutRestricted(SalarySheetRow, colleague, viewer('pm'))).not.toHaveProperty(
      'grossPay',
    );
  });

  it('gives finance a vendor’s bank account, and nobody else outside the matrix', () => {
    const vendor = example('Vendor');
    expect(withoutRestricted(Vendor, vendor, viewer('finance'))).toHaveProperty('bankAccount');
    expect(withoutRestricted(Vendor, vendor, viewer('pm'))).not.toHaveProperty('bankAccount');
  });

  it('works inside lists and leaves other fields alone', () => {
    const rows = [example('TeamMember'), example('TeamMember')];
    const result = withoutRestricted(
      page(TeamMember),
      { items: rows, nextCursor: null },
      viewer('pm'),
    ) as {
      items: Record<string, unknown>[];
    };
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toHaveProperty('role');
    expect(result.items[0]).not.toHaveProperty('billingRate');
  });
});

const server = setupServer(...mockHandlers([]));
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});

const API = 'http://localhost:4000';
const BILL = rid(1101);
const asRole = (role: SampleRole, extra = '') => ({ cookie: `${SESSION_COOKIE}=${role}${extra}` });

async function list(role: SampleRole, query = '') {
  const response = await fetch(`${API}${core.listApprovals.path}${query}`, {
    headers: asRole(role),
  });
  return page(ApprovalRequest).parse(await response.json()).items;
}

describe('approval records', () => {
  it('lets a partner act on a bill that finance submitted', async () => {
    const bill = (await list('partner')).find((item) => item.id === BILL);
    expect(bill?.allowedActions).toContain('approve');
    expect(bill?.posting?.lines.length).toBeGreaterThan(0);
  });

  it('gives the requester no actions on their own bill', async () => {
    const bill = (await list('finance')).find((item) => item.id === BILL);
    expect(bill?.allowedActions).toEqual([]);
  });

  it('filters to what is waiting for the viewer', async () => {
    const mine = await list('pm', '?assignedToMe=true');
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((item) => item.allowedActions.includes('approve'))).toBe(true);
  });

  it('hides other people’s approvals from an employee', async () => {
    const seen = await list('employee');
    expect(seen.every((item) => item.requestedBy.id === PEOPLE.arif.id)).toBe(true);
  });

  async function approve(role: SampleRole, id: string, extraCookie = '') {
    return fetch(`${API}/api/v1/core/approvals/${id}:approve`, {
      method: 'POST',
      headers: { ...asRole(role, extraCookie), 'content-type': 'application/json' },
      body: JSON.stringify({ comment: null }),
    });
  }

  it('refuses the requester with SOD_VIOLATION', async () => {
    const response = await approve('finance', BILL);
    expect(Problem.parse(await response.json()).code).toBe('SOD_VIOLATION');
  });

  it('asks for step-up first, then approves with the posted journal number', async () => {
    const first = await approve('partner', BILL);
    expect(Problem.parse(await first.json()).code).toBe('STEP_UP_REQUIRED');

    const stepUp = await fetch(`${API}${core.stepUp.path}`, {
      method: 'POST',
      headers: { ...asRole('partner'), 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'sample-only' }),
    });
    expect(stepUp.headers.get('set-cookie')).toContain('__Host-pf_stepup=1');

    const second = await approve('partner', BILL, '; __Host-pf_stepup=1');
    const outcome = ApprovalOutcome.parse(await second.json());
    expect(outcome.approval.status).toBe('approved');
    expect(outcome.journalEntryNo).toBe('JE-2627-00414');
  });

  it('answers an id that does not exist with NOT_FOUND', async () => {
    const response = await fetch(`${API}/api/v1/core/approvals/${rid(9999)}`, {
      headers: asRole('partner'),
    });
    expect(response.status).toBe(404);
  });
});

describe('list filters', () => {
  it('keep only rows whose field equals the query value', async () => {
    const response = await fetch(`${API}${core.listUsers.path}?status=invited`, {
      headers: asRole('partner'),
    });
    const body = (await response.json()) as { items: { name: string; status: string }[] };
    expect(body.items.map((user) => user.name)).toEqual(['Sadia Akter']);
  });
});

describe('search', () => {
  it('matches title and subtitle, case-insensitively', async () => {
    const response = await fetch(`${API}${core.search.path}?q=nodi`, {
      headers: asRole('finance'),
    });
    const body = (await response.json()) as { items: { title: string }[] };
    expect(body.items.map((item) => item.title)).toContain('Nodi Microfinance');
    expect(body.items.length).toBeLessThan(5);
  });
});

describe('every mock reply', () => {
  it('loses the restricted fields of its viewer, even when a handler forgets', async () => {
    const { mock } = await import('./define.ts');
    const { projectsEndpoints } = await import('@pitchforge/contracts');
    // A careless handler that sends a billing rate to anyone.
    const careless = mock(projectsEndpoints.getProjectTeam, () => ({
      json: { items: [example('TeamMember')] },
    }));
    const local = setupServer(careless.handler);
    server.close();
    local.listen({ onUnhandledFrame: 'error' });
    try {
      const url = `${API}/api/v1/projects/projects/${rid(2001)}/team`;
      const pm = (await (await fetch(url, { headers: asRole('pm') })).json()) as {
        items: Record<string, unknown>[];
      };
      const finance = (await (await fetch(url, { headers: asRole('finance') })).json()) as {
        items: Record<string, unknown>[];
      };
      expect(pm.items[0]).not.toHaveProperty('billingRate');
      expect(finance.items[0]).toHaveProperty('billingRate');
    } finally {
      local.close();
      server.listen({ onUnhandledFrame: 'error' });
    }
  });
});

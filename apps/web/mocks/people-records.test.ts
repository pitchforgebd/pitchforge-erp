import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Problem } from '@pitchforge/contracts';

import { PEOPLE } from './data/core-records.ts';
import { DRAFT_LEAVE_ID, RUMANA_ID, STAFF } from './data/hr-records.ts';
import { NOVEMBER_RUN_ID, OCTOBER_RUN_ID } from './data/payroll-records.ts';
import { APPROVED_ORDER_ID, RECEIVED_ORDER_ID } from './data/procurement-records.ts';
import type { SampleRole } from './data/sample-company.ts';
import { mockHandlers } from './server.ts';
import { SESSION_COOKIE, STEP_UP_COOKIE } from './session.ts';

/* Sprint F4: who sees which HR, payroll and procurement records, and the fixed outcomes. */

const server = setupServer(...mockHandlers([]));
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});

const API = 'http://localhost:4000/api/v1';
const headers = (role: SampleRole, stepUp = false) => ({
  cookie: `${SESSION_COOKIE}=${role}${stepUp ? `; ${STEP_UP_COOKIE}=1` : ''}`,
  'content-type': 'application/json',
});
const get = (role: SampleRole, url: string) => fetch(`${API}${url}`, { headers: headers(role) });
const post = (role: SampleRole, url: string, body: unknown = {}, stepUp = false) =>
  fetch(`${API}${url}`, {
    method: 'POST',
    headers: headers(role, stepUp),
    body: JSON.stringify(body),
  });
const codeOf = async (response: Response) => Problem.parse(await response.json()).code;
type Row = Record<string, unknown> & { employee?: { id: string }; id?: string };
const itemsOf = async (response: Response) => ((await response.json()) as { items: Row[] }).items;

describe('employees', () => {
  it('an employee sees only themself; a manager sees their team', async () => {
    const own = await itemsOf(await get('employee', '/hr/employees'));
    expect(own.map((row) => row.id)).toEqual([PEOPLE.arif.id]);
    const team = await itemsOf(await get('pm', '/hr/employees'));
    expect(team.map((row) => row['name'])).toContain('Tahmid Karim');
    expect(team.map((row) => row['name'])).not.toContain('Rafiq Islam');
  });

  it('NID and bank details reach only the person themself', async () => {
    const [own] = await itemsOf(await get('employee', '/hr/employees'));
    expect(own).toHaveProperty('nid');
    expect(own).toHaveProperty('bankAccount');
    for (const role of ['partner', 'finance', 'pm'] as const) {
      const rows = await itemsOf(await get(role, '/hr/employees'));
      const arif = rows.find((row) => row.id === PEOPLE.arif.id);
      expect(arif, role).not.toHaveProperty('bankAccount');
      expect(arif, role).not.toHaveProperty('nid');
    }
  });

  it('protected details change only after step-up', async () => {
    const url = `/hr/employees/${STAFF.tahmid.id}/protected-details`;
    const put = (stepUp: boolean) =>
      fetch(`${API}${url}`, {
        method: 'PUT',
        headers: { ...headers('partner', stepUp), 'if-match': '"1"' },
        body: JSON.stringify({ bankAccountNumber: '0011223344' }),
      });
    expect(await codeOf(await put(false))).toBe('STEP_UP_REQUIRED');
    expect((await put(true)).status).toBe(200);
  });

  it('only HR sees a leaver’s clearance checklist', async () => {
    expect((await get('partner', `/hr/employees/${RUMANA_ID}/offboarding`)).status).toBe(200);
    expect(await codeOf(await get('employee', `/hr/employees/${RUMANA_ID}/offboarding`))).toBe(
      'NOT_FOUND',
    );
  });
});

describe('leave and attendance', () => {
  it('a person submits only their own leave', async () => {
    const submitted = await post('employee', `/hr/leave-requests/${DRAFT_LEAVE_ID}:submit`);
    expect(await submitted.json()).toMatchObject({ status: 'pending_approval' });
    expect(await codeOf(await post('pm', `/hr/leave-requests/${DRAFT_LEAVE_ID}:submit`))).toBe(
      'FORBIDDEN',
    );
  });

  it('the team calendar shows who is away, never why', async () => {
    const items = await itemsOf(
      await get('employee', '/hr/leave-calendar?from=2026-11-01&to=2026-12-31'),
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((row) => !('reason' in row) && !('leaveTypeName' in row))).toBe(true);
  });

  it('closing a month needs HR and step-up', async () => {
    expect(
      await codeOf(await post('pm', '/hr/attendance-records:close-month', { month: '2026-11' })),
    ).toBe('FORBIDDEN');
    expect(
      await codeOf(
        await post('partner', '/hr/attendance-records:close-month', { month: '2026-11' }),
      ),
    ).toBe('STEP_UP_REQUIRED');
    const closed = await post(
      'partner',
      '/hr/attendance-records:close-month',
      { month: '2026-11' },
      true,
    );
    expect(closed.status).toBe(204);
  });
});

describe('payroll', () => {
  it('salaries reach partners and the person themself, never finance or managers', async () => {
    const partner = await itemsOf(await get('partner', '/payroll/payslips'));
    expect(partner.some((row) => 'netPay' in row)).toBe(true);
    const finance = await itemsOf(await get('finance', '/payroll/payslips'));
    expect(finance.length).toBeGreaterThan(0);
    // Finance's sample user sees their own payslip, and nobody else's pay.
    const others = finance.filter((row) => row.employee?.id !== PEOPLE.rafiq.id);
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((row) => !('netPay' in row) && !('lines' in row))).toBe(true);
    const own = await itemsOf(await get('employee', '/payroll/payslips'));
    expect(own.every((row) => row.employee?.id === PEOPLE.arif.id && 'netPay' in row)).toBe(true);
    expect(await itemsOf(await get('pm', '/payroll/payroll-runs'))).toEqual([]);
  });

  it('the salary sheet is closed to anyone outside payroll', async () => {
    expect(
      await codeOf(await get('employee', `/payroll/payroll-runs/${OCTOBER_RUN_ID}/salary-sheet`)),
    ).toBe('NOT_FOUND');
    const rows = await itemsOf(
      await get('finance', `/payroll/payroll-runs/${OCTOBER_RUN_ID}/salary-sheet`),
    );
    const others = rows.filter((row) => row.employee?.id !== PEOPLE.rafiq.id);
    expect(others.every((row) => !('netPay' in row))).toBe(true);
  });

  it('locking a run needs step-up and posts a journal', async () => {
    const lock = (stepUp: boolean) =>
      fetch(`${API}/payroll/payroll-runs/${NOVEMBER_RUN_ID}:lock`, {
        method: 'POST',
        headers: {
          ...headers('partner', stepUp),
          'if-match': '"1"',
          'idempotency-key': crypto.randomUUID(),
        },
      });
    expect(await codeOf(await lock(false))).toBe('STEP_UP_REQUIRED');
    expect(await (await lock(true)).json()).toMatchObject({ status: 'locked' });
  });

  it('a run cannot start before its month’s attendance is closed', async () => {
    expect(
      await codeOf(
        await post('partner', '/payroll/payroll-runs', { kind: 'monthly', month: '2026-12' }),
      ),
    ).toBe('INVALID_STATE');
  });
});

describe('procurement and assets', () => {
  it('an employee sees only their own requisitions and assets', async () => {
    const requisitions = await itemsOf(await get('employee', '/procurement/requisitions'));
    expect(
      requisitions.every((row) => (row['requestedBy'] as { id: string }).id === PEOPLE.arif.id),
    ).toBe(true);
    const assets = await itemsOf(await get('employee', '/procurement/assets'));
    expect(assets.map((row) => row['tag'])).toEqual(['AST-0142']);
    expect(await itemsOf(await get('employee', '/procurement/vendors'))).toEqual([]);
  });

  it('vendor bank details reach finance but not managers', async () => {
    const finance = await itemsOf(await get('finance', '/procurement/vendors'));
    expect(finance.some((row) => 'bankAccount' in row)).toBe(true);
    expect(await itemsOf(await get('pm', '/procurement/vendors'))).toEqual([]);
  });

  it('goods are received only against an approved order', async () => {
    const receive = (purchaseOrderId: string) =>
      post('partner', '/procurement/goods-receipts', {
        purchaseOrderId,
        receivedOn: '2026-11-20',
        lines: [{ description: 'UPS replacement battery', quantity: '6' }],
      });
    expect((await receive(APPROVED_ORDER_ID)).status).toBe(201);
    expect(await codeOf(await receive(RECEIVED_ORDER_ID))).toBe('INVALID_STATE');
  });

  it('depreciation cannot be run into a locked month', async () => {
    expect(
      await codeOf(await post('partner', '/procurement/depreciation-runs', { month: '2026-09' })),
    ).toBe('PERIOD_LOCKED');
  });
});

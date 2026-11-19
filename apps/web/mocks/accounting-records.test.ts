import { readFileSync } from 'node:fs';
import path from 'node:path';

import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { accountingEndpoints as accounting, Problem } from '@pitchforge/contracts';

import {
  BANK,
  DRAFT_BILL_ID,
  LOCKED_PERIOD_DRAFT_ID,
  OWN_RUN_ID,
  REVERSED_ENTRY_ID,
  UNBALANCED_DRAFT_ID,
  periodId,
} from './data/accounting-records.ts';
import { CHART } from './data/chart.ts';
import { rid } from './data/core-records.ts';
import type { SampleRole } from './data/sample-company.ts';
import { mockHandlers } from './server.ts';
import { SESSION_COOKIE } from './session.ts';

const server = setupServer(...mockHandlers([]));
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});

const API = 'http://localhost:4000/api/v1/accounting';
const headers = (role: SampleRole, stepUp = false) => ({
  cookie: `${SESSION_COOKIE}=${role}${stepUp ? '; __Host-pf_stepup=1' : ''}`,
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
const itemsOf = async (response: Response) =>
  ((await response.json()) as { items: Record<string, unknown>[] }).items;

describe('the mock chart of accounts', () => {
  it('matches the template CSV', () => {
    const csv = readFileSync(
      path.join(import.meta.dirname, '../../../db/seeds/chart-of-accounts/bd-service-company.csv'),
      'utf8',
    );
    const rows = csv
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => {
        const [code, name, type, normalBalance, parent, , control] = line.split(',');
        return [code, name, type, normalBalance, parent === '' ? null : parent, control === 'true'];
      });
    expect(CHART).toEqual(rows);
  });
});

describe('who sees finance', () => {
  it('gives finance and partners the bills, and nobody else', async () => {
    expect((await itemsOf(await get('finance', '/vendor-bills'))).length).toBeGreaterThan(5);
    expect(await itemsOf(await get('pm', '/vendor-bills'))).toEqual([]);
    expect(await itemsOf(await get('employee', '/journal-entries'))).toEqual([]);
  });

  it('shows bank account numbers to finance only', async () => {
    const finance = await itemsOf(await get('finance', '/bank-accounts'));
    const partner = await itemsOf(await get('partner', '/bank-accounts'));
    expect(finance[0]).toHaveProperty('accountNumber');
    expect(partner[0]).not.toHaveProperty('accountNumber');
  });

  it('shows an employee only their own expense claims', async () => {
    const own = await itemsOf(await get('employee', '/expense-claims'));
    expect(own.map((claim) => (claim['employee'] as { name: string }).name)).toEqual([
      'Arif Hossain',
      'Arif Hossain',
    ]);
  });

  it('refuses a command from a role outside finance', async () => {
    expect(await codeOf(await post('pm', `/vendor-bills/${DRAFT_BILL_ID}:submit`))).toBe(
      'FORBIDDEN',
    );
  });
});

describe('fixed error states', () => {
  it('a manual journal that does not balance', async () => {
    expect(
      await codeOf(await post('finance', `/manual-journals/${UNBALANCED_DRAFT_ID}:submit`)),
    ).toBe('NOT_BALANCED');
  });

  it('a manual journal dated in a locked period', async () => {
    expect(
      await codeOf(await post('finance', `/manual-journals/${LOCKED_PERIOD_DRAFT_ID}:submit`)),
    ).toBe('PERIOD_LOCKED');
  });

  it('reversing an entry twice', async () => {
    const body = { reversalDate: '2026-11-04', reason: 'Charged to the wrong project' };
    expect(
      await codeOf(await post('finance', `/journal-entries/${REVERSED_ENTRY_ID}:reverse`, body)),
    ).toBe('ALREADY_REVERSED');
  });

  it('reopening a period needs step-up, then works for a partner only', async () => {
    const url = `/fiscal-periods/${periodId(3)}:reopen`;
    const body = { reason: 'Late supplier credit note' };
    expect(await codeOf(await post('partner', url, body))).toBe('STEP_UP_REQUIRED');
    expect((await post('partner', url, body, true)).status).toBe(200);
    expect(await codeOf(await post('finance', url, body, true))).toBe('INVALID_STATE');
  });

  it('submitting a payment run sends it for approval; its preparer gets no approve action', async () => {
    const response = await post('finance', `/payment-runs/${OWN_RUN_ID}:submit`);
    const run = (await response.json()) as { status: string; allowedActions: string[] };
    expect(run.status).toBe('pending_approval');
    expect(run.allowedActions).not.toContain('approve');
  });
});

describe('fixed outcomes', () => {
  it('a reversal is the pre-written entry, with the original marked reversed', async () => {
    const body = { reversalDate: '2026-11-04', reason: 'Posted twice by mistake' };
    const result = (await (
      await post('finance', `/journal-entries/${rid(3410)}:reverse`, body)
    ).json()) as {
      original: { status: string };
      reversal: { entryNo: string; reversalOfId: string };
    };
    expect(result.original.status).toBe('reversed');
    expect(result.reversal.entryNo).toBe('JE-2627-00414');
    expect(result.reversal.reversalOfId).toBe(rid(3410));
  });

  it('a new manual journal is the request echoed back as a draft', async () => {
    const body = {
      entryDate: '2026-11-04',
      description: 'Office supplies',
      lines: [],
      fileIds: [],
    };
    const created = (await (await post('finance', '/manual-journals', body)).json()) as {
      status: string;
      description: string;
    };
    expect(created).toMatchObject({ status: 'draft', description: 'Office supplies' });
  });

  it('statement lines exist for City Bank only', async () => {
    expect(
      (await itemsOf(await get('finance', `/bank-accounts/${BANK.city}/statement-lines`))).length,
    ).toBe(6);
    expect(
      await itemsOf(await get('finance', `/bank-accounts/${BANK.brac}/statement-lines`)),
    ).toEqual([]);
  });
});

describe('contract shapes', () => {
  it('every list the finance screens read parses', async () => {
    for (const endpoint of [
      accounting.listAccounts,
      accounting.listFiscalPeriods,
      accounting.listJournalEntries,
      accounting.listManualJournals,
      accounting.listVendorBills,
      accounting.listPaymentRuns,
      accounting.listPayees,
      accounting.listExpenseClaims,
      accounting.listEmployeeAdvances,
      accounting.listBankAccounts,
      accounting.listTransfers,
      accounting.listCheques,
    ]) {
      const response = await fetch(`http://localhost:4000${endpoint.path}`, {
        headers: headers('finance'),
      });
      expect(endpoint.response.safeParse(await response.json()).success, endpoint.id).toBe(true);
    }
  });
});

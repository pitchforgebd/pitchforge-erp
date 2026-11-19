import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Problem } from '@pitchforge/contracts';

import {
  DISTRIBUTION_PREVIEW,
  DRAFT_INVOICE_ID,
  PARTNER_IDS,
  TOO_LARGE_DRAWING_ID,
} from './data/billing-records.ts';
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

const API = 'http://localhost:4000/api/v1';
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

describe('who sees billing and partners', () => {
  it('finance and partners see invoices; a project manager sees none', async () => {
    expect((await itemsOf(await get('finance', '/billing/invoices'))).length).toBeGreaterThan(5);
    expect(await itemsOf(await get('pm', '/billing/invoices'))).toEqual([]);
  });

  it('partner balances reach partners and finance, never an employee', async () => {
    const finance = await itemsOf(await get('finance', '/partners/partners'));
    expect(finance[0]).toHaveProperty('capitalBalance');
    expect(await itemsOf(await get('employee', '/partners/partners'))).toEqual([]);
  });
});

describe('fixed outcomes', () => {
  it('posting a draft invoice gives it a number and a journal entry', async () => {
    const response = await post('finance', `/billing/invoices/${DRAFT_INVOICE_ID}:post`);
    expect(await response.json()).toMatchObject({ number: 'INV-2627-00051', status: 'posted' });
  });

  it('a VAT return needs a month, and a quiet month answers with zeros', async () => {
    expect(await codeOf(await get('finance', '/accounting/vat-return'))).toBe('VALIDATION');
    const quiet = (await (await get('finance', '/accounting/vat-return?month=2026-12')).json()) as {
      payable: { amount: string };
    };
    expect(quiet.payable.amount).toBe('0.00');
  });
});

describe('partner drawings', () => {
  const submit = (role: SampleRole, id: string, stepUp = false) =>
    post(role, `/partners/partner-transactions/${id}:submit`, {}, stepUp);

  it('only the partner who drafted a drawing may submit it', async () => {
    expect(await codeOf(await submit('finance', rid(5702), true))).toBe('INVALID_STATE');
  });

  it('asks for step-up first', async () => {
    expect(await codeOf(await submit('partner', rid(5702)))).toBe('STEP_UP_REQUIRED');
  });

  it('refuses a drawing larger than the withdrawable balance', async () => {
    expect(await codeOf(await submit('partner', TOO_LARGE_DRAWING_ID, true))).toBe(
      'INSUFFICIENT_WITHDRAWABLE_BALANCE',
    );
  });

  it('sends an allowed drawing for approval', async () => {
    const response = await submit('partner', rid(5702), true);
    expect(await response.json()).toMatchObject({ status: 'pending_approval' });
  });

  it('shows a partner’s withdrawable balance with any warning', async () => {
    const response = await get(
      'partner',
      `/partners/partners/${PARTNER_IDS.sabbir}/withdrawable-balance`,
    );
    expect(await response.json()).toMatchObject({
      warning: expect.stringContaining('owed') as unknown,
    });
  });
});

describe('profit distribution', () => {
  const body = { periodFrom: '2026-10-01', periodTo: '2026-10-31', reservePercent: '10' };

  it('is previewed by a partner only', async () => {
    expect(await codeOf(await post('finance', '/partners/distribution-runs', body))).toBe(
      'FORBIDDEN',
    );
    const preview = await post('partner', '/partners/distribution-runs', body);
    expect(await preview.json()).toMatchObject({ status: 'preview' });
  });

  it('posts only after step-up', async () => {
    const url = `/partners/distribution-runs/${DISTRIBUTION_PREVIEW.id}:post`;
    expect(await codeOf(await post('partner', url))).toBe('STEP_UP_REQUIRED');
    expect(await (await post('partner', url, {}, true)).json()).toMatchObject({ status: 'posted' });
  });
});

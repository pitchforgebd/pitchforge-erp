import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Problem } from '@pitchforge/contracts';

import { rid } from './data/core-records.ts';
import { DRAFT_QUOTATION_ID, STAGES, TENDER_IDS } from './data/crm-records.ts';
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

const API = 'http://localhost:4000/api/v1/crm';
const headers = (role: SampleRole) => ({
  cookie: `${SESSION_COOKIE}=${role}`,
  'content-type': 'application/json',
});
const get = (role: SampleRole, url: string) => fetch(`${API}${url}`, { headers: headers(role) });
const post = (role: SampleRole, url: string, body: unknown = {}) =>
  fetch(`${API}${url}`, { method: 'POST', headers: headers(role), body: JSON.stringify(body) });
const codeOf = async (response: Response) => Problem.parse(await response.json()).code;
const itemsOf = async (response: Response) =>
  ((await response.json()) as { items: { allowedActions?: string[] }[] }).items;

const WAREHOUSE = rid(7425);

describe('who sees sales', () => {
  it('an employee sees no leads, deals or tenders', async () => {
    expect(await itemsOf(await get('employee', '/leads'))).toEqual([]);
    expect(await itemsOf(await get('employee', '/opportunities'))).toEqual([]);
    expect(await codeOf(await get('employee', '/forecast'))).toBe('FORBIDDEN');
  });

  it('a project manager reads deals but may not act on them', async () => {
    const deals = await itemsOf(await get('pm', '/opportunities'));
    expect(deals.length).toBeGreaterThan(0);
    expect(deals.every((deal) => deal.allowedActions?.length === 0)).toBe(true);
    expect(
      await codeOf(
        await post('pm', `/opportunities/${WAREHOUSE}:win`, { projectStartDate: '2026-12-01' }),
      ),
    ).toBe('FORBIDDEN');
  });
});

describe('pipeline', () => {
  it('moving a deal takes the stage’s probability', async () => {
    const proposal = STAGES[1];
    const moved = await post('partner', `/opportunities/${WAREHOUSE}:move`, {
      stageId: proposal?.id,
    });
    expect(await moved.json()).toMatchObject({ probabilityPercent: '45' });
  });

  it('a lost deal keeps its reason', async () => {
    const lost = await post('partner', `/opportunities/${WAREHOUSE}:lose`, {
      reason: 'Chose an Indian vendor',
      competitor: 'Bharat Systems',
    });
    expect(await lost.json()).toMatchObject({
      status: 'lost',
      lostReason: 'Chose an Indian vendor',
    });
  });
});

describe('quotations and tenders', () => {
  it('a submitted quotation is numbered', async () => {
    const submitted = await post('partner', `/quotations/${DRAFT_QUOTATION_ID}:submit`);
    expect(await submitted.json()).toMatchObject({ number: 'QUO-2627-00033' });
  });

  it('a tender outcome is recorded with its rank', async () => {
    const result = await post('partner', `/tenders/${TENDER_IDS.city}:record-outcome`, {
      result: 'lost',
      rank: 2,
      ourPrice: { amount: '5640000.00', currency: 'BDT' },
      winningPrice: { amount: '5200000.00', currency: 'BDT' },
    });
    expect(await result.json()).toMatchObject({ status: 'lost', rank: 2 });
  });

  it('the bid checklist belongs to its tender', async () => {
    expect(
      await itemsOf(await get('partner', `/tenders/${TENDER_IDS.water}/checklist`)),
    ).toHaveLength(10);
    expect(await itemsOf(await get('partner', `/tenders/${TENDER_IDS.power}/checklist`))).toEqual(
      [],
    );
  });
});

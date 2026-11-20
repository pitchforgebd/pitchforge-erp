import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FinancialStatement, Problem, ReportTable, TrialBalance } from '@pitchforge/contracts';

import type { SampleRole } from './data/sample-company.ts';
import { mockHandlers } from './server.ts';
import { SESSION_COOKIE } from './session.ts';

/* Sprint F5: the statements agree with each other, and only the books' readers get them. */

const server = setupServer(...mockHandlers([]));
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});

const API = 'http://localhost:4000/api/v1/reporting';
const get = (role: SampleRole, url: string) =>
  fetch(`${API}${url}`, { headers: { cookie: `${SESSION_COOKIE}=${role}` } });

/** Poisha as a bigint, so the checks never touch floating point. */
const poisha = (value: { amount: string }) => {
  const [whole = '0', fraction = '00'] = value.amount.replace('-', '').split('.');
  const size = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return value.amount.startsWith('-') ? -size : size;
};
const sum = (values: readonly { amount: string }[]) =>
  values.reduce((total, value) => total + poisha(value), 0n);

describe('the sample books agree', () => {
  it('the trial balance balances', async () => {
    const tb = TrialBalance.parse(await (await get('finance', '/trial-balance')).json());
    expect(sum(tb.rows.map((row) => row.debit))).toBe(poisha(tb.totalDebit));
    expect(sum(tb.rows.map((row) => row.credit))).toBe(poisha(tb.totalCredit));
    expect(poisha(tb.totalDebit)).toBe(poisha(tb.totalCredit));
  });

  it('profit and loss adds up, and its profit is in the balance sheet, which balances', async () => {
    const pl = FinancialStatement.parse(
      await (await get('partner', '/profit-and-loss?from=2026-07-01&to=2026-10-31')).json(),
    );
    for (const section of pl.sections) {
      expect(sum(section.rows.map((row) => row.amount)), section.title).toBe(poisha(section.total));
    }
    const [revenue, direct, operating, other] = pl.sections.map((section) => poisha(section.total));
    expect((revenue ?? 0n) - (direct ?? 0n) - (operating ?? 0n) + (other ?? 0n)).toBe(
      poisha(pl.result),
    );

    const bs = FinancialStatement.parse(await (await get('partner', '/balance-sheet')).json());
    for (const section of bs.sections) {
      expect(sum(section.rows.map((row) => row.amount)), section.title).toBe(poisha(section.total));
    }
    const [assets, liabilities, equity] = bs.sections.map((section) => poisha(section.total));
    expect(assets).toBe((liabilities ?? 0n) + (equity ?? 0n));
    const profit = bs.sections
      .flatMap((section) => section.rows)
      .find((row) => row.label === 'Profit for the period');
    expect(profit && poisha(profit.amount)).toBe(poisha(pl.result));
  });

  it('the cash flow ends at the balance sheet’s cash', async () => {
    const cf = FinancialStatement.parse(
      await (await get('finance', '/cash-flow?from=2026-07-01&to=2026-10-31')).json(),
    );
    const [operating, investing, financing, cash] = cf.sections;
    const change = sum(
      [operating, investing, financing].map((section) => section?.total ?? { amount: '0.00' }),
    );
    expect(change).toBe(poisha(cf.result));
    const [opening, closing] = cash?.rows ?? [];
    expect(opening && closing && poisha(closing.amount) - poisha(opening.amount)).toBe(change);
  });
});

describe('who reads the books', () => {
  it('managers and employees are refused', async () => {
    for (const role of ['pm', 'employee'] as const) {
      const response = await get(role, '/trial-balance');
      expect(Problem.parse(await response.json()).code, role).toBe('FORBIDDEN');
    }
  });

  it('a salary column reaches partners only, and leaves every row', async () => {
    const partner = ReportTable.parse(
      await (await get('partner', '/reports/payroll_summary')).json(),
    );
    expect(partner.columns.map((column) => column.key)).toContain('average');
    const finance = ReportTable.parse(
      await (await get('finance', '/reports/payroll_summary')).json(),
    );
    expect(finance.columns.map((column) => column.key)).not.toContain('average');
    expect(finance.rows.every((row) => !('average' in row))).toBe(true);
  });
});

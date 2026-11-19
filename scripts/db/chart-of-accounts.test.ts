import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { AccountCode, AccountType } from '../../packages/contracts/src/index.ts';

import { chartProblems, parseChart } from './chart-of-accounts.ts';
import type { CsvAccount } from './chart-of-accounts.ts';

const file = path.join(
  import.meta.dirname,
  '../../db/seeds/chart-of-accounts/bd-service-company.csv',
);
const chart = parseChart(readFileSync(file, 'utf8'));

function changed(code: string, change: Partial<CsvAccount>): CsvAccount[] {
  return chart.map((account) => (account.code === code ? { ...account, ...change } : account));
}

describe('the chart of accounts template', () => {
  it('is valid', () => {
    expect(chartProblems(chart)).toEqual([]);
  });

  it('fits the Account contract', () => {
    for (const account of chart) {
      expect(AccountCode.safeParse(account.code).success, account.code).toBe(true);
      expect(AccountType.safeParse(account.type).success, account.code).toBe(true);
      expect(account.name.length, account.code).toBeGreaterThanOrEqual(2);
      expect(account.name.length, account.code).toBeLessThanOrEqual(120);
    }
  });

  it('holds no real names: partners are placeholders', () => {
    const partnerAccounts = chart.filter((a) => /^3[12]\d0$/.test(a.code) && a.code.at(-2) !== '0');
    expect(partnerAccounts.map((a) => a.name.split(' · ')[1])).toEqual([
      'Partner A',
      'Partner B',
      'Partner C',
      'Partner A',
      'Partner B',
      'Partner C',
    ]);
  });
});

describe('chartProblems', () => {
  it.each<[string, CsvAccount[], string]>([
    ['a duplicate code', [...chart, ...chart.slice(0, 1)], '1000: duplicate code'],
    ['a parent that does not exist', changed('1110', { parentCode: '9999' }), 'does not exist'],
    ['a parent of another type', changed('1110', { parentCode: '2000' }), 'another type'],
    ['a code outside its type', changed('1110', { type: 'expense' }), 'does not fit expense'],
    ['a short code', changed('6720', { code: '672' }), 'has 4 digits'],
    ['an unknown type', changed('1110', { type: 'wealth' }), 'unknown type'],
    ['a wrong normal balance', changed('1110', { normalBalance: 'credit' }), 'normal balance'],
    ['an unflagged contra', changed('1690', { isContra: false }), 'normal balance'],
    ['a contra flag with a normal balance', changed('1110', { isContra: true }), 'normal balance'],
    ['a control heading', changed('1200', { isControl: true }), 'a heading cannot'],
    ['a plain AR account', changed('1210', { isControl: false }), '1210 must be a control'],
    ['a missing tax mapping', changed('1460', { taxMapping: null }), 'input_vat needs exactly one'],
    ['a tax account anyone can post to', changed('1460', { isControl: false }), 'input_vat must'],
    ['two tops for one type', changed('1100', { parentCode: null }), 'more than one top'],
    ['a missing type', chart.filter((a) => a.type !== 'income'), 'no income accounts'],
  ])('finds %s', (_name, accounts, problem) => {
    expect(chartProblems(accounts).join('\n')).toContain(problem);
  });
});

describe('parseChart', () => {
  const header = 'code,name,type,normal_balance,parent_code,is_contra,is_control,tax_mapping';

  it('refuses another header', () => {
    expect(() => parseChart('code,name\n1000,Assets')).toThrow('Unexpected header');
  });

  it('refuses a name with a comma, which would shift the columns', () => {
    expect(() => parseChart(`${header}\n1000,Cash, bank,asset,debit,,false,false,`)).toThrow(
      'Row 2 needs 8 columns',
    );
  });

  it('reads Windows line endings and empty columns as null', () => {
    expect(parseChart(`${header}\r\n1000,Assets,asset,debit,,false,true,\r\n`)).toEqual([
      {
        code: '1000',
        name: 'Assets',
        type: 'asset',
        normalBalance: 'debit',
        parentCode: null,
        isContra: false,
        isControl: true,
        taxMapping: null,
      },
    ]);
  });
});

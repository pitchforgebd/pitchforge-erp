import { describe, expect, it } from 'vitest';

import rule, { isMoneyName, splitWords } from '../eslint/rules/no-float-money.mjs';

import { FIXTURE_FILE, typedRuleTester } from './rule-tester.ts';

describe('isMoneyName', () => {
  it.each([
    ['amount', true],
    ['netAmount', true],
    ['total_vat', true],
    ['partnerBalance', true],
    ['salaryPoisha', true],
    ['totalPages', false],
    ['taxRate', false],
    ['lineCount', false],
    ['network', false],
    ['userName', false],
  ])('%s → %s', (name, expected) => {
    expect(isMoneyName(name)).toBe(expected);
  });

  it('splits camelCase, PascalCase, snake_case and acronyms', () => {
    expect(splitWords('VATAmount_total')).toEqual(['vat', 'amount', 'total']);
  });
});

const filename = FIXTURE_FILE;
const err = (messageId: string) => ({ messageId });

typedRuleTester().run('pitchforge/no-float-money', rule, {
  valid: [
    // Branded / object money types are fine.
    {
      filename,
      code: 'type Money = { poisha: bigint; currency: string }; declare const amount: Money;',
    },
    { filename, code: 'const amount = 125000n;' },
    { filename, code: "const amount = '125000.00';" },
    { filename, code: 'const totalPages = 3; const next = totalPages + 1;' },
    { filename, code: 'const taxRate = 0.15;' },
    {
      filename,
      code: 'function paginate(limit: number, lineCount: number) { return limit * lineCount; }',
    },
    { filename, code: 'declare const userInput: string; const n = Number(userInput);' },
    { filename, code: 'interface Page { totalCount: number; pageSize: number }' },
  ],
  invalid: [
    {
      filename,
      code: 'declare const amount: string; const x = parseFloat(amount);',
      errors: [err('floatConversion')],
    },
    {
      filename,
      code: 'declare const form: { netAmount: string }; const x = Number(form.netAmount);',
      errors: [err('floatConversion')],
    },
    {
      filename,
      code: 'declare const vat: string; const x = Number.parseFloat(vat);',
      errors: [err('floatConversion')],
    },
    {
      filename,
      code: 'declare const total: string; const x = +total;',
      errors: [err('floatConversion')],
    },
    {
      filename,
      code: 'declare const price: bigint; const label = price.toString(); declare const cost: { toFixed(n: number): string }; const s = cost.toFixed(2);',
      errors: [err('floatConversion')],
    },
    {
      filename,
      code: 'const balance = 1250.5;',
      errors: [err('numberType')],
    },
    {
      filename,
      code: 'function addVat(net: number) { return net; }',
      errors: [err('numberType')],
    },
    {
      filename,
      code: 'interface Bill { amount: number }',
      errors: [err('numberType')],
    },
    {
      filename,
      code: 'class Payslip { salary = 0; }',
      errors: [err('numberType')],
    },
    {
      filename,
      code: 'const line = { debit: 100, credit: 0 };',
      errors: [err('numberType'), err('numberType')],
    },
    {
      filename,
      code: 'declare const bill: { amount: number }; const doubled = bill.amount * 2;',
      errors: [err('numberType'), err('numberArithmetic')],
    },
  ],
});

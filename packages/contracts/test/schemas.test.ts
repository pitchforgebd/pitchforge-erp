import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { money } from '@pitchforge/shared-kernel';

import { INVALID_EXAMPLES, VALID_EXAMPLES } from '../fixtures/examples.ts';
import { walkFields } from '../scripts/schema-walk.ts';
import * as contracts from '../src/index.ts';
import { Money, fromMoney, restricted, toMoney } from '../src/index.ts';

const allExports: [string, unknown][] = Object.entries(contracts);
const exported = allExports.filter(
  (entry): entry is [string, z.ZodType] => entry[1] instanceof z.ZodType,
);
const enums = exported.filter(
  (entry): entry is [string, z.ZodEnum] => entry[1] instanceof z.ZodEnum,
);
const others = exported.filter(([, schema]) => !(schema instanceof z.ZodEnum));
const objects = others.filter(
  (entry): entry is [string, z.ZodObject] => entry[1] instanceof z.ZodObject,
);

const example = (name: string): unknown => new Map(Object.entries(VALID_EXAMPLES)).get(name);
const invalidFor = (name: string) => new Map(Object.entries(INVALID_EXAMPLES)).get(name) ?? [];

function requiredKeys(schema: z.ZodObject): string[] {
  return Object.entries(schema.shape)
    .filter(([, field]) => !(field as z.ZodType).safeParse(undefined).success)
    .map(([key]) => key);
}

const isStrict = (schema: z.ZodObject) => schema.def.catchall instanceof z.ZodNever;

describe('every exported schema', () => {
  it('has a valid example, and no example is left over', () => {
    const names = others.map(([name]) => name);
    expect(names.filter((name) => !Object.hasOwn(VALID_EXAMPLES, name))).toEqual([]);
    expect(Object.keys(VALID_EXAMPLES).filter((name) => !names.includes(name))).toEqual([]);
  });

  it.each(others)('%s accepts its valid example', (name, schema) => {
    const result = schema.safeParse(example(name));
    expect(result.error?.issues).toBeUndefined();
  });

  it.each(others)('%s rejects something', (name, schema) => {
    const derived = schema instanceof z.ZodObject && requiredKeys(schema).length > 0;
    const strict = schema instanceof z.ZodObject && isStrict(schema);
    expect(derived || strict || invalidFor(name).length > 0).toBe(true);
  });

  it.each(enums)('%s rejects an unknown value', (_name, schema) => {
    expect(schema.safeParse('__not_a_value__').success).toBe(false);
    for (const option of schema.options) expect(schema.safeParse(option).success).toBe(true);
  });
});

describe('derived invalid cases', () => {
  it.each(objects)('%s fails without any required field', (name, schema) => {
    const valid = example(name) as Record<string, unknown>;
    for (const key of requiredKeys(schema)) {
      const copy = Object.fromEntries(Object.entries(valid).filter(([k]) => k !== key));
      expect(schema.safeParse(copy).success, `without ${key}`).toBe(false);
    }
  });

  it.each(objects.filter(([, schema]) => isStrict(schema)))(
    '%s rejects unknown fields',
    (name, schema) => {
      const valid = example(name) as Record<string, unknown>;
      expect(schema.safeParse({ ...valid, isAdmin: true }).success).toBe(false);
    },
  );
});

describe('hand-written invalid cases', () => {
  it('only name exported schemas', () => {
    const names = others.map(([name]) => name);
    expect(Object.keys(INVALID_EXAMPLES).filter((name) => !names.includes(name))).toEqual([]);
  });

  const cases = others.flatMap(([name, schema]) =>
    invalidFor(name).map((value, index) => [`${name} #${String(index)}`, schema, value] as const),
  );
  it.each(cases)('%s is rejected', (_label, schema, value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});

describe('documents with an approval step', () => {
  const hasPendingApproval = (schema: z.ZodObject) => {
    const status = schema.shape['status'] as z.ZodType | undefined;
    return status instanceof z.ZodEnum && status.options.includes('pending_approval');
  };

  it('are the ones we expect', () => {
    expect(
      objects
        .filter(([, schema]) => hasPendingApproval(schema))
        .map(([name]) => name)
        .sort(),
    ).toEqual([
      'AttendanceRegularisation',
      'CreditNote',
      'EmployeeAdvance',
      'ExpenseClaim',
      'FinalSettlement',
      'LeaveRequest',
      'ManualJournal',
      'PartnerTransaction',
      'PaymentRun',
      'PayrollRun',
      'PurchaseOrder',
      'Quotation',
      'Requisition',
      'SalaryLoan',
      'Timesheet',
      'VendorBill',
    ]);
  });

  it.each(objects.filter(([, schema]) => hasPendingApproval(schema)))(
    '%s links to its approval, so its page can decide through core',
    (_name, schema) => {
      expect(schema.shape['approvalId']).toBeDefined();
    },
  );
});

describe('Money on the wire', () => {
  it('round-trips with the kernel exactly', () => {
    const wire = { amount: '125000.50', currency: 'BDT' } as const;
    expect(toMoney(wire)).toEqual(money(12_500_050n, 'BDT'));
    expect(fromMoney(toMoney(wire))).toEqual(wire);
    expect(fromMoney(money(-5n, 'BDT'))).toEqual({ amount: '-0.05', currency: 'BDT' });
  });

  it('accepts currencies with no decimals in their canonical form', () => {
    expect(Money.safeParse({ amount: '1000', currency: 'JPY' }).success).toBe(true);
  });
});

describe('pagination', () => {
  it('coerces the limit and defaults to 50', () => {
    expect(contracts.CursorQuery.parse({})).toEqual({ limit: 50 });
    expect(contracts.CursorQuery.parse({ limit: '200' })).toEqual({ limit: 200 });
  });

  it('page() wraps items with a next cursor', () => {
    const schema = contracts.page(contracts.PersonRef);
    expect(schema.safeParse({ items: [], nextCursor: null }).success).toBe(true);
    expect(schema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe('restricted fields', () => {
  it('are optional, so the API can omit them, and are marked for OpenAPI', () => {
    const field = restricted(z.string(), 'salary');
    expect(field.safeParse(undefined).success).toBe(true);
    expect(field.meta()).toMatchObject({ 'x-restricted': 'salary' });
  });

  // Keys whose values are Restricted data (data-classification.md).
  const SENSITIVE_KEYS = new Set([
    'nid',
    'bankAccount',
    'accountNumber',
    'capitalBalance',
    'currentBalance',
    'dueFromPartner',
    'basicSalary',
    'allowances',
    'grossSalary',
    'grossPay',
    'netPay',
    'billingRate',
    'overtimePay',
    'taxDeducted',
    'monthlyTds',
    'projectedAnnualTax',
    'investments',
    'principal',
    'monthlyDeduction',
  ]);
  // Create and update bodies carry the plain value in; only responses must omit it.
  const responses = objects.filter(([, schema]) => !isStrict(schema));

  it('covers the fields that exist so far', () => {
    const found = new Set<string>();
    for (const [, schema] of responses) {
      walkFields(schema, ({ key }) => {
        if (key !== undefined && SENSITIVE_KEYS.has(key)) found.add(key);
      });
    }
    expect([...found].sort()).toEqual([...SENSITIVE_KEYS].sort());
  });

  it.each(responses)('%s marks sensitive response fields as restricted', (_name, schema) => {
    const checked = new Set<string>();
    walkFields(schema, ({ key, path, schema: field }) => {
      // The first visit of a path is the field itself; later ones, and `[]`, are its inner schemas.
      if (key === undefined || !SENSITIVE_KEYS.has(key)) return;
      if (checked.has(path) || path.endsWith('[]')) return;
      checked.add(path);
      expect(field.meta()?.['x-restricted'], path).toBeDefined();
      expect(field.safeParse(undefined).success, path).toBe(true);
    });
  });

  it('a salary loan balance is restricted; a vendor balance, which shares the name, is not', () => {
    expect(contracts.SalaryLoan.shape.outstanding.meta()?.['x-restricted']).toBe('salary');
    expect(contracts.Payee.shape.outstanding.meta()?.['x-restricted']).toBeUndefined();
  });

  it('a partner reads without balances, as for a role with no field permission', () => {
    const { capitalBalance, currentBalance, dueFromPartner, ...withoutBalances } = example(
      'Partner',
    ) as Record<string, unknown>;
    expect([capitalBalance, currentBalance, dueFromPartner]).toHaveLength(3);
    expect(contracts.Partner.safeParse(withoutBalances).success).toBe(true);
  });
});

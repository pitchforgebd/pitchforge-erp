import { describe, expect, it } from 'vitest';

import { bodyOf, dhakaInput } from './form-dialog.tsx';
import type { FormSpec } from './form-dialog.tsx';

const specs: readonly FormSpec[] = [
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'note', label: 'Note', kind: 'textarea', nullable: true },
  { name: 'amount', label: 'Amount', kind: 'money' },
  { name: 'rank', label: 'Rank', kind: 'integer' },
  { name: 'active', label: 'Active', kind: 'checkbox' },
  {
    name: 'lines',
    label: 'Lines',
    kind: 'lines',
    addLabel: 'Add',
    fields: [
      { name: 'quantity', label: 'Quantity', kind: 'decimal' },
      { name: 'unitPrice', label: 'Price', kind: 'money' },
    ],
  },
];

describe('the form body', () => {
  it('reshapes what people type, and adds nothing up', () => {
    const values = new Map<string, unknown>([
      ['name', '  Shapla Foods  '],
      ['note', ''],
      ['amount', '1,25,000'],
      ['rank', '2'],
      ['active', true],
      [
        'lines',
        [
          new Map([
            ['quantity', '2'],
            ['unitPrice', '48,000'],
          ]),
          new Map([
            ['quantity', '1.5'],
            ['unitPrice', '3200.5'],
          ]),
        ],
      ],
    ]);
    expect(bodyOf(specs, values as never, { fileIds: [] })).toEqual({
      name: 'Shapla Foods',
      note: null,
      amount: { amount: '125000.00', currency: 'BDT' },
      rank: 2,
      active: true,
      lines: [
        { quantity: '2', unitPrice: { amount: '48000.00', currency: 'BDT' } },
        { quantity: '1.5', unitPrice: { amount: '3200.50', currency: 'BDT' } },
      ],
      fileIds: [],
    });
  });

  it('passes on what is not an amount, so the contract schema reports it', () => {
    const body = bodyOf(
      [{ name: 'amount', label: 'Amount', kind: 'money' }],
      new Map([['amount', 'ten']]),
    );
    expect(body).toEqual({ amount: { amount: 'ten', currency: 'BDT' } });
  });
});

describe('date and time fields', () => {
  it('sends a Dhaka time as UTC, and shows UTC back as Dhaka time', () => {
    const fields: readonly FormSpec[] = [
      { name: 'deadline', label: 'Deadline', kind: 'datetime' },
      { name: 'id', label: 'Id', kind: 'hidden', nullable: true },
    ];
    const body = bodyOf(
      fields,
      new Map([
        ['deadline', '2026-12-01T11:00'],
        ['id', ''],
      ]),
    );
    expect(body).toEqual({ deadline: '2026-12-01T05:00:00.000Z', id: null });
    expect(dhakaInput('2026-12-01T05:00:00Z')).toBe('2026-12-01T11:00');
    expect(dhakaInput(null)).toBe('');
  });
});

import { describe, expect, it } from 'vitest';

import { moneyFromInput } from './money-input.ts';

describe('moneyFromInput', () => {
  it.each([
    ['160000', '160000.00'],
    ['1,60,000', '160000.00'],
    ['160000.5', '160000.50'],
    [' 12 850.75 ', '12850.75'],
    ['0', '0.00'],
  ])('reads %s as %s', (text, amount) => {
    expect(moneyFromInput(text)).toEqual({ amount, currency: 'BDT' });
  });

  it.each(['', 'abc', '1.234', '1e5', '12..5', '৳500'])('refuses %s', (text) => {
    expect(moneyFromInput(text)).toBeNull();
  });
});

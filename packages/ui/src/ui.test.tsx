import { readFileSync } from 'node:fs';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DateText } from './components/date.tsx';
import { Money } from './components/money.tsx';
import { cn } from './lib/cn.ts';

const tokens = readFileSync(path.join(import.meta.dirname, 'styles', 'tokens.css'), 'utf8');

/** The `--name: value` declarations of the block that opens with `selector`. */
function block(selector: string): Map<string, string> {
  const start = tokens.indexOf(`${selector} {`);
  const end = tokens.indexOf('color-scheme:', start);
  const declarations = tokens.slice(start, end).matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g);
  return new Map([...declarations].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]));
}

describe('design tokens', () => {
  const light = block("[data-theme='light']");
  const osDark = block(":root:not([data-theme='light'])");
  const chosenDark = block("[data-theme='dark']");

  it('define the same tokens in light and dark', () => {
    expect(light.size).toBeGreaterThan(25);
    expect([...osDark.keys()].sort()).toEqual([...light.keys()].sort());
  });

  it('keep the two dark blocks identical', () => {
    expect([...chosenDark]).toEqual([...osDark]);
  });

  it('keep the prototype’s ledger teal accent', () => {
    expect(light.get('--accent')).toBe('#0b6e66');
    expect(osDark.get('--accent')).toBe('#3db5a8');
  });
});

/** WCAG relative luminance of #rrggbb. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const c = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [high = 0, low = 0] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

// Axe checks rendered text but skips placeholders, so this covers every text token.
describe('text contrast meets WCAG AA (4.5:1)', () => {
  const pairs = [
    ['--fg', '--bg'],
    ['--fg', '--surface'],
    ['--fg', '--surface-2'],
    ['--muted', '--bg'],
    ['--muted', '--surface'],
    ['--muted', '--surface-2'],
    ['--faint', '--bg'],
    ['--faint', '--surface'],
    ['--faint', '--surface-2'],
    ['--accent', '--bg'],
    ['--accent', '--surface'],
    ['--accent-ink', '--accent'],
    ['--good', '--good-soft'],
    ['--warn', '--warn-soft'],
    ['--crit', '--crit-soft'],
    ['--info', '--info-soft'],
    ['--surface', '--good'],
    ['--surface', '--crit'],
  ] as const;

  const themes = [
    ['light', block("[data-theme='light']")],
    ['dark', block("[data-theme='dark']")],
  ] as const;

  const cases = themes.flatMap(([theme, values]) =>
    pairs.map(([fg, bg]) => [theme, fg, bg, values] as const),
  );

  it.each(cases)('%s: %s on %s', (_theme, fg, bg, values) => {
    expect(contrast(values.get(fg) ?? '', values.get(bg) ?? '')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('cn', () => {
  it('lets a later Tailwind class win', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('a', false, 'b')).toBe('a b');
  });
});

describe('Money', () => {
  const html = (amount: string, currency = 'BDT') =>
    renderToStaticMarkup(<Money value={{ amount, currency }} />);

  it('shows BDT with lakh grouping and tabular digits', () => {
    expect(html('125000.00')).toContain('৳1,25,000');
    expect(html('125000.00')).toContain('tabular-nums');
  });

  it('refuses a value that is not a decimal amount', () => {
    expect(() => html('1,25,000')).toThrow();
  });
});

describe('DateText', () => {
  it('shows DD MMM YYYY with a machine-readable date', () => {
    expect(renderToStaticMarkup(<DateText value="2026-11-04" />)).toContain(
      '<time dateTime="2026-11-04"',
    );
    expect(renderToStaticMarkup(<DateText value="2026-11-04" />)).toContain('04 Nov 2026');
  });
});

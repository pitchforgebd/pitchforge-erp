import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { flatLayout, storePackages } from './build-cpanel.mjs';

let store: string | undefined;

afterEach(() => {
  if (store !== undefined) rmSync(store, { recursive: true, force: true });
  store = undefined;
});

/** A small pnpm store: each entry holds its package and links to its dependencies. */
function makeStore(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'pnpm-store-'));
  const add = (entry: string, name: string) => {
    mkdirSync(path.join(dir, entry, 'node_modules', name), { recursive: true });
    return path.join(dir, entry, 'node_modules', name);
  };
  const react = add('react@19.3.1', 'react');
  add('next@16.4.6', 'next');
  add('@swc+helpers@0.5.23', '@swc/helpers');
  add('sharp@0.35.5', 'sharp');
  add('@img+sharp-linux-x64@0.35.5', '@img/sharp-linux-x64');
  // next's link to react is a dependency, not a second copy.
  symlinkSync(react, path.join(dir, 'next@16.4.6', 'node_modules', 'react'), 'junction');
  mkdirSync(path.join(dir, 'node_modules'));
  return dir;
}

describe('storePackages', () => {
  it('finds each package once, scoped ones too, and skips dependency links', () => {
    store = makeStore();
    const names = storePackages(store).map(([name]) => name);
    expect(names.sort()).toEqual([
      '@img/sharp-linux-x64',
      '@swc/helpers',
      'next',
      'react',
      'sharp',
    ]);
  });
});

describe('flatLayout', () => {
  it('leaves out the platform-specific image tools', () => {
    store = makeStore();
    expect([...flatLayout(storePackages(store)).keys()].sort()).toEqual([
      '@swc/helpers',
      'next',
      'react',
    ]);
  });

  it('refuses two copies of one package', () => {
    expect(() =>
      flatLayout([
        ['react', '/store/react@19.3.1/node_modules/react'],
        ['react', '/store/react@18.3.1/node_modules/react'],
      ]),
    ).toThrow('Two copies of react');
  });
});

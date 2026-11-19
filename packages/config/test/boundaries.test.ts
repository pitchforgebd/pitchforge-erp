import { readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { cruise } from 'dependency-cruiser';
import type { IConfiguration, ICruiseResult } from 'dependency-cruiser';
import { beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const config = require('../dependency-cruiser/config.cjs') as IConfiguration;

const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'boundaries');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

let violationsByFile: Map<string, Set<string>>;

beforeAll(async () => {
  const previous = process.cwd();
  process.chdir(FIXTURES); // dependency-cruiser reports paths relative to the working directory
  try {
    const result = await cruise(['apps', 'packages'], {
      ruleSet: { forbidden: config.forbidden ?? [] },
      validate: true,
      doNotFollow: { path: 'node_modules' },
      tsPreCompilationDeps: true,
      combinedDependencies: true,
    });
    const output = result.output as ICruiseResult;
    violationsByFile = new Map();
    for (const v of output.summary.violations) {
      const set = violationsByFile.get(v.from) ?? new Set<string>();
      set.add(v.rule.name);
      violationsByFile.set(v.from, set);
    }
  } finally {
    process.chdir(previous);
  }
});

const ruleNames = (config.forbidden ?? []).map((r) => r.name ?? '');

describe('dependency-cruiser boundary rules', () => {
  it('has a violation fixture for every rule', () => {
    const fixtureNames = new Set(
      filesUnder(FIXTURES).map((f) => path.basename(f).replace(/(-a|-b)?\.ts$/, '')),
    );
    expect(ruleNames.filter((name) => !fixtureNames.has(name))).toEqual([]);
  });

  it.each(ruleNames)('rule %s fires on its fixture', (rule) => {
    const offenders = [...violationsByFile.entries()]
      .filter(([file]) => path.basename(file).startsWith(rule))
      .flatMap(([, rules]) => [...rules]);
    expect(offenders).toContain(rule);
  });

  it('keeps contract fixtures out of screens', () => {
    expect(violationsByFile.get('apps/web/app/web-app-not-to-mocks-fixtures.ts')).toContain(
      'web-app-not-to-mocks',
    );
  });

  it('allows own-module imports and other modules through public/', () => {
    expect(violationsByFile.get('apps/api/src/modules/billing/application/ok.ts')).toBeUndefined();
  });
});

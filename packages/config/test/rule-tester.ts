import path from 'node:path';

import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';

// Run ESLint's RuleTester inside Vitest.
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

export const FIXTURE_DIR = path.join(import.meta.dirname, 'fixtures', 'rule-tester');
export const FIXTURE_FILE = path.join(FIXTURE_DIR, 'file.ts');

/** A RuleTester with full type information, as in the real config. */
export function typedRuleTester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: FIXTURE_DIR,
      },
    },
  });
}

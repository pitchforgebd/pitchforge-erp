// @ts-check
/**
 * Shared ESLint flat config for Pitchforge ERP.
 * CI runs `eslint . --max-warnings=0`, so every rule here is effectively an error.
 * React / Next.js presets are added with the web app (Phase 0 steps 0.6–0.7).
 */

import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';

import disableNeedsReason from './rules/disable-needs-reason.mjs';
import noFloatMoney from './rules/no-float-money.mjs';

/** Local rules, registered under the `pitchforge/` prefix. */
export const pitchforgePlugin = {
  meta: { name: 'eslint-plugin-pitchforge', version: '0.0.0' },
  rules: {
    'no-float-money': noFloatMoney,
    'disable-needs-reason': disableNeedsReason,
  },
};

const JS_FILES = ['**/*.{js,mjs,cjs}'];
const TEST_FILES = ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**/*.{ts,tsx}'];
const TOOLING_FILES = ['**/scripts/**', '**/*.config.{ts,mjs,js,cjs}', 'packages/config/**'];

/**
 * @param {{ tsconfigRootDir: string }} options
 */
export function base({ tsconfigRootDir }) {
  return defineConfig(
    globalIgnores([
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/storybook-static/**',
      '**/test/fixtures/**',
      'docs/07-prototype/**',
      // Semgrep rule test targets contain deliberate violations; `semgrep --test` checks them.
      '.semgrep/**',
    ]),

    {
      linterOptions: {
        reportUnusedDisableDirectives: 'error',
        reportUnusedInlineConfigs: 'error',
      },
    },

    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    security.configs.recommended,
    noUnsanitized.configs.recommended,

    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      plugins: {
        pitchforge: pitchforgePlugin,
        'import-x': importX,
      },
      settings: {
        'import-x/internal-regex': '^@pitchforge/',
      },
      rules: {
        // Money (CLAUDE.md rule 3)
        'pitchforge/no-float-money': 'error',
        'pitchforge/disable-needs-reason': 'error',

        // TypeScript strictness (CLAUDE.md rule 7)
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { fixStyle: 'separate-type-imports' },
        ],
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all' },
        ],

        // Security (docs/04-security/secure-coding-checklist.md)
        'no-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',
        'no-restricted-globals': [
          'error',
          {
            name: 'localStorage',
            message:
              'No tokens or personal data in browser storage. Use server state or an HTTP-only cookie.',
          },
          {
            name: 'sessionStorage',
            message:
              'No tokens or personal data in browser storage. Use server state or an HTTP-only cookie.',
          },
        ],
        'no-restricted-properties': [
          'error',
          {
            object: 'window',
            property: 'localStorage',
            message: 'No browser storage; see no-restricted-globals.',
          },
          {
            object: 'window',
            property: 'sessionStorage',
            message: 'No browser storage; see no-restricted-globals.',
          },
          {
            object: 'Math',
            property: 'random',
            message: 'Not cryptographically secure. Use crypto.getRandomValues / randomUUID.',
          },
        ],
        // Logs go through the structured logger, which masks PII.
        'no-console': 'error',

        // TypeScript (and checkJs for .mjs) already reports undefined names, with Node and DOM
        // globals typed correctly; core no-undef would only duplicate it without those types.
        'no-undef': 'off',

        // General correctness
        eqeqeq: ['error', 'always'],
        'no-implicit-coercion': 'error',
        'prefer-const': 'error',

        // Imports
        'import-x/no-duplicates': 'error',
        'import-x/no-self-import': 'error',
        'import-x/first': 'error',
        'import-x/newline-after-import': 'error',
        'import-x/order': [
          'error',
          {
            // Type imports sit next to the value import from the same module.
            groups: ['builtin', 'external', 'internal', 'parent', ['sibling', 'index']],
            'newlines-between': 'always',
            alphabetize: { order: 'asc', caseInsensitive: true },
          },
        ],
      },
    },

    // Plain JS (config files, scripts): no type information.
    {
      files: JS_FILES,
      extends: [tseslint.configs.disableTypeChecked],
    },

    // React (packages/ui, apps/web)
    {
      files: ['**/*.tsx'],
      // The plugin's published types do not match ESLint's Plugin type; it works at runtime.
      plugins: {
        'react-hooks': /** @type {import('eslint').ESLint.Plugin} */ (
          /** @type {unknown} */ (reactHooks)
        ),
      },
      rules: {
        ...reactHooks.configs.flat.recommended.rules,
        'no-restricted-syntax': [
          'error',
          {
            selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
            message:
              'Banned: it bypasses escaping. If unavoidable, sanitise and get a security review.',
          },
        ],
      },
    },

    // Next.js (apps/web)
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      plugins: { '@next/next': nextPlugin },
      rules: {
        ...nextPlugin.configs.recommended.rules,
        ...nextPlugin.configs['core-web-vitals'].rules,
      },
      settings: { next: { rootDir: 'apps/web/' } },
    },

    // CommonJS config files (dependency-cruiser) load their rules with require().
    {
      // NestJS modules are decorated classes with no members.
      files: ['apps/api/**/*.ts', 'apps/worker/**/*.ts'],
      rules: {
        '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      },
    },

    {
      files: ['**/*.cjs'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },

    // Tests may use non-null assertions on fixtures they control.
    {
      files: TEST_FILES,
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },

    // Developer tooling and CI scripts write to the terminal and read local files by path.
    {
      files: TOOLING_FILES,
      rules: {
        'no-console': 'off',
        'security/detect-non-literal-fs-filename': 'off',
        // Scripts index their own constant tables; they take no untrusted input.
        'security/detect-object-injection': 'off',
      },
    },

    prettier,
  );
}

export default base;

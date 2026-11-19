# packages/config

Shared presets, so every app follows the same [coding standards](../../docs/05-engineering/coding-standards.md). Changes need tech lead and security review (CODEOWNERS).

| Path                                    | What                                                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig/base.json`                    | Strict TypeScript 6.0 (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `erasableSyntaxOnly`)                   |
| `tsconfig/{node,react,nest}.json`       | Node libraries and scripts; React (bundler resolution, JSX); NestJS (decorators and metadata)                                                              |
| `eslint/index.mjs`                      | Flat config: typescript-eslint strict type-checked, eslint-plugin-security, no-unsanitized, import order, browser-storage / `Math.random` / `console` bans |
| `eslint/rules/no-float-money.mjs`       | `pitchforge/no-float-money`: money-named values must not be `number` or be parsed as floats                                                                |
| `eslint/rules/disable-needs-reason.mjs` | `pitchforge/disable-needs-reason`: `eslint-disable` comments need ` -- reason`                                                                             |
| `dependency-cruiser/config.cjs`         | Module boundary rules (root `.dependency-cruiser.cjs` loads it)                                                                                            |
| `prettier/index.mjs`                    | Prettier options                                                                                                                                           |
| `vitest/preset.ts`                      | `pitchforgeProject(name)` for each package's `vitest.config.ts`                                                                                            |

Every rule has tests in `test/`: RuleTester cases for the lint rules, and one violation fixture per boundary rule under `test/fixtures/boundaries/`. The fixtures are excluded from lint, typecheck and the real boundary check.

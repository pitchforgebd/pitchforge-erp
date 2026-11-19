# Coding standards

## Language and tooling

- TypeScript 6.0 `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; no `any` without a comment explaining why. Presets: `packages/config/tsconfig/`.
- pnpm 12 workspaces + Turborepo; Node 26 LTS, which pnpm downloads into the project, so the machine's Node version does not matter ([ADR-0006](../02-architecture/adr/0006-runtime-and-toolchain-baseline.md)).
- ESLint 10 (typescript-eslint strict type-checked, eslint-plugin-security, no-unsanitized, import order) and Prettier; CI fails on warnings.
- Local rules: `pitchforge/no-float-money` (no `number` maths, `parseFloat` or `toFixed` on money-named values) and `pitchforge/disable-needs-reason` (every `eslint-disable` names its rule and says why after `--`).
- `localStorage`, `sessionStorage`, `Math.random` and `console` are banned in application code.
- Imports in a package use the `.ts` extension (`./money.ts`); workspace packages are imported by name (`@pitchforge/shared-kernel`).

## Naming

| Thing                 | Convention          | Example                       |
| --------------------- | ------------------- | ----------------------------- |
| Files                 | kebab-case          | `approve-vendor-bill.ts`      |
| Types, classes        | PascalCase          | `VendorBill`, `PostingEngine` |
| Functions, variables  | camelCase           | `postJournal`                 |
| Use cases             | Verb + noun         | `ApproveVendorBill`           |
| Events                | `module.past_tense` | `invoice.posted`              |
| DB tables and columns | snake_case          | `journal_line.base_debit`     |
| Error codes           | UPPER_SNAKE         | `PERIOD_LOCKED`               |
| Feature flags         | `module.feature`    | `accounting.real_api`         |

## Backend rules

1. Follow the module template: `public / interface / application / domain / infrastructure`.
2. Domain code has no framework imports.
3. One use case = one transaction, opened in the application layer.
4. Money is `Money` (poisha + currency); rounding half-up to 2 decimals, in one place.
5. Throw typed domain errors; controllers map them to problem responses.
6. No cross-module imports outside `public/`.

## Frontend rules

1. API types come only from `packages/contracts`.
2. Components from `packages/ui`; no one-off colours or spacing outside tokens.
3. Server state in TanStack Query; local UI state in components; no global store unless agreed in an ADR.
4. No business calculations for submission; display formatting only.
5. Every user-facing string through i18n.

## Comments and docs

- Comment _why_, not _what_.
- Public functions in `public/` have TSDoc.
- A behaviour change updates its doc in the same pull request.

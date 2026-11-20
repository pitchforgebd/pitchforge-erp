# Changelog

All notable changes are recorded here. Format: [Keep a Changelog](https://keepachangelog.com); versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- **Phase 1 sprint F5, reports and finish** in `apps/web`: `/reports` with the profit and loss (and last year alongside), balance sheet and cash flow, each opening an account's ledger; the trial balance; 18 reports whose columns come from the server, with export; report schedules. The sample statements agree with each other, and a test checks it in poisha. The app installs from a manifest with four shortcuts and keeps no data on the device (ADR-0014, proposed). An accessibility pass checks every section for one heading, axe in light and dark, and 360 px. The Phase 1 sign-off checklist is in `docs/03-development-phases/phase-1-signoff.md`. 22 new Playwright tests.

- **Phase 1 sprint F4, people and procurement** in `apps/web`: `/hr` (self-service check-in, leave and payslips, salary tax declaration; employees, attendance, leave; payroll runs with a start wizard, salary sheet, lock after step-up and bank file; salary structures, loans, final settlements and tax certificates) and `/procurement` (requisitions validated with the contract schema, purchase orders with goods received and amendments, vendors, assets, depreciation, renewals and deposits). Mocks follow the access-control matrix: an employee sees only themself, a manager their team, finance run totals without anyone else's pay. Shared mock helpers `actOn` and `withViewerAsync` check the body against the contract and step-up before answering. 11 new Playwright tests; 15 mock tests, which caught all 9 planted guard bugs.

- **Phase 1 sprint F3.2, sales and tenders** in `apps/web`: `/crm` with the pipeline (move by stage, win, lose with a reason), forecast, leads (convert to client), clients (contacts, recent activity, overview), quotations (revisions kept, totals from the server, submit, email, record acceptance), contracts, the tender register (bid checklist per tender, outcome with rank and prices), bank guarantees with release and the standard documents. The sample finance and project-manager users now read sales, as the access-control matrix says; only partners act. 8 new Playwright tests; axe found one accessible-name mismatch, now fixed.

- **Phase 1 sprint F3.1, projects** in `apps/web`: `/projects` (projects by role, my work, timesheets with submit) and `/projects/[id]` (value, cost, margin, progress and budget alert for those allowed to see money; milestones with sign-off and deadline changes that need a reason; task board with status changes and new tasks; team; budget, P&L and fee agreements). 12 new Playwright tests.

- **Phase 1 sprint F2.2, billing, tax and partners** in `apps/web`: `/billing` (invoices with post and reminder, receipts with AIT, VDS and retention and a new-receipt form, credit notes and write-offs, receivables ageing with client statements), a VAT and withholding tab in `/finance` (VAT return by month, withholding certificates, challans), and `/partners` (balances, withdrawable amount and warnings, statements, drawings submitted after step-up, profit distribution preview and post, equity history). Fixed error states include `INSUFFICIENT_WITHDRAWABLE_BALANCE`. 15 new Playwright tests; axe found one accessible-name mismatch, now fixed.
- **Phase 1 sprint F2.1, finance and ledger** in `apps/web`: `/finance` (vendor bills with posting preview, new bill, submit; payment runs; payees and payments; payables ageing; expense claims and advances; bank and cash with transfers; reconciliation with match, unmatch and post; cheques) and `/ledger` (journal with reversal by reason; manual journals with a line editor and server-side balance check; chart of accounts; periods with lock, reopen after step-up and the month-end checklist; posting rules, VAT codes, withholding rules, exchange rates). Mocks carry the prototype's accounting records, with every total and reversal written out rather than computed, and fixed error states (`NOT_BALANCED`, `PERIOD_LOCKED`, `ALREADY_REVERSED`). Forms validate with the contract schemas. 17 new Playwright tests.
- **Phase 1 groundwork and sprints F1.1–F1.2** in `apps/web`:
  - Mocks serve the prototype's fictional records per role (`mocks/serve.ts`, `mocks/data/core-records.ts`), and leave out restricted fields the role may not read, following the access-control matrix. Commands answer with fixed outcomes; approve asks for step-up first.
  - Shared screen pieces in `features/common`: page header and cards, cursor-paged lists, loading/empty/error/no-permission states, error messages by code, a step-up dialog and a command hook that retries after it.
  - Screens: home dashboards for partner, finance, project manager and employee; approvals inbox with review, steps, posting preview, approve, reject and return; global search; audit log with filters and the hash-chain state; administration (users, roles, approval rules, company, branches and departments, holidays, document numbers, reminders); account (devices, password); an error page; and a warning five minutes before an idle session ends.
  - 21 new Playwright tests, including axe and 360 px checks on every new page.
- **Staging on cPanel** (ADR-0013): `pnpm build:cpanel` packs the mock-mode web app into `dist/cpanel/pitchforge-web.tar.gz`, with one flat `node_modules`, no symlinks and a Passenger start file. Tested on Node 24.19.0. Guide: `docs/05-engineering/cpanel-staging.md`.
- Project structure, documentation set and clickable prototype (POC v2).
- Phase 0 plan (`docs/03-development-phases/phase-0-plan.md`): step-by-step plan for 0.1–0.10, pinned tool versions, risks, open questions and the decisions taken on approval.
- **Phase 0 step 0.1, monorepo:** pnpm 12 workspace with Turborepo; Node 26.13.0 downloaded per project by pnpm (`devEngines.runtime`); placeholder packages `@pitchforge/{web,api,worker,contracts,ui,shared-kernel}`; `@pitchforge/config` with strict TypeScript 6.0 presets (base, node, react, nest), the ESLint 10 flat config, and the Prettier and Vitest presets. Supply-chain settings: 7-day minimum release age, exact versions, install scripts blocked unless listed in `allowBuilds`.
- ESLint rules `pitchforge/no-float-money` (type-aware: no `number` maths, `parseFloat`, `Number()`, unary `+` or `toFixed` on money-named values) and `pitchforge/disable-needs-reason`, with RuleTester tests.
- dependency-cruiser module boundary rules (`pnpm check:boundaries`) with a violation fixture and test for each of the 15 rules.
- **Phase 0 step 0.2, CI:** `quality`, `contracts`, `security` and `build` jobs, with actions pinned to commit SHAs and scanner images to digests; gitleaks config with Pitchforge rules; Semgrep custom rules with `semgrep --test` cases; `pnpm lint:security`; lefthook pre-commit hooks (gitleaks fails closed, Prettier, ESLint, typecheck) and a Conventional Commits check on commit messages; Renovate config.
- **Phase 0 step 0.3, branch protection as code:** `.github/rulesets/main.json`, a test that keeps it in sync with the CI jobs, and `docs/04-security/branch-protection.md`.
- **Phase 0 step 0.4, `@pitchforge/shared-kernel`:**
  - `Money`: bigint minor units + currency, BIGINT range, 10 currencies.
  - The single rounding rule (`divideRounded`, half away from zero, provisional).
  - `parseMoney` / `toDecimalString`; `Rate` with `multiplyByRate` and `convert`.
  - `allocate` (largest remainder); `formatMoney` (lakh/crore); `amountInWords` (BDT).
  - UUIDv7, Asia/Dhaka business dates, July–June fiscal years and periods.
  - Document numbers `PREFIX-2627-00045`; `DomainError` / `Result`.
  - 344 tests across the workspace, including fast-check properties (allocation sums, no float drift, symmetric rounding, monotonic UUIDs) and golden examples for the accountant. The Vitest threshold enforces 100% coverage of the kernel.
- **Phase 0 step 0.5 part 1, `@pitchforge/contracts`:**
  - Foundation: `Money` as a canonical decimal string, `Rate`, `Percent`, `Masked`, cursor pagination, `Problem` (RFC 9457) with an HTTP status per error code, `allowedActions()`, `restricted()`.
  - `defineEndpoints()`, which enforces idempotency, `If-Match`, deny-by-default errors, strict bodies and cursor pagination when the package loads.
  - 151 endpoints: `core` (auth, organisation, users and roles, approvals, notifications, audit, files, search, jobs), `accounting` (accounts, periods and close, journal, posting rules, vendor bills, payment runs, payees, ageing, claims, advances, bank accounts, transfers, reconciliation, cheques, exchange rates, tax tables), `partners` (register, equity, transactions, withdrawable balance, statements, distribution runs).
  - OpenAPI 3.1 generated into `openapi/openapi.v1.json` (`pnpm contracts:openapi`).
  - `pnpm contracts:coverage`: CORE 30 of 33, FIN 20 of 20 and PAR 14 of 14 Must features have endpoints; the other 3 CORE features are deferred with reasons.
  - `pnpm contracts:diff`: fails on a breaking change without a major bump, using oasdiff.
- **Phase 0 step 0.5 part 2, the remaining contracts:**
  - 190 more endpoints, 341 in all: `crm` (leads, clients, pipeline, forecast, quotations, contracts, tenders, guarantees), `billing` (invoices, receipts, credit notes, receivables ageing, client statements), `projects` (projects, team, budgets, milestones, tasks, timesheets, project P&L, fee agreements), `hr` (employees, offboarding, shifts, attendance, leave), `payroll` (salary structures, runs, payslips, tax declarations, loans, final settlement, tax certificates), `procurement` (vendors, requisitions, purchase orders, goods receipts, assets, depreciation, licences, deposits) and `reporting` (dashboards, financial statements, reports, schedules). Tax returns, certificates and challans join `accounting`.
  - `pnpm contracts:coverage` now covers every feature group. All Must features have an endpoint except 7, each deferred with a reason: CORE-22, CORE-41, CORE-43, UX-03, UX-06, UX-07, UX-11.
  - Examples moved to `packages/contracts/fixtures`, exported as `@pitchforge/contracts/fixtures`, with a valid example for every schema. A boundary rule keeps them out of screens.
  - Mock handlers for all 341 endpoints: `apps/web/mocks/handlers/generated.ts` answers from the fixtures, with no logic and no state, and a test checks every reply against its contract.
- **Phase 0 step 0.8, database design:** draft ERD (`docs/02-architecture/erd.md`), chart of accounts template with a validator, the first migration (12 module schemas, `public` closed), `pnpm db:migrate`, `db:verify` and `db:reset` (localhost only), and the local roles `app_migrate`, `app_rw` and `report_ro`. New required CI job `database`. The accountant has not signed the chart.
- **Phase 0 step 0.9, infrastructure and skeletons:**
  - `apps/api`: NestJS with validated config that refuses weak secrets, pino with redaction, problem+json errors, helmet, a rate limit, a deny-by-default guard, a start-up check that every route has a policy, and `/api/v1/health` and `/api/v1/ready`.
  - `apps/worker`: BullMQ connection, one no-op queue, graceful shutdown.
  - `infra/docker`: Compose stack (PostgreSQL, Valkey, Garage, Mailpit) and three images: non-root, no shell, base images pinned by digest. A production web image holds no mock code.
  - `infra/terraform`: nine modules and the staging environment. Code only: nothing is applied.
  - `packages/contracts` and `packages/shared-kernel` build to `dist` for server images (ADR-0012).
  - New error code `INTERNAL_ERROR`, and `Health` and `Readiness` schemas.
- **Phase 0 step 0.10, security baseline drafts:** threat model v1.1 (T16–T24), cookie policy, API headers, and tables showing what enforces each rule. These wait for the security owner's approval.
- ADR-0009 (plain SQL migrations), ADR-0010 (Valkey and Garage), ADR-0011 (Semgrep CE), ADR-0012 (server builds of workspace packages).
- **Phase 0 step 0.7, `@pitchforge/ui`:** design tokens from the prototype in light and dark, Tailwind 4 mapping, and `Button`, `IconButton`, `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `DateInput`, `DateText`, `Money`, `StatusPill`, `Tag`, `KpiTile`, `Steps`, `Callout`, `EmptyState`, `Dialog`, `Tabs`, toasts and `DataTable`. Storybook with 39 stories that run in Chromium with axe in CI (`pnpm test:storybook`), and a contrast test over every text token.
- **Phase 0 step 0.6, `apps/web`:** Next.js 16 shell on the mock API.
  - Screens: login, 2FA, 2FA enrolment, password reset request, session expired, signed-in shell with role-aware navigation, notifications panel, home and section placeholders.
  - Backend-for-frontend (`/bff/v1/*`): forwards known contract endpoints only, refuses cross-site writes, and passes cookies through.
  - Typed API client driven by the contracts; a new Idempotency-Key per call; responses parsed against the contract.
  - MSW in the server process, with sample users and fixed error states (ADR-0008).
  - Strict CSP with a nonce per response and security headers (`docs/04-security/headers-and-csp.md`).
  - next-intl, with every string in `messages/en.json`; IBM Plex and Archivo self-hosted through `next/font`.
  - 36 Playwright tests on the production build (auth, security, accessibility, 360 px, keyboard), run in CI.
  - `pnpm check:bundle` fails on mock code, sample data or secrets in the client bundle.
- `next` 16.4.3, `next-intl` 4.14.9, `@tanstack/react-query` 5.105.0, `react-hook-form` 7.91.0, `@hookform/resolvers` 5.9.2, `msw` 3.0.3, `get-nonce` 1.0.1, `server-only` 0.0.1, `@playwright/test` 1.64.1, `@axe-core/playwright` 4.14.0.
- ADR-0008: mock API inside the backend-for-frontend.
- `zod` 4.6.7 (runtime) and `@asteasolutions/zod-to-openapi` 9.1.0 (dev, scripts only).
- Shared kernel: error codes for authentication, idempotency, invalid state and business rules.
- `fast-check` 4.10.2 (dev dependency of the shared kernel).
- ADR-0006: runtime and toolchain baseline.
- ADR-0007: every approval decision goes through core. Vendor bills and payment runs lost their own `:approve` and `:reject`; six document types now carry `approvalId`.
- `docs/04-security/evidence/g0-ci-blocks.md`: local proof that a staged secret is blocked.

### Security

- New restricted field kind `personal-bank` for an employee's own bank account. It had shared the `bank` kind with vendor accounts, so Finance would have received employees' bank details, which the access-control matrix forbids.
- Every mock reply now drops the restricted fields its viewer may not read, in `mocks/define.ts`, so a handler cannot leak one by forgetting. A record test found the project team handler sending billing rates to project managers before this change.

### Changed

- Transitions and animations are switched off for people who ask for reduced motion. The new dark-mode sweep had caught axe measuring a button halfway through its colour transition.
- The section placeholder page is gone: every section now has its screens.
- `.github/CODEOWNERS`: paths now follow the module template (`apps/api/src/modules/<name>/`); owners added for the shared kernel, contracts (two teams) and every guard-rail file.
- API paths use `{id}:command` (`/vendor-bills/{id}:approve`) everywhere; `api-design.md` had one `:id:approve` example. Its contract example now matches the real code.
- Document-number examples in `api-design.md` and `data-architecture.md` now use 5 digits (`BILL-2627-00187`, `JE-2627-00413`), per decision Q8.
- ESLint import order: type imports now sit next to the value import from the same module; parent imports come before sibling imports.
- `--faint` differs from the prototype because the original failed WCAG AA (light #646f6b, dark #7b8e8a).
- `pnpm test` and `pnpm test:coverage` skip browser tests; `pnpm test:storybook` runs them. ESLint gained React hooks rules and bans `dangerouslySetInnerHTML` in TSX.
- `NEXT_PUBLIC_API_MODE` is replaced by server-side `API_MODE`, `API_REAL_MODULES` and `ALLOW_MOCK_API`.
- CSRF protection is `Sec-Fetch-Site` and `Origin` checks in the BFF plus `SameSite=Lax`, not a token (`security-architecture.md` updated).
- Zod runs with `jitless: true`, so nothing probes `eval` under the strict CSP.
- Toast viewport renders only while there are toasts: its server-rendered style attribute broke the CSP. `EmptyState` gained `titleAs`. Interactive `packages/ui` components are marked `'use client'`.
- `CLAUDE.md`: Commands section filled in. Coding standards: Node 26, TypeScript 6.0, the local lint rules.
- Every Markdown file is now formatted by Prettier, and `pnpm format:check` in CI covers docs. This was a one-off reformat: whitespace, table alignment and `_emphasis_` style only; no wording changed.

### Fixed

- `next` and `@next/eslint-plugin-next` 16.4.3 → 16.4.6, for two moderate cache-leak advisories (GHSA-mfr8-8qww-v76h, GHSA-vc7v-qv4w-wrv8). The app does not use `'use cache'` or `unstable_cache`.
- The web Dockerfile no longer copies `apps/web/public`, which does not exist.
- The pre-commit ESLint job gets the same memory as `pnpm lint`, so a large commit no longer crashes it.
- The 100% coverage threshold on the shared kernel had silently stopped applying since step 0.7: a `--project` filter made the coverage patterns match nothing, and a threshold with no files passes. Browser tests now run from their own config, with no filter, and `scripts/ci/check-coverage.mjs` fails if the money code is missing from the report.

- `pnpm lint` ran out of memory on a clean clone: type-aware rules over 8 TypeScript projects need more than the default 2 GB heap, so it now runs with 6 GB.

### Placeholders

- `pnpm dev` runs the web app only until the API arrives in step 0.9.

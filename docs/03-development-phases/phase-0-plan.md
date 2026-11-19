# Phase 0 plan

- **Status:** Approved 04 Nov 2026 (recommendations accepted as defaults; see Decisions)
- **Date:** 04 Nov 2026 (versions checked against npm and Docker Hub on this date)
- **Owner:** Tech lead
- **Scope:** Deliverables 0.1–0.10 in [phase-0-foundation.md](phase-0-foundation.md), gate G0

**Phase 0 is done in nine sessions (order below), on Node 26 LTS, TypeScript 6.0, pnpm 12 and Turborepo.** The open questions are in [section 4](#4-risks-and-open-questions). The ones only people can answer (GitHub organisation and plan, AWS, accountant, sign-off owners) are still open.

## Progress

| Step                     | State                                                 | Notes                                                                                                                                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 Monorepo and tooling | **Done** (04 Nov 2026)                                | Verified on a copy of the tracked files; see CHANGELOG                                                                                                                                                                                                                       |
| 0.2 CI pipeline          | **Done locally**; CI run pending                      | Pre-commit secret block proven locally ([evidence](../04-security/evidence/g0-ci-blocks.md)). Proof PRs need the GitHub remote (Q2).                                                                                                                                         |
| 0.3 Branch protection    | **Ready to apply**                                    | Ruleset as code plus [apply steps](../04-security/branch-protection.md); blocked by Q2 and Q15                                                                                                                                                                               |
| 0.4 Shared kernel        | **Done** (04 Nov 2026); accountant sign-off pending   | 100% coverage, property tests. Rounding and display are provisional until Q9 is answered; golden examples in `packages/shared-kernel/src/money/golden.test.ts`. The prototype still shows 4-digit document numbers; Phase 1 mock data must use 5 digits (`BILL-2627-00187`). |
| 0.5 Contracts part 1     | **Done** (04 Nov 2026); review pending                | 151 endpoints for core, accounting and partners, OpenAPI 3.1, Must-feature coverage. `contracts:diff` logic is unit-tested, but oasdiff itself runs only in CI (no Docker here).                                                                                             |
| 0.7 Design system        | **Done** (04 Nov 2026); designer sign-off pending     | 7 component files, 39 stories in Chromium with axe in light and dark. Written by hand in the shadcn pattern, not with its CLI.                                                                                                                                               |
| 0.6 Web shell            | **Done** (06 Nov 2026)                                | Login, 2FA, enrolment, reset request, session expired, role-aware shell, notifications on the mock API; 36 Playwright tests on the production build with strict CSP.                                                                                                         |
| 0.5 Contracts part 2     | **Done** (06 Nov 2026); review pending                | 341 endpoints in all, 7 Must features deferred with reasons, mocks for every endpoint checked against the contracts. W2–W4 have entity plus list, detail and command endpoints, per Q11.                                                                                     |
| 0.8 ERD and accounts     | **Done** (06 Nov 2026); accountant sign-off pending   | ERD, chart of accounts template and validator, first migration, `db:migrate`, `db:verify`, `db:reset`. Migration tested on a local PostgreSQL 14; CI runs it on 16.                                                                                                          |
| 0.9 Infra, API, worker   | **Done locally** (06 Nov 2026); see the note below    | API and worker skeletons run on real PostgreSQL and Redis. Compose and images are written but never run, because this machine has no Docker. Terraform passes `validate` and is not applied.                                                                                 |
| 0.10 Security baseline   | **Documents drafted** (06 Nov 2026); approval pending | Threat model v1.1, cookie policy, API headers, enforcement tables. Security owner approval and the staging header scan are still needed.                                                                                                                                     |
| G0 review                | Blocked                                               | Needs the GitHub repository and a green CI run, AWS (Q6), and sign-off from the accountant, security owner and Partners.                                                                                                                                                     |

**Staging (19 Nov 2026):** staging moved from AWS to the company's cPanel shared hosting, mock mode only, on Node 24.19.0 (ADR-0013). The G0 header scan runs there. AWS or a VPS takes over when the backend arrives in Phase 2, and the Terraform stays unapplied until then.

**Changes from the plan at 0.8–0.10:** `modules/secrets` became `modules/secret-store`, because `.gitignore` drops any folder named `secrets`. `example.tfvars` was not written, because the repository denies Claude Code access to `*.tfvars`; the variables are in `variables.tf`. `@nestjs/cli` and `@nestjs/terminus` were dropped, and `@nestjs/throttler` 6.7.1 was added (ADR-0012). Health probes stay at `/api/v1/health` and `/api/v1/ready`, outside the module API, with their shapes in the contracts. The build stage of each image is Debian rather than Alpine (ADR-0012). A `database` job joined the required checks.

## Decisions

Recorded 04 Nov 2026, when the plan was approved with "do whatever you need". Where the plan made a recommendation, that recommendation is the decision. Any of these can be overturned by a later ADR.

| Q                        | Decision                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Q1                       | Node 26 LTS, provided per project by pnpm ([ADR-0006](../02-architecture/adr/0006-runtime-and-toolchain-baseline.md))    |
| Q3                       | 2 approvals on `main` for every PR, plus code-owner review                                                               |
| Q4                       | Garage v2.5.0 for local S3 (ADR-0010 at step 0.9)                                                                        |
| Q5                       | Valkey 9.0, locally and in production (ADR-0010)                                                                         |
| Q8                       | 5-digit document numbers (`INV-2627-00045`); `api-design.md` and `data-architecture.md` to be corrected at step 0.4      |
| Q10                      | Contracts organised by the 10 backend modules, mapped to the 13 feature-list modules                                     |
| Q11                      | Full contract depth for W1 modules; entity plus list, detail and command endpoints for W2–W4                             |
| Q12                      | Server-side `API_MODE` replaces `NEXT_PUBLIC_API_MODE` (at step 0.6)                                                     |
| Q13                      | Semgrep CE                                                                                                               |
| Approvals                | One path through core, with module handlers (ADR-0007), decided after contract review                                    |
| Q2, Q6, Q7, Q9, Q14, Q15 | **Still open:** they need facts or people (GitHub organisation and plan, AWS, accountant, sign-off owners, signing keys) |

---

## 1. What we are building, and the rules

1. **One internal system for Pitchforge Partners.** Sales and tenders, projects, billing, double-entry accounting, partner equity, HR, payroll and procurement replace spreadsheets. Every taka can be traced to a project, a person and a source document.
2. **A modular monolith.** One TypeScript repository holds a Next.js web app, a NestJS API and NestJS workers. They share one PostgreSQL 16 database with one schema per module, so an approval, its journal entry and its outbound event commit in one transaction.
3. **Contracts come first.** Zod schemas in `packages/contracts` are the only definition of the API. They generate OpenAPI, type the web client, validate API requests and drive the mock server. Nobody hand-writes API types.
4. **The frontend is built first, on mocks.** In Phase 1 every screen is built and signed off against a mock API that serves those contracts. Phase 2 implements the same contracts on the backend, and the UI switches over one module at a time.
5. **No business rules in the browser or in mocks.** Tax, totals for posting, payroll, balances and permissions are calculated only on the server. Mocks return fixed, pre-computed data. The UI only formats data and checks input shape.
6. **Money is never a float.** All amounts are `Money` from `packages/shared-kernel` (integer poisha plus currency), with half-up rounding done in one place. On the wire, amounts are decimal strings. In the database, they are `BIGINT` poisha.
7. **The ledger is the truth.** Every financial effect goes through one posting engine into a balanced, immutable journal. Corrections are reversals. Locked periods refuse entries. The database enforces all of this as well as the code.
8. **Deny by default, enforced on the server.** Every endpoint has an explicit policy covering role, data scope and field rules, and segregation of duties applies to every approval. Restricted fields (salary, bank, NID, partner balances) are left out of responses, not just hidden in the UI. Sessions are server-side, in HTTP-only cookies.
9. **No secrets or real personal data anywhere.** That covers code, logs, fixtures, screenshots, `localStorage` and `NEXT_PUBLIC_*` variables. Test and demo data are synthetic and match the prototype's fictional company.
10. **Boundaries and gates are enforced by tooling.** Modules import each other only through `public/`, and dependency-cruiser fails the build otherwise. CI blocks secrets, vulnerable packages and boundary breaks. Each phase closes only when its security gate is closed.

---

## 2. Step-by-step plan

### Session order

The [playbook](../05-engineering/claude-code-playbook.md) order is kept, with one change: **design tokens and core components (0.7) come before the web shell (0.6)**, so the shell is not built twice.

| Session | Steps                                                                                          | Depends on           | Who signs off                     |
| ------- | ---------------------------------------------------------------------------------------------- | -------------------- | --------------------------------- |
| 2       | 0.1 monorepo, 0.2 CI, 0.3 branch protection                                                    | Q1, Q2 answered      | Tech lead                         |
| 3       | 0.4 shared kernel                                                                              | 0.1; Q8, Q9 answered | Tech lead + accountant (rounding) |
| 4       | 0.5 part 1: contract foundation, core, accounting, partners                                    | 0.4                  | Tech lead + BA                    |
| 6 → 5   | 0.7 design system, then 0.6 web shell on mocks                                                 | 0.5 part 1           | Designer, then frontend lead      |
| 7       | 0.8 ERD and chart of accounts draft, 0.9 local infra, API and worker skeletons, Terraform code | 0.1; Q4–Q6           | Tech lead, DevOps, accountant     |
| 8 (×6)  | 0.5 part 2: remaining module groups                                                            | 0.5 part 1, 0.6      | Tech lead + BA                    |
| —       | 0.10 security baseline documents                                                               | 0.6, 0.9             | Security owner                    |
| 9       | G0 review                                                                                      | all                  | Partners                          |

Every step ends with `pnpm lint && pnpm typecheck && pnpm test`, the [definition of done](definition-of-done.md), a CHANGELOG entry and a Conventional Commit.

---

### 0.1 Monorepo and tooling

**Goal:** a clean clone installs, builds, lints, typechecks and tests with one command each.

| Area              | Files and folders                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root              | `package.json` (private; `packageManager: pnpm@12.16.1`; `devEngines.runtime` node 26.13.0 with `onFail: download`), `pnpm-workspace.yaml` (workspaces, `minimumReleaseAge: 10080`, `savePrefix: ''`, `engineStrict`, `allowBuilds`), `.node-version`, `.gitattributes` (`* text=auto eol=lf`), `turbo.json`, `tsconfig.json` (root scripts and config files), `eslint.config.mjs`, `prettier.config.mjs`, `.dependency-cruiser.cjs` (rules live in `packages/config/dependency-cruiser/`) |
| `packages/config` | `tsconfig/base.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`), `tsconfig/{node,react,nest}.json`; `eslint/{base,react,next,nest}.mjs`; `eslint/rules/no-float-money.mjs` plus its RuleTester test; `prettier/index.mjs`; `vitest/preset.ts`                                                                                                                                                                      |
| Placeholders      | `apps/{web,api,worker}` and `packages/{contracts,ui,shared-kernel}`, each with `package.json`, `tsconfig.json`, `src/index.ts` and one smoke test. Package names are `@pitchforge/<name>`.                                                                                                                                                                                                                                                                                                 |
| Docs              | Fill the Commands section of `CLAUDE.md`; set the Node version in `coding-standards.md`; ADR-0006 _Runtime and toolchain baseline_                                                                                                                                                                                                                                                                                                                                                         |

**Root scripts:** `dev`, `build`, `lint`, `lint:security`, `typecheck`, `test`, `test:coverage`, `format`, `format:check`, `check:boundaries`, `contracts:openapi`, `contracts:diff`. Steps that come later start as stubs that print "not yet implemented" and exit 0. Each stub is listed in the CHANGELOG so none is forgotten.

**`no-float-money` rule:** a type-aware custom rule. It flags `parseFloat`, `Number()`, unary `+`, `toFixed` and arithmetic operators on identifiers that look like money (`amount`, `total`, `net`, `vat`, `tax`, `balance`, `salary`, `price`, `poisha`) when their type is `number`. It is backed by `no-restricted-syntax` bans in `packages/shared-kernel` and `packages/contracts`.

**dependency-cruiser rules:** no cycles; `packages/*` never imports `apps/*`; `apps/web` never imports `apps/api`, `pg` or `ioredis`; across modules only `modules/*/public/**` may be imported; `domain/**` imports no `@nestjs/*`; `shared-kernel` has no runtime dependencies; `contracts` depends only on `zod` and `shared-kernel`.

**Commands:** `git init` (asked first), `pnpm install`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:boundaries`.

**Tests:** smoke tests per package; RuleTester cases for `no-float-money`; a boundaries test that runs dependency-cruiser against fixture folders containing each forbidden import and expects every one to fail.

**Done when:** in a fresh clone in a temporary folder, `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm check:boundaries` all pass, and they fail when a fixture with `parseFloat(amount)` or a cross-module import is added.

---

### 0.2 CI pipeline

**Goal:** CI blocks a planted secret and a planted vulnerable package.

| Area            | Files                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow        | `.github/workflows/ci.yml` rewritten with jobs `quality` (lint, typecheck, test with coverage, boundaries), `contracts` (generate and diff), `security` (gitleaks, `pnpm audit --audit-level high`, ESLint security preset, Semgrep) and `build`. Every action is pinned to a commit SHA, with `permissions: contents: read` and `persist-credentials: false`. |
| Secret scan     | `.gitleaks.toml` (default rules plus a `pitchforge-canary` test rule and rules for non-empty `SESSION_SECRET` and `FIELD_ENCRYPTION_KEY`). gitleaks runs as the pinned CLI or Docker image, not `gitleaks-action`, which needs a paid licence for organisation repositories.                                                                                   |
| Static analysis | `.semgrep/` with custom rules (no `dangerouslySetInnerHTML`, no `localStorage`/`sessionStorage` writes of tokens, no string-built SQL, no `NEXT_PUBLIC_*SECRET*`) plus the `p/typescript`, `p/nodejs` and `p/react` rule packs                                                                                                                                 |
| Local hooks     | `lefthook.yml`: pre-commit runs `gitleaks git --pre-commit --staged`, Prettier and ESLint on staged files, and typecheck on changed packages; commit-msg checks the Conventional Commits format with a small script (no commitlint dependency)                                                                                                                 |
| Updates         | `renovate.json`: weekly, grouped by ecosystem, 7-day minimum release age, majors need manual approval                                                                                                                                                                                                                                                          |
| Evidence        | `docs/04-security/evidence/g0-ci-blocks.md`                                                                                                                                                                                                                                                                                                                    |

**Commands:** `pnpm lint:security`, `pnpm audit --audit-level high`, `docker run zricethezav/gitleaks:v8.30.1 git` (asked first).

**Tests (the proof required by G0):**

1. Branch `chore/ci-proof-secret` adds a file with an obviously fake canary (`pf_test_canary_` plus 32 random characters) and a random, non-working token in GitHub PAT format. The local hook blocks the commit, and the CI `security` job fails when it is pushed with `--no-verify`. If GitHub push protection rejects the push, that is recorded as extra evidence.
2. Branch `chore/ci-proof-vuln` pins an old version of a package with a known high advisory, chosen from the GitHub Advisory Database when the step runs. `pnpm audit` fails.
3. Both PRs are closed without merging and the branches are deleted. Run URLs and screenshots go into the evidence file.

**Done when:** both proof PRs show red required checks and cannot be merged, and `main` is green.

---

### 0.3 Branch protection

**Goal:** a direct push to `main` is impossible.

| Area                | Work                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruleset on `main`   | Require a PR; required checks `quality`, `contracts`, `security` and `build`; at least 1 approval; code-owner review; dismiss stale approvals; signed commits; linear history (squash only); no force-push or deletion; admins not exempt                                                                                                                                                                                               |
| CODEOWNERS fix      | Paths must match the module template: `/apps/api/src/modules/accounting/`, not `/apps/api/src/accounting/`. Add owners for `/packages/shared-kernel/` (money), `/packages/contracts/` (two reviewers per git-workflow), and the guard rails themselves: `/.github/`, `/.claude/`, `lefthook.yml`, `.gitleaks.toml`, `.semgrep/`, `.dependency-cruiser.cjs` and `/packages/config/`. Otherwise an ordinary PR could quietly weaken them. |
| Two-reviewer rule   | GitHub's code-owner review is satisfied by **one** owner, even when a line names two teams, so "two reviewers for accounting, payroll, partners, auth and infra" is not enforced today. Either set the ruleset to require 2 approvals everywhere, or add a required check that counts approvals on sensitive paths (Q3).                                                                                                                |
| Repository security | Secret scanning and push protection on (this needs GitHub Secret Protection for private repositories, see Q2); Dependabot alerts on                                                                                                                                                                                                                                                                                                     |
| Evidence            | Ruleset JSON exported with `gh api` into `docs/04-security/evidence/`                                                                                                                                                                                                                                                                                                                                                                   |

**Commands:** `gh api` calls to read and apply the ruleset. These touch the remote, so I will ask first.

**Done when:** `git push origin main` from a maintainer account is rejected; a PR with an unsigned commit, a failing check or no code-owner approval cannot merge; and the exported ruleset is committed.

---

### 0.4 Shared kernel

**Goal:** framework-free building blocks with 100% unit-test coverage.

| Folder (`packages/shared-kernel/src/`) | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `money/`                               | `Money` (bigint poisha + ISO currency with a minor-unit table), `add`, `subtract`, `negate`, `multiplyByRate` (rate parsed from a decimal string, scaled by 10⁶ to match `numeric(18,6)`, half-up rounding in one function), `allocate` (largest remainder, deterministic tie-break), compare, `isZero`, `parse` and `toDecimalString` (`"125000.00"`), `formatBdt` (lakh/crore `৳1,25,000`, plus an international option), `amountInWords` (English, lakh/crore, paisa). Mixing currencies throws. |
| `ids/`                                 | UUIDv7 using `globalThis.crypto` (no dependency), branded ID types                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `dates/`                               | `BusinessDate` (`YYYY-MM-DD`), Asia/Dhaka helpers via `Intl`, fiscal year with a configurable start month (default July; label `2026–27`, code `2627`), fiscal period of a date, `DD MMM YYYY` formatting                                                                                                                                                                                                                                                                                           |
| `document-no/`                         | Build and parse `PREFIX-2627-00045` (padding depends on Q8)                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `errors/`                              | `DomainError` with stable codes (`PERIOD_LOCKED`, `SOD_VIOLATION`, `NOT_BALANCED`, `STALE_VERSION`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION`), `Result<T, E>`                                                                                                                                                                                                                                                                                                                                         |

**Commands:** `pnpm --filter @pitchforge/shared-kernel test:coverage`.

**Tests:**

- Unit tests with thresholds of 100% for lines, branches, functions and statements, enforced in this package's Vitest config.
- fast-check properties: `allocate` always sums to the original and no share differs from its exact value by 1 poisha or more; `add` and `subtract` are inverse; `parse(toDecimalString(m)) = m`; `multiplyByRate` is within 0.5 poisha of the exact rational result; build and parse of document numbers round-trip; every date maps to exactly one fiscal period; UUIDv7s are time-ordered and have the right version and variant bits.
- Golden examples for `formatBdt` and `amountInWords`, reviewed by the accountant.

**Done when:** coverage is 100%; `package.json` has no `dependencies`; dependency-cruiser confirms it; no exported function takes a `number` amount.

---

### 0.5 Contracts v1 (two parts)

**Goal:** a reviewed contract for every module, with OpenAPI generated and breaking changes blocked.

**Organisation:** one folder per backend module (10). The 13 feature-list modules map onto them: tenders → `crm`, tax → `accounting`, self-service → `core` and `hr`, reports → `reporting`. Administration endpoints (periods, approval rules, tax tables) live in the module that owns the data. See Q10.

| Files (`packages/contracts/`) | Contents                                                                                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/`                 | `Money` as a decimal string plus currency, with `toMoney`/`fromMoney` to the kernel; `IsoDate`, `Timestamp`, `Uuid`, `DocumentNo`; cursor pagination; problem+json error; `allowedActions`; audit metadata; `restricted()` marker |
| `src/endpoint.ts`             | `defineEndpoint({ method, path, params, query, headers, body, response, errors, featureIds, movesMoney, sendsMessages })`                                                                                                         |
| `src/<module>/`               | Entity schemas, `endpoints.ts`, `index.ts`                                                                                                                                                                                        |
| `src/feature-map.ts`          | Feature ID → endpoints, generated from endpoint metadata                                                                                                                                                                          |
| `scripts/generate-openapi.ts` | Writes `openapi/openapi.v1.json` (OpenAPI 3.1, committed)                                                                                                                                                                         |
| `scripts/feature-coverage.ts` | Lists Must features with no endpoint; each one must appear in `deferred.ts` with a reason                                                                                                                                         |

**Rules built into the helper:** request bodies use `z.strictObject`, so unknown fields are rejected. Restricted fields are `.optional()` and emitted as `x-restricted: salary|bank|nid|partner-balance` with the description "omitted without field permission". `movesMoney` and `sendsMessages` require an `idempotency-key` header. Update commands require `if-match`.

**Part 1 (session 4):** shared schemas plus `core` (auth, users and roles, approvals, notifications, audit, files, search), `accounting` and `partners`, following the playbook's prompt 4. **Part 2 (session 8, six runs):** crm and tenders, billing and tax, projects and timesheets, hr and payroll, procurement and assets, reporting and admin.

**Commands:** `pnpm contracts:openapi`, `pnpm contracts:diff` (oasdiff `breaking` against the OpenAPI file at the last `contracts-v*` tag; fails unless `info.version` gets a major bump), `pnpm --filter @pitchforge/contracts test`.

**Tests:**

- Every schema has valid and invalid examples.
- A table test over all endpoints checks that paths match `/api/v1/{module}/{kebab-plural}` or `:command`, every endpoint has `featureIds` and `errors`, lists use cursor pagination, money-moving and message-sending POSTs declare `idempotency-key`, and record schemas with workflow include `allowedActions`.
- No `z.number()` appears in a money position.
- The coverage script fails if a Must feature has neither an endpoint nor a deferral.

**Done when:** OpenAPI is generated in CI; the Must-feature coverage report is attached to the review; the tech lead and BA sign the review for each module group; and Partners have walked through the coverage report (G0 item 1).

---

### 0.7 Design system (before 0.6)

**Goal:** tokens and core components in Storybook, light and dark, accessible.

| Files (`packages/ui/`)   | Contents                                                                                                                                                                                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/tokens.css`  | Prototype palette as CSS variables (`--bg`, `--surface`, `--fg`, `--muted`, `--accent #0B6E66`, `--good`, `--warn`, `--crit`, `--info` and their `-soft` variants, `--rail*`, chart colours), light and dark, plus spacing, radius and type scale                                      |
| `src/styles/globals.css` | Tailwind 4 `@theme` mapping the tokens; fonts IBM Plex Sans/Mono and Archivo, self-hosted via `next/font` in the app (no Google Fonts at runtime, so CSP stays `font-src 'self'`)                                                                                                      |
| `src/components/*.tsx`   | `*.tsx` and `*.stories.tsx` for Button, IconButton, Input, Select, Textarea, Checkbox, DateInput, Field, Dialog, Toast, Tabs, DataTable, StatusPill, Tag, Money, DateText, KpiTile, Steps, Callout, EmptyState. Written in the shadcn pattern; `src/ui.test.tsx` holds the unit tests. |
| `.storybook/`            | `main.ts`, `preview.tsx` (theme switch, MSW browser worker for data stories)                                                                                                                                                                                                           |

`<Money>` takes a contract money value and formats it with `shared-kernel`. It is display only and never does arithmetic.

**Commands:** `pnpm --filter @pitchforge/ui storybook`, `build-storybook`, `test` (Storybook stories run as Vitest browser tests in Playwright, with axe checks).

**Tests:** every story renders in light and dark with zero axe violations; interaction tests for Dialog, Toast, Tabs and Table sorting; unit tests for Money and DateText output.

**Done when:** every listed component has stories covering its states, the a11y test run is green, and the designer signs off against the prototype.

---

### 0.6 Web app shell on the mock API

**Goal:** login → 2FA → home works in mock mode, with strict security headers.

**How mock mode works (proposed in ADR-0008):** the browser talks only to the Next.js backend-for-frontend (BFF) on the same origin, using an HTTP-only session cookie. The BFF calls `API_URL`. In mock mode, MSW (`msw/node`), started in `instrumentation.ts`, intercepts those server-side calls. The browser never runs a service worker, mock code never reaches the client bundle, and the mock session is a real HTTP-only cookie, so the cookie rules are exercised from day one. The mode is a server-side `API_MODE=mock|real` with `API_REAL_MODULES=accounting,…` instead of `NEXT_PUBLIC_API_MODE` (Q12).

| Files (`apps/web/`)                  | Contents                                                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `proxy.ts`                           | Next 16's replacement for middleware: per-request CSP nonce, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`, session check and redirect |
| `instrumentation.ts`                 | Starts MSW in mock mode; refuses to start if `NODE_ENV=production` and `API_MODE=mock`, except on staging with an explicit flag                                                            |
| `app/(auth)/`                        | `login`, `two-factor`, `two-factor/enrol`, `reset-password`, `session-expired`                                                                                                             |
| `app/(app)/`                         | `layout.tsx` (role-aware navigation from the session's permissions, top bar, notifications panel), `home/page.tsx`                                                                         |
| `app/bff/v1/[...path]/route.ts`      | Forwards to the API; validates responses against contracts in development and test                                                                                                         |
| `lib/api/`                           | Typed client built from `defineEndpoint` metadata; `lib/auth/`; `lib/config/env.ts` (Zod-validated environment; rejects secret-looking `NEXT_PUBLIC_*` values)                             |
| `messages/en.json`, `i18n/`          | next-intl, English only                                                                                                                                                                    |
| `mocks/`                             | `server.ts`, `handlers/<module>/*.ts`, `data/sample-company.ts` (prototype data); includes `SOD_VIOLATION`, `PERIOD_LOCKED`, `STALE_VERSION` and `FORBIDDEN` responses                     |
| `tests/e2e/`, `playwright.config.ts` | End-to-end specs                                                                                                                                                                           |
| `scripts/ci/scan-bundle.mjs` (root)  | Runs gitleaks over `.next/static` and fails if `msw` or `mocks/` appear in a production client bundle                                                                                      |

**Commands:** `pnpm --filter @pitchforge/web dev`, `build`, `test`, `test:e2e`.

**Tests:**

- Unit: every mock response parses against its contract schema; environment validation.
- Playwright: login → 2FA → home; expired session redirects; every response has the headers and a CSP nonce without `unsafe-inline`; after login, `localStorage` and `sessionStorage` are empty and the session cookie is `HttpOnly`, `Secure` and `SameSite=Lax`; a keyboard-only path through login and navigation; no horizontal scroll at 360 px; axe on every page.

**Done when:** all of the above pass in CI and the bundle scan is green.

---

### 0.8 Database ERD and chart of accounts

**Goal:** a draft ERD and a chart-of-accounts template that the accountant signs.

| Files                                                             | Contents                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/02-architecture/erd.md`                                     | Mermaid `erDiagram`: full detail for `core`, `accounting` and `partners`; entity outlines for the other schemas; conventions from [data architecture](../02-architecture/data-architecture.md) (UUIDv7, `company_id`, audit columns, `version`) |
| `db/seeds/chart-of-accounts/bd-service-company.csv` + `README.md` | Code (4 digits), name, type, normal balance, parent, control flag, tax mapping, assumptions                                                                                                                                                     |
| `db/migrations/0001_create_schemas.sql`                           | Schemas only, `REVOKE ALL ON SCHEMA public FROM PUBLIC`; no tables yet                                                                                                                                                                          |
| `db/migrate.config.*`                                             | node-pg-migrate in plain SQL mode (ADR-0009)                                                                                                                                                                                                    |
| `infra/docker/postgres/init/`                                     | Local-only roles `app_rw`, `app_migrate`, `report_ro`                                                                                                                                                                                           |

**Commands:** `pnpm db:migrate`, `pnpm db:reset` (local only; refuses to run against a host other than localhost).

**Tests:** CI runs the migration on a fresh PostgreSQL 16 service container, then runs it again to confirm a no-op. A chart-of-accounts validator checks unique codes, existing parents, one type per account, flagged control accounts and a balanced type structure.

**Done when:** the migration runs green in CI, and the accountant's sign-off (name, date) is recorded in the CSV README. This is blocked by Q7.

---

### 0.9 Infrastructure, API and worker skeletons

**Goal:** local stack in Docker; API health endpoint; staging defined as code. No feature endpoints.

| Area          | Files                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local stack   | `infra/docker/compose.yaml`: PostgreSQL, Redis-compatible cache, S3-compatible store, Mailpit; named volumes, healthchecks, ports bound to `127.0.0.1` only, credentials from `.env`; `.env.example` updated                                                                                                                                                                                                                      |
| Images        | `infra/docker/{web,api,worker}.Dockerfile`: multi-stage, `node:26-alpine` pinned by digest, `pnpm deploy --prod`, non-root user, read-only root filesystem, no shell tools in the final stage                                                                                                                                                                                                                                     |
| `apps/api`    | NestJS on Express: `src/main.ts`, `src/app.module.ts`, `src/platform/{config (Zod), logging (pino with redaction), errors (problem+json filter), security (helmet, rate limit), policy (global deny-by-default guard plus `@Policy()` decorator)}`, `src/modules/<10 modules>/{public,interface,application,domain,infrastructure}/.gitkeep`, `GET /api/v1/health` and `/api/v1/ready` (PostgreSQL and Redis checks via terminus) |
| `apps/worker` | NestJS application context, BullMQ connection, one no-op queue, graceful shutdown                                                                                                                                                                                                                                                                                                                                                 |
| Terraform     | `infra/terraform/modules/{network,ecs,rds,cache,s3,waf,kms,secrets,dns-tls}`, `envs/staging/{main,backend,versions,variables}.tf`, `example.tfvars`. **Code only. No `terraform apply`.**                                                                                                                                                                                                                                         |

**Commands:** `docker compose -f infra/docker/compose.yaml up -d` (asked first), `pnpm --filter @pitchforge/api dev`, `terraform fmt -check`, `terraform validate` (asked first).

**Tests:**

- API e2e (Nest testing module, `app.listen(0)` plus `fetch`): health returns 200 with no version or secret details; an unknown route returns a problem+json 404 with a request id; a test controller without `@Policy()` returns 403; a startup check lists every route and fails the test if any lacks a policy.
- Config: the API refuses to start with a missing or weak `SESSION_SECRET`.
- Images: `id -u` is not 0; writes to `/` fail.
- Compose: all services become healthy.

**Done when:** the local stack is healthy and the API passes its tests. **Staging serving the web app over HTTPS with an A header grade needs an AWS account, a region and a domain (Q6).** Applying Terraform is a human step after review.

---

### 0.10 Security baseline

**Goal:** the security documents approved by the security owner.

| File                                                                    | Work                                                                                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/04-security/threat-model.md`                                      | v1: add the CI and supply chain, mock mode on staging, the BFF and the cookie session                                                                   |
| `docs/04-security/headers-and-csp.md` (new)                             | Exact header values and CSP directives, matching what `proxy.ts` and helmet send                                                                        |
| `docs/04-security/cookie-policy.md` (new)                               | `__Host-pf_session`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, no `Domain`; CSRF token design; 60 min idle and 12 h absolute timeouts; revocation |
| `docs/04-security/data-classification.md`, `secure-coding-checklist.md` | Review and approve; link each checklist item to the lint or Semgrep rule that enforces it, where one exists                                             |
| `docs/04-security/evidence/`                                            | CI block runs, ruleset export, header scan report                                                                                                       |

**Done when:** the security owner's approval is recorded in each document; the Playwright header test matches `headers-and-csp.md`; and the staging header scan scores A (after Q6).

### ADRs to write during Phase 0

| ADR  | Decision                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0006 | Runtime and toolchain baseline: Node 26 LTS, TypeScript 6.0, pnpm 12, ESLint 10, 7-day release cooldown                                    |
| 0007 | Every approval decision goes through core (accepted)                                                                                       |
| 0008 | Mock transport: MSW inside the BFF server process; server-side `API_MODE` (accepted)                                                       |
| 0009 | Migrations as plain SQL with node-pg-migrate; the query layer (Kysely recommended over Prisma or Drizzle) is decided in Phase 1 groundwork |
| 0010 | Local S3-compatible store and Redis-compatible cache images                                                                                |
| 0011 | Static analysis with Semgrep CE (unless GitHub Advanced Security is bought)                                                                |

---

## 3. Tools and versions

**Pins follow a 7-day cooldown.** Each pin is the newest stable release that was at least 7 days old on 04 Nov 2026. pnpm enforces this from then on (`minimumReleaseAge`), and Renovate does the same for updates. This protects us from compromised releases, which are usually caught within days. "Latest" is shown where it differs from the pin.

### Runtime and workspace

| Tool        | Pin                      | Latest  | Why                                                                                                                                                      |
| ----------- | ------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js     | **26.13.0** (Active LTS) | —       | Node 22, named in the coding standards, reaches end of life on 30 Apr 2027, before go-live. Node 26 is supported until Apr 2029. Fallback: 24.22.2 (Q1). |
| pnpm        | 12.16.1                  | —       | Strict, fast workspaces; blocks dependency install scripts by default; supports a release-age cooldown                                                   |
| turbo       | 2.11.10                  | —       | Cached, dependency-ordered tasks across the workspace                                                                                                    |
| typescript  | **6.0.3**                | 7.0.2   | typescript-eslint supports only TypeScript below 6.1, and type-aware lint rules matter here. Move to 7 when typescript-eslint supports it.               |
| tsx         | not used                 | 4.23.15 | Node 26 runs the TypeScript scripts directly, so this dependency was not needed                                                                          |
| @types/node | 26.6.5                   | 26.6.6  | Matches the Node major                                                                                                                                   |

### Lint, format, boundaries

| Tool                         | Pin                               | Latest  | Why                                                                                                                                      |
| ---------------------------- | --------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| eslint                       | 10.13.0                           | 10.14.0 | Flat config; version 9 is out of support                                                                                                 |
| @eslint/js                   | 10.0.1                            | —       | Recommended base rules                                                                                                                   |
| typescript-eslint            | 8.72.1                            | —       | Type-aware rules (`no-floating-promises`, `no-unsafe-*`, `strict-boolean-expressions`)                                                   |
| eslint-plugin-security       | 4.2.0                             | 4.2.1   | Node security patterns (unsafe regex, `eval`, non-literal `fs` and `require`)                                                            |
| eslint-plugin-no-unsanitized | 4.1.5                             | —       | Blocks unsanitised `innerHTML` and `insertAdjacentHTML`                                                                                  |
| eslint-plugin-import-x       | 4.17.1                            | —       | Import order and no-cycle at lint time (dependency-cruiser is the enforcer)                                                              |
| eslint-plugin-react-hooks    | 7.1.1                             | —       | Hook rules                                                                                                                               |
| @next/eslint-plugin-next     | 16.4.3                            | 16.4.5  | Next.js rules, used directly; `eslint-config-next` would pull in jsx-a11y                                                                |
| eslint-config-prettier       | 10.1.8                            | —       | Turns off rules that conflict with Prettier                                                                                              |
| ~~eslint-plugin-jsx-a11y~~   | not used                          | 6.10.2  | Supports only ESLint ≤ 9. Accessibility is enforced by axe in Storybook and Playwright; re-add when it supports ESLint 10.               |
| prettier                     | 3.9.10                            | —       | One format, no style debates                                                                                                             |
| dependency-cruiser           | 18.7.0                            | 18.7.2  | Enforces module boundaries in CI (`pnpm check:boundaries`)                                                                               |
| lefthook                     | 2.2.2                             | —       | Chosen over husky (last release Nov 2024): one binary, parallel hooks, staged-file filtering built in (no lint-staged), works on Windows |
| Semgrep CE                   | 1.182.1 (`semgrep/semgrep` image) | 1.183.0 | Free static analysis with custom rules; CodeQL on private repositories needs paid GitHub Advanced Security                               |
| gitleaks                     | v8.30.1 (`zricethezav/gitleaks`)  | —       | Secret scan in pre-commit and CI; run as CLI because `gitleaks-action` needs a licence for organisations                                 |
| oasdiff                      | v1.35.0 (`tufin/oasdiff`)         | —       | Detects breaking OpenAPI changes for `contracts:diff`                                                                                    |

### Testing

| Tool                         | Pin             | Latest  | Why                                                              |
| ---------------------------- | --------------- | ------- | ---------------------------------------------------------------- |
| vitest + @vitest/coverage-v8 | 5.0.5           | 5.1.0   | Fast TypeScript-native tests and coverage thresholds             |
| @vitest/browser-playwright   | 5.0.5           | 5.1.0   | Runs Storybook stories as real-browser tests                     |
| fast-check                   | 4.10.2          | —       | Property tests for money, allocation and (later) ledger balance  |
| @playwright/test             | 1.64.1          | —       | End-to-end tests and security-header specs                       |
| @axe-core/playwright         | 4.14.0          | —       | WCAG 2.1 AA checks on every page                                 |
| unplugin-swc + @swc/core     | 2.0.0 + 1.16.20 | 1.16.21 | Vitest needs SWC to emit the decorator metadata NestJS relies on |

### Contracts and frontend

| Tool                                                       | Pin                 | Latest   | Why                                                                                                                                                |
| ---------------------------------------------------------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| zod                                                        | 4.6.7               | —        | The single schema language: contracts, forms, config                                                                                               |
| @asteasolutions/zod-to-openapi                             | 9.1.0               | —        | Generates OpenAPI 3.1 from Zod 4 with reusable components; Zod's own JSON Schema output does not produce full OpenAPI documents                    |
| next                                                       | 16.4.3              | 16.4.5   | App Router, server rendering for CSP nonces, BFF route handlers                                                                                    |
| react, react-dom                                           | 19.3.1              | —        | Required by Next 16                                                                                                                                |
| @types/react                                               | 19.3.0              | —        | Types                                                                                                                                              |
| tailwindcss + @tailwindcss/postcss                         | 4.3.3               | 4.3.4    | Token-driven styling via CSS variables, which matches the prototype                                                                                |
| shadcn                                                     | not used            | 4.23.0   | Components are written here in its pattern, so nothing is copied unreviewed from a registry                                                        |
| radix-ui                                                   | 1.8.1               | —        | Accessible Dialog, Tabs, Checkbox, Popover, Toast                                                                                                  |
| class-variance-authority, clsx, tailwind-merge             | 0.7.1, 2.1.1, 3.7.0 | —        | Component variants and class merging                                                                                                               |
| lucide-react                                               | 1.62.0              | 1.68.0   | Icons                                                                                                                                              |
| react-day-picker                                           | 10.0.2              | —        | Calendar for `DateInput`                                                                                                                           |
| tw-animate-css                                             | 1.4.0               | —        | Tailwind animations                                                                                                                                |
| ~~sonner~~                                                 | not used            | 2.0.8    | It injects a `<style>` element with no nonce support, which the strict CSP blocks. Radix Toast replaces it.                                        |
| @tanstack/react-query                                      | 5.105.0             | 5.105.3  | Server-state cache and invalidation                                                                                                                |
| @tanstack/react-table                                      | 9.3.1               | —        | Headless tables with server-side sort, filter and pagination. Version 9 is a new major; the shadcn examples target 8, so expect small adaptations. |
| react-hook-form                                            | 7.91.0              | —        | Forms validated with contract schemas                                                                                                              |
| @hookform/resolvers                                        | **5.9.2**           | 7.0.2    | Two majors (6 and 7) were released in the last 3 weeks; stay on the stable 5.x line and review in Phase 1                                          |
| next-intl                                                  | 4.14.9              | —        | i18n from day one; Bangla later                                                                                                                    |
| msw                                                        | 3.0.3               | —        | Mock API in the BFF (node) and Storybook (browser) from the same handlers                                                                          |
| storybook, @storybook/react-vite, addon-a11y, addon-vitest | 10.6.5              | —        | Component catalogue, a11y checks, stories as tests. `react-vite`, not `nextjs-vite`: `packages/ui` does not depend on Next.js.                     |
| @vitejs/plugin-react, playwright                           | 6.1.2, 1.64.1       | 6.2.1, — | React in Vite; Chromium for story tests                                                                                                            |
| vite                                                       | 8.3.5               | —        | Required by Storybook and Vitest                                                                                                                   |

### Backend skeleton (Phase 0 parts only)

| Tool                                            | Pin                   | Latest | Why                                                                                                                                   |
| ----------------------------------------------- | --------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| @nestjs/core, common, platform-express, testing | 12.3.2                | —      | API framework. Express rather than Fastify for the widest middleware support; performance is not a constraint at a few hundred users. |
| @nestjs/cli                                     | 12.0.11               | —      | Build and dev                                                                                                                         |
| @nestjs/terminus                                | 12.1.0                | —      | Health and readiness checks                                                                                                           |
| reflect-metadata, rxjs                          | 0.2.2, 7.8.2          | —      | Required by NestJS                                                                                                                    |
| nestjs-pino, pino, pino-http                    | 5.3.1, 10.4.0, 11.0.0 | —      | Structured JSON logs with redaction paths for PII                                                                                     |
| helmet                                          | 8.3.0                 | —      | Security headers on the API                                                                                                           |
| bullmq + ioredis                                | 6.5.0 + 6.0.0         | 6.5.4  | Worker queue skeleton                                                                                                                 |
| node-pg-migrate + pg                            | 9.0.0 + 8.23.1        | —      | Forward-only plain-SQL migrations, matching "reviewed SQL" in the data architecture                                                   |

Not installed in Phase 0, noted for later: kysely 0.29.7, testcontainers 12.2.1, @testing-library/react 16.3.3, rate limiting (`@nestjs/throttler`, asked when needed).

### Docker images (pinned by digest when pulled)

| Image          | Pin                                                                     | Why                                                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL     | `postgres:16.15-alpine3.24`                                             | Matches the production major (RDS 16)                                                                                                                                                                           |
| Cache          | `valkey/valkey:9.0.7-alpine3.24` (recommended) or `redis:8.10.3-alpine` | Valkey is BSD-licensed, Redis-compatible, supported by BullMQ and offered by ElastiCache. Redis 8 is AGPL, RSAL or SSPL (Q5).                                                                                   |
| Object storage | `dxflrs/garage:v2.5.0` (recommended) or `rustfs/rustfs:1.0.4`           | **`minio/minio` no longer exists on Docker Hub** (MinIO's community edition went source-only in 2025). Garage is mature, S3-compatible and supports presigned URLs. RustFS is closer to MinIO but younger (Q4). |
| Mailpit        | `axllent/mailpit:v1.32.0`                                               | Local SMTP catcher with a web UI (v1.33.0 is under 7 days old)                                                                                                                                                  |
| Node base      | `node:26.13.0-alpine3.24`                                               | Small base for non-root runtime images                                                                                                                                                                          |

GitHub Actions versions (checkout, setup-node, pnpm/action-setup) are pinned to commit SHAs at step 0.2. Looking them up needs the GitHub API, which I will ask about then.

---

## 4. Risks and open questions

### Questions that block a step

| #   | Question                                                                                                                                                                                                                                                          | Blocks                      | Recommendation                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | Which Node version? The coding standards say Node 22, which ends support on 30 Apr 2027, about six months before the planned go-live.                                                                                                                             | 0.1                         | Node 26 LTS; update the coding standards and ADR-0006                                                                                                                                            |
| Q2  | Does the GitHub organisation `pitchforge` exist, with the teams named in CODEOWNERS? Which plan? Rulesets on private repositories need GitHub Team or higher; secret scanning and push protection on private repositories need the paid Secret Protection add-on. | 0.2, 0.3                    | GitHub Team plus Secret Protection, or accept gitleaks alone and record that                                                                                                                     |
| Q3  | How should "two reviewers for sensitive paths" be enforced? CODEOWNERS alone accepts one approval.                                                                                                                                                                | 0.3                         | Require 2 approvals on `main` for everything while the team is small                                                                                                                             |
| Q4  | Which local S3 store replaces MinIO?                                                                                                                                                                                                                              | 0.9                         | Garage v2.5.0                                                                                                                                                                                    |
| Q5  | Redis or Valkey, locally and in production?                                                                                                                                                                                                                       | 0.9                         | Valkey 9.0 everywhere                                                                                                                                                                            |
| Q6  | AWS account, region (Singapore, Mumbai or a Bangladesh data centre), staging domain and secret manager access                                                                                                                                                     | 0.9 staging, G0 header scan | Decide by the end of week 2, or G0 slips                                                                                                                                                         |
| Q7  | Chart of accounts, opening-balance date, approval thresholds and partnership-deed profit rules (SRS open questions)                                                                                                                                               | 0.8 sign-off, G0            | Book a session with the accountant in week 1                                                                                                                                                     |
| Q8  | Document-number padding: 5 digits (`CLAUDE.md`, SRS: `INV-2627-00045`) or 4 (`api-design.md`: `BILL-2627-0187`; `data-architecture.md`: `JE-2627-0413`)?                                                                                                          | 0.4                         | 5 digits; fix the two docs                                                                                                                                                                       |
| Q9  | Rounding of negative amounts (half-up or half away from zero), FX rate precision (6 decimals assumed), and whether `৳1,25,000` hides paisa in display                                                                                                             | 0.4                         | Accountant decides; golden examples record the answer                                                                                                                                            |
| Q10 | Are contracts organised by the 10 backend modules, with the 13 feature-list modules mapped onto them?                                                                                                                                                             | 0.5                         | Yes                                                                                                                                                                                              |
| Q11 | Contract depth: 260 features in about two weeks of backend and BA time is very tight.                                                                                                                                                                             | 0.5                         | Full detail for W1 modules (core, accounting, partners, projects); entity plus list, detail and command endpoints for W2–W4, deepened before each module's Phase 1 sprint and still frozen at G1 |
| Q12 | Replace `NEXT_PUBLIC_API_MODE` with a server-side `API_MODE`, as in step 0.6?                                                                                                                                                                                     | 0.6                         | Yes; update `.env.example` and the frontend architecture doc                                                                                                                                     |
| Q13 | Semgrep CE or CodeQL for static analysis?                                                                                                                                                                                                                         | 0.2                         | Semgrep CE unless Q2 includes Advanced Security                                                                                                                                                  |
| Q14 | Who are the security owner, accountant and designer who sign off?                                                                                                                                                                                                 | 0.7, 0.8, 0.10, G0          | Name them in the project overview                                                                                                                                                                |
| Q15 | Commit signing: does every developer have an SSH signing key, and do Claude Code sessions commit under the developer's signing setup?                                                                                                                             | 0.3                         | SSH signing for everyone before the ruleset is switched on                                                                                                                                       |

### Risks

| Risk                                                                                                                                                                                                                                        | Impact                                                               | Mitigation                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Very new major versions** (ESLint 10, Vitest 5, MSW 3, NestJS 12, Storybook 10, TanStack Table 9, Next 16). Plugin lag is already visible: jsx-a11y, typescript-eslint with TypeScript 7, `@microsoft/eslint-plugin-sdl` (ESLint 9 only). | Integration problems in 0.1 and 0.7                                  | 7-day cooldown; a half-day compatibility spike at the start of 0.1; fall back one major per tool if blocked, recorded in ADR-0006                       |
| **Mock mode runs on staging**, so mock code is deployed.                                                                                                                                                                                    | Mocks could reach production                                         | Separate image build target; bundle scan fails if `msw` appears in a production build; API refuses `API_MODE=mock` in production                        |
| **CSP nonces force dynamic rendering** of every page in Next.js.                                                                                                                                                                            | Slightly slower pages, no static caching of HTML                     | Acceptable for an internal app; static assets are still cached                                                                                          |
| **CODEOWNERS paths are wrong and guard rails are unowned.** `/apps/api/src/accounting/` does not match `src/modules/accounting/`; shared-kernel, CI, hooks and scanner configs have no owner.                                               | Money code or guard rails change with weak review                    | Fixed in 0.3                                                                                                                                            |
| **This machine is not ready.** Node 22.17.0, no pnpm, no Docker on the shell's path, and no git repository yet. Windows line endings could leak in.                                                                                         | Session 2 stalls                                                     | Before session 2: install Node 26 and Docker Desktop, enable pnpm, install the gitleaks binary (`winget`), allow `git init`; `.gitattributes` forces LF |
| **pnpm blocks dependency build scripts by default.**                                                                                                                                                                                        | Native packages (`@swc/core`, `esbuild`, `lefthook`) fail to install | Explicit `onlyBuiltDependencies` allowlist, reviewed as a security file                                                                                 |
| **0.5 is the critical path,** and G0 also depends on external sign-offs (accountant, Partners, security owner) and on AWS.                                                                                                                  | Phase 0 overruns 4 weeks                                             | Contracts part 1 starts in week 1; part 2 runs alongside 0.6 and 0.7; book sign-off meetings now                                                        |
| **TypeScript 6.0 is a bridge release** that deprecates old options, and 7.0 is a native rewrite.                                                                                                                                            | A migration later                                                    | Use only non-deprecated options now; track typescript-eslint's TypeScript 7 support                                                                     |

---

**Next step:** approve or amend this plan, answer Q1–Q15 (the first four are needed before session 2), and session 2 then implements 0.1–0.3.

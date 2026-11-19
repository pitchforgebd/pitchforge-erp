# Claude Code playbook · Phase 0

**Run Phase 0 as nine Claude Code sessions, one prompt each, in order.** Review the diff and commit after every session before starting the next. `CLAUDE.md` and `.claude/settings.json` in the repo root give every session the rules and the guard rails.

## How to run a session

1. Open a terminal in the repository root and start Claude Code. For prompt 1 use plan mode.
2. Paste the prompt. Answer its questions; approve its plan before it writes code.
3. When it finishes: read the diff, run `pnpm lint && pnpm typecheck && pnpm test` yourself, commit.
4. Start the next prompt in a fresh session (`/clear`), so each step starts with clean context.

## Guard rails already in the repo

| File                    | What it does                                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`             | Rules every session follows: contracts first, no business logic in the UI, Money type, security, boundaries                                                                   |
| `.claude/settings.json` | Blocks reading `.env`, keys and Terraform state; blocks `terraform apply/destroy` and force-push; asks before `git push`, adding packages, Docker, network calls and `rm -rf` |

> These rules cover Claude Code's own tools and common shell file commands. They do not stop a script that Claude writes from opening files by itself, so keep real secrets out of the project folder entirely.

## Standard footer (already included in each prompt)

```text
Follow CLAUDE.md. Work in small steps; run lint, typecheck and tests after each and fix failures.
Ask before adding any dependency (name, version, why). No secrets or real personal data anywhere.
Update docs and CHANGELOG.md for anything you change. When done, report: what changed, how you
verified it, what is left, and any risks. Then stop.
```

---

## Prompt 1 · Orientation and Phase 0 plan (plan mode, no code)

```text
You are the senior engineer starting Pitchforge ERP, a security-critical internal ERP with a
double-entry ledger. Do not write code in this session.

Read: CLAUDE.md, README.md, docs/README.md, docs/00-project-overview.md,
docs/02-architecture/architecture-overview.md, module-boundaries.md, api-design.md,
frontend-architecture.md, data-architecture.md, docs/02-architecture/adr/*,
docs/03-development-phases/roadmap.md, phase-0-foundation.md, definition-of-done.md,
docs/04-security/security-architecture.md, secure-coding-checklist.md, security-gates.md,
docs/05-engineering/coding-standards.md, testing-strategy.md.

Then produce docs/03-development-phases/phase-0-plan.md containing:
1. A 10-bullet summary of what we are building and the non-negotiable rules, in your own words.
2. A step-by-step plan for Phase 0 deliverables 0.1–0.10: for each step the files and folders
   to create, commands, tests, and how we will verify it is done.
3. Proposed tools and libraries with exact versions (latest stable; check with `npm view <pkg>
   version`, ask me before running it) and one line on why each: pnpm, Turborepo, TypeScript,
   ESLint (flat config) + security plugins, Prettier, Vitest, fast-check, dependency-cruiser,
   Zod, zod-to-openapi (or equivalent), Next.js, Tailwind, shadcn/ui, TanStack Query/Table,
   React Hook Form, next-intl, MSW, Storybook, Playwright, NestJS, Docker images
   (PostgreSQL 16, Redis, MinIO, Mailpit), gitleaks, lefthook or husky.
4. Risks and open questions that block Phase 0.

Show me the plan and stop for approval.
```

## Prompt 2 · Monorepo, tooling, CI and guard rails (0.1–0.3)

```text
Implement Phase 0 steps 0.1–0.3 from docs/03-development-phases/phase-0-plan.md.

- pnpm workspace + Turborepo with the folders in README.md (apps/web, apps/api, apps/worker,
  packages/contracts, packages/ui, packages/shared-kernel, packages/config). Keep app folders
  as empty packages with a placeholder build for now.
- packages/config: strict tsconfig base (strict, noUncheckedIndexedAccess,
  exactOptionalPropertyTypes), ESLint flat config with typescript-eslint, import rules,
  eslint-plugin-security and a rule banning floating-point money helpers, Prettier, Vitest preset.
- Root scripts: dev, build, lint, lint:security, typecheck, test, format, check:boundaries,
  contracts:openapi, contracts:diff (stubs allowed where later steps fill them).
- dependency-cruiser rules enforcing module boundaries (only modules/*/public importable
  across modules; packages may not import apps).
- gitleaks config and a pre-commit hook (lefthook or husky) running gitleaks, lint-staged,
  typecheck on changed packages.
- Replace the stub steps in .github/workflows/ci.yml so they run for real.
- Fill the Commands section of CLAUDE.md with the real commands.
- Prove the guard rails: add a temporary test that shows CI/pre-commit blocks a fake secret
  (use an obviously fake pattern), then remove it and describe the evidence.

Follow CLAUDE.md. Work in small steps; run lint, typecheck and tests after each and fix failures.
Ask before adding any dependency (name, version, why). No secrets or real personal data anywhere.
Update docs and CHANGELOG.md for anything you change. When done, report: what changed, how you
verified it, what is left, and any risks. Then stop.
```

## Prompt 3 · Shared kernel (0.4)

```text
Implement Phase 0 step 0.4: packages/shared-kernel, framework-free and fully tested.

- Money: integer poisha (bigint) + ISO currency; add, subtract, multiply by rate with
  half-up rounding to 2 decimals in one place, allocate (split an amount by ratios without
  losing a poisha), compare, isZero; parse/format "125000.00"; format BDT with lakh/crore
  grouping (৳1,25,000) and an international option; amount in words (English) for invoices.
  Refuse mixing currencies.
- IDs: UUIDv7 generator and branded ID types.
- Dates: business date type (YYYY-MM-DD), Asia/Dhaka helpers, fiscal year July–June
  (label "2026–27", code "2627"), fiscal period of a date.
- Document numbers: PREFIX-2627-00045 builder and parser.
- Errors: typed DomainError with stable codes (PERIOD_LOCKED, SOD_VIOLATION, NOT_BALANCED,
  STALE_VERSION, NOT_FOUND, FORBIDDEN, VALIDATION) and a Result type.
- Tests: Vitest unit tests at 100% line coverage, plus fast-check property tests
  (allocate always sums to the original; add/subtract round-trips; no float drift).

Follow CLAUDE.md. Work in small steps; run lint, typecheck and tests after each and fix failures.
Ask before adding any dependency (name, version, why). No secrets or real personal data anywhere.
Update docs and CHANGELOG.md for anything you change. When done, report: what changed, how you
verified it, what is left, and any risks. Then stop.
```

## Prompt 4 · Contracts foundation and first modules (0.5, part 1)

```text
Implement Phase 0 step 0.5 part 1: packages/contracts foundation plus the core, accounting
and partners contracts. Follow docs/02-architecture/api-design.md exactly.

- Shared schemas: Money as decimal string + currency, IsoDate, Uuid, DocumentNo, pagination
  (cursor), problem+json error with stable codes, allowedActions, audit metadata.
- An endpoint definition helper: method, path, params, query, headers (Idempotency-Key where
  money moves or messages are sent), body, response, error codes.
- core: auth (login, 2FA verify, logout, session, password reset), users and roles (read),
  approvals (inbox, detail, approve, reject, delegate), notifications, audit log (read), files
  (upload intent returning a signed URL, download URL), search.
- accounting: accounts, fiscal periods (lock/reopen), journal entries (list, detail, manual
  journal submit, reverse), vendor bills, payment runs, bank accounts, transfers, statement
  import and reconciliation, tax and withholding tables.
- partners: partners, equity history, contributions, drawings, distribution runs, statements.
- Map every endpoint to feature IDs in docs/01-requirements/feature-list.md (comment or
  metadata) and list any Must feature with no endpoint.
- Generate OpenAPI 3.1 into packages/contracts/openapi/ and make contracts:diff fail on
  breaking changes against the last tagged version.
- Restricted fields (salary, bank account, NID, partner balances) are optional in responses and
  documented as "omitted without field permission".
- Tests: every schema has valid and invalid examples; OpenAPI generation runs in CI.

Follow CLAUDE.md. Work in small steps; run lint, typecheck and tests after each and fix failures.
Ask before adding any dependency (name, version, why). No secrets or real personal data anywhere.
Update docs and CHANGELOG.md for anything you change. When done, report: what changed, how you
verified it, what is left, and any risks. Then stop.
```

## Prompt 5 · Web app shell on the mock API (0.6)

```text
Implement Phase 0 step 0.6: apps/web as a Next.js App Router app running in mock mode.
Use docs/07-prototype/pitchforge-erp-poc.html as the visual reference for layout and behaviour,
but build it properly with the design tokens from packages/ui when they exist.

- Typed API client generated from packages/contracts; no hand-written API types.
- MSW mock layer under apps/web/mocks: handlers validated against the contract schemas, seeded
  with the prototype's sample company. Mocks return fixed data only; no accounting logic.
  Include error responses (SOD_VIOLATION, PERIOD_LOCKED, STALE_VERSION, FORBIDDEN).
- NEXT_PUBLIC_API_MODE=mock|real with a per-module override.
- Screens: login, 2FA challenge, 2FA enrolment, password reset request, session-expired page,
  authenticated shell (role-aware navigation, top bar, notifications panel), home placeholder.
- Security: strict Content-Security-Policy with nonces (no unsafe-inline), HSTS,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors 'none';
  no tokens or personal data in localStorage/sessionStorage/URLs; a build check that fails if a
  secret pattern appears in the client bundle or a NEXT_PUBLIC_ variable looks like a secret.
- i18n with next-intl (English only for now; no hard-coded strings).
- Playwright tests: login → 2FA → home in mock mode; security headers present; keyboard-only
  navigation works; layout works at 360 px.

Follow CLAUDE.md. Work in small steps; run lint, typecheck and tests after each and fix failures.
Ask before adding any dependency (name, version, why). No secrets or real personal data anywhere.
Update docs and CHANGELOG.md for anything you change. When done, report: what changed, how you
verified it, what is left, and any risks. Then stop.
```

## Prompt 6 · Design system (0.7)

```text
Implement Phase 0 step 0.7: packages/ui on shadcn/ui and Tailwind.

- Tokens from the prototype's palette and type (ledger teal accent, IBM Plex Sans/Mono,
  Archivo headings), light and dark themes, semantic good/warning/critical/info colours.
- Components: Button, IconButton, Input, Select, Textarea, Checkbox, DateInput, Field with
  label/hint/error, Dialog, Toast, Tabs, Table (TanStack, with sorting, empty/loading/error
  states), StatusPill, Tag, Money (BDT lakh grouping, international option, tabular numbers),
  DateText (DD MMM YYYY), KPI tile, Steps (approval chain), Callout, EmptyState.
- Storybook with every component in every state, light and dark; axe accessibility checks in
  Storybook tests.
- Switch apps/web to these components.

Follow CLAUDE.md. Work in small steps; run lint, typecheck and tests after each and fix failures.
Ask before adding any dependency (name, version, why). No secrets or real personal data anywhere.
Update docs and CHANGELOG.md for anything you change. When done, report: what changed, how you
verified it, what is left, and any risks. Then stop.
```

## Prompt 7 · Local infrastructure and API skeleton (0.8–0.9)

```text
Implement Phase 0 steps 0.8–0.9 (local and staging-ready infrastructure; no feature endpoints).

- infra/docker: docker-compose.yml for PostgreSQL 16, Redis, MinIO and Mailpit with named
  volumes and healthchecks; credentials only from .env (never committed). Update .env.example.
- apps/api: NestJS skeleton with one module per domain as empty shells following the module
  template (public/interface/application/domain/infrastructure), config validation with Zod,
  structured JSON logging with request id and PII masking, /health and /ready endpoints,
  global problem+json error mapping, helmet-style headers, rate limiting, and a deny-by-default
  guard that rejects any route without an explicit policy. No business endpoints.
- apps/worker: NestJS skeleton connected to Redis with a no-op queue and graceful shutdown.
- Dockerfiles for web, api, worker: multi-stage, non-root user, read-only filesystem, minimal
  base image.
- db/: migration tool chosen in the plan, an initial migration creating schemas only, and the
  draft ERD in docs/02-architecture/ (Mermaid erDiagram) for core, accounting and partners.
- infra/terraform: module layout for staging (network, ECS, RDS, ElastiCache, S3, WAF, KMS,
  Secrets Manager) as code only. Do NOT run terraform apply.

Follow CLAUDE.md. Work in small steps; run lint, typecheck and tests after each and fix failures.
Ask before adding any dependency (name, version, why). No secrets or real personal data anywhere.
Update docs and CHANGELOG.md for anything you change. When done, report: what changed, how you
verified it, what is left, and any risks. Then stop.
```

## Prompt 8 · Remaining contracts (0.5, part 2) · repeat per module group

```text
Implement Phase 0 step 0.5 part 2 for these modules: <crm + tenders> | <billing + tax> |
<projects + timesheets> | <hr + payroll> | <procurement + assets> | <reporting + admin>.
(Run this prompt once per group.)

Follow docs/02-architecture/api-design.md and the patterns already in packages/contracts.
Cover every Must feature of these modules in docs/01-requirements/feature-list.md, map
endpoints to feature IDs, add MSW handlers with fixed sample data from the prototype, add
valid/invalid examples for every schema, regenerate OpenAPI, and list any feature you could
not cover and why.

Follow CLAUDE.md. Work in small steps; run lint, typecheck and tests after each and fix failures.
Ask before adding any dependency (name, version, why). No secrets or real personal data anywhere.
Update docs and CHANGELOG.md for anything you change. When done, report: what changed, how you
verified it, what is left, and any risks. Then stop.
```

## Prompt 9 · Gate G0 review (plan mode, no code changes)

```text
Act as an independent reviewer. Do not change code. Check the repository against gate G0 in
docs/03-development-phases/phase-0-foundation.md and the Phase 0 row of
docs/04-security/security-gates.md, plus docs/03-development-phases/definition-of-done.md.

For each item answer PASS / FAIL / PARTIAL with evidence (file paths, commands you ran and
their output). Also report: contract coverage of Must features per module, any business logic
found in apps/web or mocks, any floating-point money handling, any route without a policy,
any secret-looking strings, dependency audit results, and boundary violations.

Write the result to docs/03-development-phases/g0-review.md and give me a short summary with
the list of blockers.
```

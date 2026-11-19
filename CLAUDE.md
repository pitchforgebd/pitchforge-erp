# CLAUDE.md · Pitchforge ERP

You are working on Pitchforge ERP: an internal ERP (sales, tenders, projects, double-entry accounting, partner equity, HR, payroll, procurement) for a Bangladeshi company. Security and financial correctness come before speed.

## Current phase

**Phase 0 · Foundation and contracts.** Build tooling, shared kernel, API contracts, design system, web app shell on a mock API, local infrastructure and an API health endpoint. **Do not build backend feature endpoints yet** (they are Phase 2). See `docs/03-development-phases/phase-0-foundation.md`.

## Read before working

| Task                            | Read                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Anything                        | `README.md`, `docs/README.md`                                                                         |
| Architecture or new module code | `docs/02-architecture/architecture-overview.md`, `module-boundaries.md`                               |
| API or contracts                | `docs/02-architecture/api-design.md`                                                                  |
| Web app                         | `docs/02-architecture/frontend-architecture.md`, prototype `docs/07-prototype/`                       |
| Database                        | `docs/02-architecture/data-architecture.md`                                                           |
| Security-relevant code          | `docs/04-security/security-architecture.md`, `secure-coding-checklist.md`, `access-control-matrix.md` |
| Finishing a task                | `docs/03-development-phases/definition-of-done.md`                                                    |

## Non-negotiable rules

1. **Contracts first.** API shapes live only in `packages/contracts` (Zod). Web and API import from there; never hand-write API types.
2. **No business rules in the frontend or mocks.** Tax, totals for posting, payroll, balances and permissions are backend work. Mocks return fixed, pre-computed data.
3. **Money** is `Money` from `packages/shared-kernel` (integer poisha + currency). Never use floating point or plain `number` arithmetic for amounts.
4. **Ledger:** double-entry, posted entries immutable, corrections by reversal, one posting engine. Locked periods refuse entries.
5. **Security:** deny by default; authorisation on the server for every request; segregation of duties; no secrets, tokens or personal data in code, logs, fixtures, `localStorage` or `NEXT_PUBLIC_*` variables.
6. **Module boundaries:** import other modules only through their `public/` folder.
7. **TypeScript strict.** No `any` without a comment explaining why.

## How to work

- Plan first. For any task bigger than a small fix, write the plan and wait for approval.
- Work in small steps; after each step run lint, typecheck and tests and fix failures before continuing.
- Ask before adding a dependency: name it, its version, why, and alternatives.
- Ask before running anything that touches the network, Docker volumes, git remotes or infrastructure.
- Use sample data that matches the prototype (fictional clients and people). Never invent real-looking personal IDs.
- Update docs and `CHANGELOG.md` in the same change when behaviour or structure changes. Record architecture decisions as ADRs in `docs/02-architecture/adr/`.
- Commit messages: Conventional Commits, e.g. `feat(contracts): add vendor bill schemas`.
- End each task with: what changed, how it was verified, what is left, any risks.

## Commands

Run from the repository root. pnpm runs every script on Node 26.13.0, which it downloads into the project, whatever Node the machine has.

```bash
pnpm install            # install; also installs git hooks (lefthook)
pnpm build              # turbo build
pnpm typecheck          # tsc --noEmit in every package + root scripts
pnpm lint               # ESLint (strict type-checked, security, no-float-money), 0 warnings
pnpm lint:security      # bare eslint-disable check + Semgrep (Semgrep needs semgrep or Docker locally)
pnpm test               # Vitest, all projects
pnpm test:coverage      # with coverage
pnpm test:storybook     # every story in Chromium with axe (first: pnpm --filter @pitchforge/ui exec playwright install chromium)
pnpm test:e2e           # Playwright on the production build (first: pnpm --filter @pitchforge/web exec playwright install chromium)
pnpm format             # Prettier write;  pnpm format:check  to verify
pnpm check:boundaries   # dependency-cruiser module rules
pnpm check:bundle       # after pnpm build: no mock code or secrets in the client bundle
pnpm contracts:openapi  # regenerate packages/contracts/openapi/openapi.v1.json (commit it)
pnpm contracts:coverage # every Must feature of a finished module has an endpoint or a deferral
pnpm contracts:diff     # breaking API change without a major bump fails (needs oasdiff or Docker)
pnpm dev                # web on http://localhost:3000 in mock mode
pnpm db:migrate         # apply migrations (needs DATABASE_MIGRATE_URL)
pnpm db:verify          # apply, confirm a second run does nothing, check the schemas
pnpm db:reset           # local databases only
pnpm --filter @pitchforge/api dev     # API on http://localhost:4000
pnpm --filter @pitchforge/worker dev  # worker
```

Run one package's tests with `pnpm exec vitest run --project <name>` (e.g. `api`, `config`, `contracts`, `scripts`, `shared-kernel`, `ui`, `web`, `worker`). Commits need gitleaks on PATH (`winget install Gitleaks.Gitleaks`); the pre-commit hook blocks the commit if it is missing.

## Conventions

BDT with lakh grouping (`৳1,25,000`) · fiscal year July–June · Asia/Dhaka, timestamps stored UTC · dates `DD MMM YYYY` · document numbers `PREFIX-2627-00001` · files kebab-case · events `module.past_tense` · error codes `UPPER_SNAKE`.

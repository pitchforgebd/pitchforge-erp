# Secure coding checklist

Use this in every pull request review. Items marked **(F)** apply to frontend, **(B)** to backend.

## Input and output

- [ ] **(B)** Every request body, query and header is parsed with the contract schema; unknown fields rejected
- [ ] **(B)** SQL only through the query builder or parameterised statements
- [ ] **(F)** No `dangerouslySetInnerHTML`; if unavoidable, sanitised and reviewed
- [ ] **(B)** Errors return a stable code and request id, never stack traces, SQL or internal paths

## Authentication and authorisation

- [ ] **(B)** New endpoint has an explicit policy; deny by default
- [ ] **(B)** Record-level check on every load by ID (no IDOR)
- [ ] **(B)** Field rules applied: restricted fields omitted for roles without permission
- [ ] **(B)** Segregation of duties checked in the use case
- [ ] **(B)** Step-up authentication for sensitive actions
- [ ] **(F)** UI derives actions from `allowedActions`, never from role names alone

## Money and integrity

- [ ] **(B)** Money as poisha via `Money`; no floats, no `Number` arithmetic on amounts
- [ ] **(B)** Money moves only through the posting engine, in one transaction with the document change
- [ ] **(B)** Idempotency key required and stored
- [ ] **(F)** No totals, tax or balances calculated for submission in the browser

## Secrets and data

- [ ] No secrets in code, config, tests, fixtures, logs or `NEXT_PUBLIC_*`
- [ ] **(F)** Nothing sensitive in `localStorage`, `sessionStorage`, URLs or analytics
- [ ] **(B)** Logs mask PII and amounts tied to people
- [ ] Test data is synthetic

## Files

- [ ] **(B)** Type and size validated; virus scan before availability; private storage; signed URL download

## Dependencies

- [ ] New dependency justified in the PR, maintained, licence acceptable, no known high/critical vulnerabilities

## What enforces each item

A reviewer still reads for these. This table shows where a tool catches a mistake first.

| Item                                 | Enforced by                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Unknown fields rejected              | `defineEndpoints()` requires strict bodies when the contracts load             |
| Parameterised SQL                    | Semgrep `pitchforge.no-string-built-sql`                                       |
| No `dangerouslySetInnerHTML`         | Semgrep `pitchforge.no-dangerously-set-inner-html`                             |
| Stable error codes, no stack traces  | `ProblemFilter` in `apps/api`, tested in `app.test.ts`                         |
| Explicit policy, deny by default     | `PolicyGuard`; the API refuses to start with a route that has no policy        |
| Restricted fields                    | `restricted()` and its contract test                                           |
| Money as `Money`, no floats          | ESLint `pitchforge/no-float-money`, Semgrep `pitchforge.no-float-money-parse`  |
| Idempotency key                      | `defineEndpoints()` adds the header; a contract test pins the posting commands |
| No secrets in code                   | gitleaks in the pre-commit hook and in CI; `pnpm check:bundle`                 |
| No secrets in `NEXT_PUBLIC_*`        | Semgrep `pitchforge.no-secret-in-next-public`, `pnpm check:bundle`             |
| Nothing sensitive in browser storage | Semgrep `pitchforge.no-browser-storage`, Playwright `security.spec.ts`         |
| Logs mask PII                        | Redaction paths in `apps/api`, with a test                                     |
| Dependencies                         | `pnpm audit` in CI, 7-day release cooldown, install scripts denied by default  |

Record-level checks, segregation of duties, step-up, the posting engine and file scanning have no tool yet. They arrive with the code in Phase 2 and need review and tests.

## Approval

| Role           | Name | Date | Result  |
| -------------- | ---- | ---- | ------- |
| Security owner |      |      | Pending |

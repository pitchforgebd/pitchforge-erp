# Phase 2 · Backend in four waves

**Weeks 21–42. Goal: implement the frozen contracts so the signed-off UI works on real data, one wave at a time.** Each wave switches its modules from mock to real with a feature flag and must pass contract tests and golden datasets before the next wave starts.

## Steps

| Step          | Weeks | Scope                                                                                                                                                                                                   | Highlights                         |
| ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| B1 · Platform | 21–24 | Auth (Argon2id, TOTP, sessions in Redis), policy engine (CASL → SQL), audit triggers and hash chain, approval engine, notifications and reminders, files with virus scan, numbering, outbox and workers | Everything later waves rely on     |
| B2 · Wave 1   | 25–30 | Accounting (chart of accounts, posting engine, journal, reversal, period lock, payables, payment runs, bank, reconciliation), partners, projects, timesheets                                            | Ledger correctness is the priority |
| B3 · Wave 2   | 31–34 | CRM, quotations, contracts, tenders and guarantees, billing, receipts, VAT and withholding                                                                                                              | Tax tables effective-dated         |
| B4 · Wave 3   | 35–38 | HR, attendance import, leave, payroll run, payslips, bank salary files, salary tax                                                                                                                      | Payroll golden dataset from HR     |
| B5 · Wave 4   | 39–42 | Procurement, GRN, assets and depreciation, all reports, administration, scheduled exports                                                                                                               | Reports tie to the ledger          |

## Backend groundwork done in Phase 1

Database schema and migrations, the ledger tables with their database constraints, the posting engine with property-based tests, infrastructure for production, and the security foundations (KMS keys, secret rotation, WAF rules). This is why B2 can focus on business flows.

## Rules

1. The contract is the specification. If the backend needs a change, raise a change request.
2. One use case = one transaction. Money moves only through the posting engine.
3. Authorisation in the application layer for every use case, plus row-level security as a second line.
4. Every money-moving endpoint requires an `Idempotency-Key`.
5. Accounting, payroll and partner code needs two reviewers (CODEOWNERS).

## Gate G2 per wave

- [ ] Contract tests: every endpoint's responses validate against the frozen schemas
- [ ] The UI for the wave runs on the real API with no frontend changes beyond the flag
- [ ] Golden dataset reproduces the accountant's figures to the taka (P&L, balances, partner statements, payroll)
- [ ] Policy tests: each role sees and does exactly what the [access control matrix](../04-security/access-control-matrix.md) allows
- [ ] No high or critical findings from static analysis and dependency scans

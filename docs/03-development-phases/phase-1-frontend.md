# Phase 1 · Frontend on the mock API

**Weeks 5–20, eight two-week sprints. Goal: every screen of the product works end to end in mock mode on staging and is signed off by the Partners.** The [prototype](../07-prototype/README.md) is the visual and behavioural reference.

## Progress

| Sprint     | State                  | Notes                                                                                                                                                                                                                                                                                                                                          |
| ---------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Groundwork | **Done** (20 Nov 2026) | Record-backed mocks with restricted fields left out by role; shared page header, list paging, loading/empty/error/no-permission states, error messages by code, step-up and commands                                                                                                                                                           |
| F1.1       | **Done** (20 Nov 2026) | Built in Phase 0, plus the error page, idle-session warning, step-up dialog and the account page (devices, password)                                                                                                                                                                                                                           |
| F1.2       | **Done** (20 Nov 2026) | Home dashboards per role, approvals inbox and review, search, audit log, administration. Partner sign-off pending                                                                                                                                                                                                                              |
| F2.1       | **Done** (20 Nov 2026) | Payables and bank (bills, payment runs, payees, ageing, claims, advances, bank and cash, transfers, reconciliation, cheques) and the ledger (journal and reversal, manual journals, chart of accounts, periods and close checklist, posting rules, VAT, withholding, exchange rates). Partner sign-off pending                                 |
| F2.2       | **Done** (20 Nov 2026) | Invoices (post, reminder), receipts with AIT, VDS and retention, credit notes and write-offs, receivables ageing with client statements; VAT return, withholding certificates and challans; partners with balances, withdrawable amount, drawings with step-up, profit distribution preview and post, equity history. Partner sign-off pending |
| F3.1–F5    | Not started            |                                                                                                                                                                                                                                                                                                                                                |

Started on 20 Nov 2026 while gate G0 is still open (CI proof, sign-offs, staging header scan).

## Sprints

| Sprint | Weeks | Scope                                                                                                                                        | Feature IDs              |
| ------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| F1.1   | 5–6   | App shell, navigation by role, login, 2FA enrolment, password reset, session timeout, error pages                                            | CORE-06…13, UX-03, UX-11 |
| F1.2   | 7–8   | Home dashboards (Partner, Finance, PM, Employee), approvals inbox and review dialog, notifications, global search, audit log, administration | CORE-14…41, RPT-01…06    |
| F2.1   | 9–10  | Journal, manual journal, reversal, payables, vendor bills, payment run, bank accounts, transfers, reconciliation                             | FIN-01…25                |
| F2.2   | 11–12 | Invoices, receipts with AIT/VDS, receivables ageing, tax screens, partners, contributions, drawings, distribution                            | BIL-_, TAX-_, PAR-*      |
| F3.1   | 13–14 | Projects, milestones, sign-off, deadline change, task board, timesheets and approval                                                         | PRJ-*                    |
| F3.2   | 15–16 | Leads, pipeline, quotations, contracts, tenders, bid checklist, guarantees                                                                   | CRM-_, TND-_             |
| F4     | 17–18 | Employees, attendance, leave, payroll run wizard, payslips, self-service, requisitions, POs, GRN, assets, renewals                           | HR-_, PAY-_, PRC-*       |
| F5     | 19–20 | All reports, exports, PWA, mobile quick actions, accessibility audit, polish, **sign-off**                                                   | RPT-07…21, UX-*          |

## Rules

1. Build only against `packages/contracts`. A missing field is a contract pull request, not a local type.
2. Every screen covers: loading, empty, error (including `SOD_VIOLATION`, `PERIOD_LOCKED`, `STALE_VERSION`), no-permission and success states.
3. Every screen works at 360 px and with keyboard only.
4. Mocks return fixed results. Never calculate tax, totals for posting, payroll or balances in the browser.
5. Each sprint ends with a demo on staging and a Playwright suite for its journeys.

## Exit and gate G1

- [ ] Every Must feature has a screen and a passing end-to-end test in mock mode
- [ ] Accessibility audit: no serious WCAG 2.1 AA issues
- [ ] Frontend security checklist passed (CSP, no tokens in storage, no secrets in bundle)
- [ ] Partners sign off the UI on staging
- [ ] **Contracts frozen** and tagged `contracts-v1.0.0`

# SRS summary

**The full requirements live in the SRS v2.0 document; this page is the developer's short version.** When this page and the SRS disagree, the SRS wins and this page gets fixed.

- Source: _Pitchforge ERP — Software Requirements Specification v2.0_ (Docs), with its Feature List tab
- Architecture: _Pitchforge ERP — Software Architecture Document v1.0_ (Docs), condensed in [02-architecture](../02-architecture/architecture-overview.md)

## Non-negotiable rules

| #   | Rule                                                                                                                          | Why                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| R1  | Double-entry, accrual-based ledger. Every posted entry has debits = credits, enforced by the database.                        | Correct books and statements      |
| R2  | Posted journal entries are never edited or deleted. Corrections are reversals or adjustments linked to the original.          | Audit trail, fraud resistance     |
| R3  | Documents (invoice, bill, claim, payroll run) carry workflow status; the journal is written only when a document is approved. | Workflow and books stay separate  |
| R4  | Nobody approves their own request (segregation of duties).                                                                    | Fraud control                     |
| R5  | Locked periods accept no entries, including reversals, until a Partner reopens them.                                          | Closed months stay closed         |
| R6  | Money is integer poisha (`BIGINT`) or `NUMERIC(18,2)`, never floating point.                                                  | No rounding drift                 |
| R7  | Tax rates, approval limits, leave rules and salary structures are effective-dated configuration, never code.                  | Annual Finance Act changes        |
| R8  | Permissions are enforced on the server for every API call, search, export and report.                                         | The UI is not a security boundary |
| R9  | Salary, bank account, NID and partner balances need their own field permission and are encrypted at rest.                     | Most sensitive data               |
| R10 | Every change is written to an append-only, hash-chained audit log.                                                            | Accountability                    |

## Roles

Partner · Finance Manager · Project Manager · Employee/Engineer · Sales/BD · HR · Procurement · Auditor (read-only, time-boxed) · Viewer · Client portal (later). See the [access control matrix](../04-security/access-control-matrix.md).

## Conventions

| Item             | Value                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| Base currency    | BDT (৳), lakh/crore grouping `৳1,25,000`                               |
| Fiscal year      | July to June (configurable)                                            |
| Time zone        | Asia/Dhaka; timestamps stored in UTC                                   |
| Date format      | `DD MMM YYYY`                                                          |
| Document numbers | `PREFIX-FYFY-NNNNN`, e.g. `INV-2627-00045`, gap-free for tax documents |
| Languages        | English at launch; every string through i18n for Bangla later          |

## Non-functional targets

| Area          | Target                                               |
| ------------- | ---------------------------------------------------- |
| API latency   | p95 < 500 ms                                         |
| Statements    | Full-year P&L and balance sheet < 5 s                |
| Scale         | 200 concurrent users, 5 M journal lines              |
| Availability  | 99.5% monthly                                        |
| Recovery      | RPO 15 min, RTO 4 h                                  |
| Security      | OWASP ASVS Level 2, external pen test before go-live |
| Accessibility | WCAG 2.1 AA; usable at 360 px width                  |

# Module boundaries

**Ten modules, one rule: a module owns its data and exposes only a public API and events.** Breaking a boundary fails the build.

## Modules

| Module      | Owns                                                                      | Publishes (examples)                         |
| ----------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| core        | Company, users, roles, approvals, notifications, audit, files, numbering  | `approval.decided`, `user.deactivated`       |
| accounting  | Accounts, periods, journal, posting rules, bills, payments, bank, tax     | `journal.posted`, `period.locked`            |
| partners    | Partners, equity history, partner transactions, distribution runs         | `distribution.posted`                        |
| crm         | Leads, clients, opportunities, quotations, contracts, tenders, guarantees | `opportunity.won`, `tender.awarded`          |
| billing     | Invoices, receipts, credit notes                                          | `invoice.posted`, `receipt.posted`           |
| projects    | Projects, milestones, tasks, timesheets, fee agreements                   | `milestone.signed_off`, `timesheet.approved` |
| hr          | Employees, attendance, leave                                              | `employee.joined`, `attendance.month_closed` |
| payroll     | Salary structures, payroll runs, payslips, loans, PF                      | `payroll.locked`                             |
| procurement | Requisitions, POs, GRN, items, stock, assets                              | `goods.received`                             |
| reporting   | Read models and snapshots (rebuildable)                                   | —                                            |

## Rules

1. **Ownership.** Only the owning module writes its schema. Reporting reads through granted views.
2. **Public surface.** Other modules import only `modules/<name>/public/`: service interfaces, DTOs and event contracts.
3. **One money path.** Every money effect goes through `AccountingPublicApi.post(document)`. No module inserts journal lines.
4. **Downward dependencies.** reporting → business modules → accounting → core. Never upward, never sideways.
5. **Sideways flows are events** written to the outbox in the same transaction.
6. **Versioned events.** Consumers tolerate added fields; removals need a new version.
7. **Enforced in CI** by dependency-cruiser (`pnpm check:boundaries`).
8. **One approval path.** Documents are approved only through core. Core defines an `ApprovalHandler` interface in its `public/` folder; each module implements it and registers it by source type, so core calls the module without importing it ([ADR-0007](adr/0007-approvals-through-core.md)).

## Event flows

| Event                               | From        | To                         | Effect                                       |
| ----------------------------------- | ----------- | -------------------------- | -------------------------------------------- |
| `opportunity.won`                   | crm         | projects                   | Create project, milestones, billing plan     |
| `tender.awarded`                    | crm         | projects, procurement      | Create contract and project; track guarantee |
| `milestone.signed_off`              | projects    | billing                    | Draft invoice for finance                    |
| `timesheet.approved`                | projects    | payroll, billing           | Labour cost; T&M billing lines               |
| `employee.joined` / `employee.left` | hr          | payroll, core, procurement | Payroll record; user account; asset recovery |
| `attendance.month_closed`           | hr          | payroll                    | Lock payroll inputs                          |
| `goods.received`                    | procurement | accounting                 | Asset register entry; bill matching          |
| `journal.posted`                    | accounting  | reporting, partners        | Refresh balances and current accounts        |
| `period.locked`                     | accounting  | all                        | Block back-dated documents                   |

## Module template

```text
modules/<name>/
├─ public/          interfaces, DTOs, event contracts (the only importable folder)
├─ interface/       REST controllers, event consumers, job processors
├─ application/     use cases; one use case = one transaction; policy checks here
├─ domain/          entities, value objects, rules; no framework imports
└─ infrastructure/  repositories, outbox writer, adapters
```

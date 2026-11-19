# Data architecture

**One PostgreSQL 16 database, one schema per module. The ledger is the single financial truth: every balance is derived from journal lines, and every row change is audited by trigger.**

## Schemas

| Schema        | Owns (examples)                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`        | company, branch, department, user, role, approval_rule, approval_request, approval_action, notification, reminder_log, attachment, number_series  |
| `audit`       | audit_log (append-only, partitioned by month)                                                                                                     |
| `accounting`  | account, fiscal_period, journal_entry, journal_line, posting_rule, vendor_bill, payment, bank_account, statement_line, tax_code, withholding_rule |
| `partners`    | partner, equity_history, partner_transaction, distribution_run                                                                                    |
| `crm`         | lead, client_account, opportunity, quotation, contract, tender, tender_document, guarantee                                                        |
| `billing`     | sales_invoice, receipt, receipt_allocation, credit_note                                                                                           |
| `projects`    | project, milestone, task, timesheet, fee_agreement, project_budget_line                                                                           |
| `hr`          | employee, attendance_record, leave_type, leave_balance, leave_request                                                                             |
| `payroll`     | salary_structure, payroll_run, payslip, loan, pf_account                                                                                          |
| `procurement` | requisition, purchase_order, goods_receipt, item, stock_move, asset, depreciation_entry                                                           |
| `reporting`   | materialised views, monthly balance snapshots                                                                                                     |
| `outbox`      | outbox_event, processed_event                                                                                                                     |

## Ledger tables

```sql
-- Simplified; the real migration adds company_id, audit columns and indexes.
CREATE TABLE accounting.journal_entry (
  id               uuid PRIMARY KEY,
  entry_no         text NOT NULL UNIQUE,          -- JE-2627-00413
  entry_date       date NOT NULL,
  period_id        uuid NOT NULL REFERENCES accounting.fiscal_period(id),
  source_type      text NOT NULL,                 -- vendor_bill, receipt, payroll_run …
  source_id        uuid,
  status           text NOT NULL CHECK (status IN ('posted','reversed')),
  reversal_of_id   uuid REFERENCES accounting.journal_entry(id),
  idempotency_key  text NOT NULL UNIQUE,
  posted_at        timestamptz NOT NULL DEFAULT now(),
  posted_by        uuid NOT NULL
);

CREATE TABLE accounting.journal_line (
  id              uuid PRIMARY KEY,
  entry_id        uuid NOT NULL REFERENCES accounting.journal_entry(id),
  account_id      uuid NOT NULL REFERENCES accounting.account(id),
  debit           bigint NOT NULL DEFAULT 0 CHECK (debit  >= 0),   -- poisha
  credit          bigint NOT NULL DEFAULT 0 CHECK (credit >= 0),
  currency        char(3) NOT NULL DEFAULT 'BDT',
  fx_rate         numeric(18,6) NOT NULL DEFAULT 1,
  project_id      uuid, department_id uuid, cost_center_id uuid,
  employee_id     uuid, partner_id uuid, contact_id uuid,
  CHECK ((debit = 0) <> (credit = 0))            -- exactly one side per line
);
```

**Database-enforced rules**

1. A deferred constraint trigger rejects any entry whose debits ≠ credits at commit.
2. A trigger rejects inserts dated in a locked period, and any UPDATE or DELETE of posted rows.
3. Dimension columns are real foreign keys, never a polymorphic `entity_type/entity_id` pair.
4. The application role has no UPDATE or DELETE on `journal_*` or `audit.*`.

## Audit

- A generic trigger on every business table writes table, row id, action, changed fields (old/new JSONB), user id and request id (`SET LOCAL app.user_id`, `app.request_id` per transaction).
- Each row stores `prev_hash` and `hash = sha256(prev_hash || row)`; a nightly job verifies the chain and pages on failure.
- Partitioned by month; archived to cold storage after 24 months, never deleted.

## Conventions

| Topic             | Rule                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| Keys              | UUIDv7; human numbers from the numbering service                                                              |
| Tenancy           | `company_id` on every table; row-level security as a second defence                                           |
| Audit columns     | `created_at/by`, `updated_at/by`, `version` (optimistic locking)                                              |
| Deletes           | Soft delete (`deleted_at`) for master data; never for financial or HR records                                 |
| Effective dating  | `valid_from` / `valid_to` with an exclusion constraint against overlaps                                       |
| Money             | `BIGINT` poisha; conversion only at API edges                                                                 |
| Sensitive columns | Bank account, NID, salary: application-level envelope encryption (KMS); only hashes indexed                   |
| Migrations        | Forward-only reviewed SQL; expand-then-contract for breaking changes; run by CI before the new version starts |

## Reporting and growth

| Need                 | Approach                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Fast balances        | `reporting.account_balance_monthly` per account, period and dimension, refreshed after posting and nightly |
| Heavy reports        | Read replica; statements = snapshots + current-month lines                                                 |
| > 10 M journal lines | Partition `journal_line` by fiscal year                                                                    |
| Search               | PostgreSQL full-text + trigram; Meilisearch only if needed                                                 |

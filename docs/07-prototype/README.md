# Prototype (POC v2)

**[pitchforge-erp-poc.html](pitchforge-erp-poc.html) is a complete, clickable proof of concept running on a real double-entry ledger in the browser.** It is the visual and behavioural reference for Phase 1. It is not production code.

## Open it

Double-click the file, or open it in Chrome, Edge, Firefox or Safari. No server or install needed. Fonts load from Google Fonts when online and fall back to system fonts offline.

## What to try

| Role (top-right) | Try this |
| --- | --- |
| Partner | Approvals → CloudNest bill → **Approve and post**; see the journal entry, the dashboard and the reports change |
| Partner | Your own drawing request is blocked (segregation of duties); use **Simulate approval** to finish it |
| Finance | Payables → tick bills → **Pay selected** (TDS/VDS withheld) → reconciliation → post bank charges |
| Finance | Journal → open an entry → **Reverse**; the source invoice or bill reopens |
| PM | Approve timesheets and leave; sign off a milestone and watch a draft invoice appear for Finance |
| Employee | Check in, apply for leave, submit an expense, view a payslip; finance menus disappear |
| Any | Administration → lock October, then try posting into it |

## Limits

- Data lives in the browser tab only; reload or **Reset sample data** restores the sample company.
- Tax rates, salary tax and leave days are sample values.
- No real authentication, email, file storage or server; those arrive in Phases 1–2.

## How it maps to the real build

| Prototype | Real system |
| --- | --- |
| In-memory `GL` and `post()` | `accounting` module, posting engine, PostgreSQL with DB-enforced rules |
| `APPROVALS` and `ON_APPROVE` handlers | `core` approval engine + module use cases |
| Role switcher | Real login, 2FA and policy engine |
| Sample data | Mock Service Worker in Phase 1, real API in Phase 2 |

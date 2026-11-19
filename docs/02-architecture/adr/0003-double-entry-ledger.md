# ADR-0003: Double-entry ledger with one posting engine

- **Status:** Accepted
- **Date:** 03 Nov 2026
- **Deciders:** Partners, tech lead, accountant

## Context

The v1.0 SRS used a single-entry transaction list with editable statuses. That cannot produce a balance sheet, mixes workflow with books, and makes partner balances hard to explain.

## Decision

Accrual-based double-entry ledger. Business documents carry workflow; on approval, one posting engine applies a configurable posting rule and writes a balanced, immutable journal entry. Corrections are reversals linked to the original.

## Consequences

- Statements, project P&L and partner balances all derive from one ledger and always agree.
- Every new document type needs a posting rule and tests, reviewed by finance.
- Users never pick control accounts; the UI must explain postings in plain words (posting preview).

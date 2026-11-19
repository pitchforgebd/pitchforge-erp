# ADR-0007: Every approval decision goes through core

- **Status:** Accepted
- **Date:** 04 Nov 2026
- **Deciders:** Tech lead

## Context

Contracts v1 had two ways to approve. `POST /core/approvals/{id}:approve` handled claims, advances, drawings and manual journals, while vendor bills and payment runs also had their own `:approve` and `:reject`. Two paths mean the segregation-of-duties, multi-approver and idempotency checks must be kept identical in two places, and a new document type would have to choose one.

Approval, journal and outbound event must also commit in one transaction ([ADR-0001](0001-modular-monolith.md)), yet core sits at the bottom of the module layers and must never import accounting or any other module.

## Options considered

1. **Document endpoints only:** `/{document}/{id}:approve` in each module, each calling core. Matches the first draft of the money path, and the owning module controls the transaction. But every document type repeats approve, reject and return, and a forgotten check is a missing control. The inbox would also have to route by document type.
2. **Both:** the state before this decision. Most convenient for callers, and the worst for control.
3. **Core only, with handlers:** one set of commands on `/core/approvals/{id}`. Core runs the steps and calls a handler that the document's module registered, inside the same transaction.

## Decision

Option 3. `core.approve`, `core.reject` and `core.returnForChanges` are the only way to decide a document.

- A document with an approval step exposes `approvalId`, so its own page can decide through core too.
- Core's `public/` defines an `ApprovalHandler` interface for the outcomes: approved at the final step, rejected, returned. Modules implement it and register it by source type when they start.
- The core use case opens the transaction, records the step and, on the final decision, calls the handler. The handler runs the module's use case, including `AccountingPublicApi.post(document)`, in that transaction.
- Core imports only the interface. Dependencies still point down, so dependency-cruiser's rules are unchanged.
- `core.approve` may return `STEP_UP_REQUIRED`: the server decides per document type (payment runs and drawings need it).

## Consequences

- One place for segregation of duties, approver order, multi-approver rules and idempotency. A new document type registers a handler and writes no approval endpoint.
- One review dialog in the UI and simpler mock handlers.
- A contract test pins the list of decision commands to these three, and another requires `approvalId` on every document with a `pending_approval` status.
- Reading a URL no longer shows which document is being approved. Logs and the audit trail must record the source type and id.
- Phase 2 needs a small handler registry, and a start-up check that every source type used by an approval rule has a handler.
- A document with no approval step, such as a distribution run, keeps its own posting command.

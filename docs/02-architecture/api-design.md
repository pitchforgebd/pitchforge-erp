# API design

**One versioned REST API whose source of truth is Zod schemas in `packages/contracts`.** The same schemas generate OpenAPI, validate requests in the API, type the web client and drive the Phase 1 mock server, so frontend and backend cannot drift.

## Conventions

| Topic         | Convention                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base path     | `/api/v1/{module}/{resource}`, e.g. `/api/v1/accounting/vendor-bills`                                                                                            |
| Resources     | Plural, kebab-case, one level of nesting (`/projects/{id}/milestones`)                                                                                           |
| State changes | Explicit commands: `POST /vendor-bills/{id}:submit`, `:reverse`. Approvals have one path: `POST /core/approvals/{id}:approve`, `:reject`, `:return`, `:delegate` |
| Lists         | Cursor pagination `?limit=50&cursor=…`, filters as query params, `sort=-date`                                                                                    |
| Idempotency   | `Idempotency-Key` header required on every POST that moves money or sends messages; kept 24 h                                                                    |
| Concurrency   | `ETag` / `If-Match` with the row version; stale writes return 412                                                                                                |
| Errors        | RFC 9457 `application/problem+json` with a stable `code` (`PERIOD_LOCKED`, `SOD_VIOLATION`, `NOT_BALANCED`)                                                      |
| Money         | `{ "amount": "125000.00", "currency": "BDT" }` as a decimal string, never a float                                                                                |
| Dates         | Business dates `YYYY-MM-DD`; timestamps ISO 8601 UTC                                                                                                             |
| Permissions   | Each record returns `allowedActions: ["approve","reject"]`; the UI renders from it, the API still enforces                                                       |
| Long jobs     | Exports, imports, payroll runs return `202` with a job id; progress via polling or SSE                                                                           |
| Webhooks      | HMAC-signed, retried, with a delivery log                                                                                                                        |
| Versioning    | Additive changes in v1; breaking changes only in v2 with 6 months' overlap                                                                                       |

## Example contract

```ts
// packages/contracts/src/accounting/payables.ts (shortened)
export const VendorBill = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(), // BILL-2627-00187, issued on submit
    vendorId: Uuid,
    net: NonNegativeMoney,
    vat: NonNegativeMoney,
    gross: NonNegativeMoney, // calculated by the server
    dueDate: IsoDate,
    status: VendorBillStatus,
    approvalId: Uuid.nullable(),
    allowedActions: allowedActions(['update', 'submit', 'approve', 'reject', 'pay']),
    meta: AuditMeta,
  })
  .meta({ id: 'VendorBill' });

// packages/contracts/src/accounting/endpoints.ts
export const accountingEndpoints = defineEndpoints('accounting', {
  submitVendorBill: {
    method: 'POST',
    path: '/api/v1/accounting/vendor-bills/{id}:submit',
    summary: 'Send a bill for approval',
    featureIds: ['FIN-09'],
    params: IdParams,
    response: VendorBill, // carries approvalId
    errors: ['PERIOD_LOCKED', 'INVALID_STATE'],
  },
});
```

`defineEndpoints` enforces these conventions when the package loads, so a contract that breaks them cannot be built:

| Declared                        | Effect                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `movesMoney` or `sendsMessages` | Must be POST; requires the `Idempotency-Key` header; adds `IDEMPOTENCY_CONFLICT`                           |
| `params` on a write             | Requires `If-Match`; adds `STALE_VERSION`. `versioned: false` opts out where a row version does not apply. |
| `stepUp`                        | Adds `STEP_UP_REQUIRED`                                                                                    |
| Not `public`                    | Adds `UNAUTHENTICATED` and `FORBIDDEN`. Everything is denied unless it is marked public.                   |
| `body`, `query`                 | Must be strict, so unknown fields are rejected                                                             |
| `list`                          | Must use cursor pagination (`listQuery`)                                                                   |

Responses tolerate added fields; request bodies do not. Restricted fields use `restricted(schema, kind)`: they are optional, because the API omits them for a caller without the field permission, and OpenAPI marks them `x-restricted`.

## Contract change process

1. Change the schema in `packages/contracts` in its own pull request; the tech lead reviews.
2. Run `pnpm contracts:openapi` and commit `openapi/openapi.v1.json`. CI fails if it is out of date, and `pnpm contracts:diff` fails on breaking changes without a major version bump.
3. `pnpm contracts:coverage` fails if a Must feature of a finished module has no endpoint and no written deferral.
4. Update mock handlers (Phase 1) or API implementation (Phase 2) in follow-up pull requests.

See [packages/contracts/README.md](../../packages/contracts/README.md).

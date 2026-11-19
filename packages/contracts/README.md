# packages/contracts

**The single source of truth for the API.** Zod schemas for every entity, endpoint, command and error code; OpenAPI is generated from them.

Used by: the web client (types), the mock server (Phase 1), the API (request validation and contract tests, Phase 2).

Rules: contract changes go in their own `contract/…` pull request reviewed by the tech lead; CI fails on breaking changes without a major version bump; contracts are frozen at gate G1. See [API design](../../docs/02-architecture/api-design.md).

## Layout

| Path                      | What                                                                                                                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/`             | `Money` (decimal string on the wire, `toMoney` / `fromMoney` to the kernel), `IsoDate`, `Timestamp`, `Uuid`, `DocumentNo`, `Rate`, `Percent`, `Masked`; pagination; `Problem` (RFC 9457) with `ERROR_STATUS`; `AuditMeta`, `allowedActions()`, `restricted()`    |
| `src/endpoint.ts`         | `defineEndpoints()`: enforces the API conventions when the package loads                                                                                                                                                                                         |
| `src/{module}/`           | Schemas and `endpoints.ts` for each of the 10 backend modules. Tenders sit in `crm`, tax in `accounting`, self-service in `core` and `hr`.                                                                                                                       |
| `src/endpoint-helpers.ts` | `listOf`, `getOne`, `createOne`, `updateOne`, `command`: the common endpoint shapes                                                                                                                                                                              |
| `src/registry.ts`         | `ALL_ENDPOINTS`, `featureMap()`                                                                                                                                                                                                                                  |
| `src/deferred.ts`         | Finished module groups, and Must features with no endpoint and why                                                                                                                                                                                               |
| `src/version.ts`          | `CONTRACT_VERSION`, published as OpenAPI `info.version`                                                                                                                                                                                                          |
| `scripts/`                | OpenAPI generation, feature coverage, breaking-change diff. Run directly by Node 26.                                                                                                                                                                             |
| `openapi/openapi.v1.json` | Generated and committed, so API changes show up in review                                                                                                                                                                                                        |
| `fixtures/`               | One valid example per exported schema (the prototype's fictional company), hand-written invalid cases, and `sampleFor()`, which builds a fixed response from them for the mock server. Tests and `apps/web/mocks` only: a boundary rule keeps it out of screens. |

`src/` depends only on `zod` and the shared kernel (enforced by dependency-cruiser). The OpenAPI library is a dev dependency of the scripts.

## Add an endpoint

1. Add its schemas with `.meta({ id: 'Name' })` and export them.
2. Add it to the module's `defineEndpoints` with its `featureIds`.
3. Add a valid example to `fixtures/`, and invalid cases for any real rule. The mock server then answers the endpoint by itself.
4. Run `pnpm contracts:openapi` and commit the result.

A new module also joins `ALL_ENDPOINTS` in `src/registry.ts`, and its feature prefixes join `MODULE_GROUPS_DONE` in `src/deferred.ts` when it is finished.

## What the tests enforce

- Every exported schema accepts a valid example, fails without each required field, and (if strict) rejects unknown fields.
- Every endpoint follows the path, feature, error, idempotency and pagination conventions. The list of public endpoints is pinned.
- Every command that posts to the ledger is idempotent. Documents are decided only through core approvals, which declare `SOD_VIOLATION`, and every document with an approval step has `approvalId` (ADR-0007). A posted journal entry has no update or delete.
- A `number` is allowed only under a reviewed key, so an amount cannot slip in as a float.
- No response has a field named like a password, token, secret or hash. Sensitive response fields are restricted.
- The committed OpenAPI matches the code.
- In `apps/web`, every endpoint has a mock, and every mock reply matches its contract.

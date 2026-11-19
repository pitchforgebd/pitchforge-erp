# Cookie policy

**The app sets two strictly necessary cookies and nothing else: no analytics, no third-party cookies, and no tokens in browser storage.** Both are opaque ids; everything about the session stays on the server ([ADR-0004](../02-architecture/adr/0004-server-side-sessions.md)).

- **Status:** Draft for security owner approval (step 0.10)
- **Owner:** Security owner

## Cookies

| Name                | Set                                  | Lifetime                       | Holds                                |
| ------------------- | ------------------------------------ | ------------------------------ | ------------------------------------ |
| `__Host-pf_session` | After the password and 2FA both pass | 60 min idle, 12 h absolute     | Random session id, 256 bits          |
| `__Host-pf_partial` | After the password, before 2FA       | 5 min, removed once 2FA passes | Random id that only allows 2FA steps |

## Attributes

| Attribute        | Value    | Why                                                                                                     |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `__Host-` prefix | Required | The browser refuses it unless `Secure`, `Path=/` and no `Domain`                                        |
| `HttpOnly`       | Yes      | Scripts cannot read it, so an injected script cannot steal it                                           |
| `Secure`         | Yes      | Sent over HTTPS only                                                                                    |
| `SameSite`       | `Lax`    | Not sent on cross-site POSTs. `Lax` lets a link from an email open a signed-in page; `Strict` would not |
| `Path`           | `/`      | Required by the prefix                                                                                  |
| `Domain`         | Not set  | The cookie stays on the exact host, and never reaches a subdomain                                       |

## CSRF

**No separate CSRF token.** The BFF ([forward.ts](../../apps/web/lib/api/forward.ts)) refuses a non-GET request unless it carries `Sec-Fetch-Site: same-origin` and an `Origin` that matches the host. Browsers set both headers and scripts cannot forge them. `SameSite=Lax` is the second layer.

This replaces the token in the first plan. The security owner should confirm this choice: it relies on browsers sending `Sec-Fetch-Site`, which all supported browsers do, and the BFF refuses a write that lacks it.

Only the BFF reaches the API, so the API sees no browser requests directly.

## Timeouts and revocation

| Event                                      | Result                                        |
| ------------------------------------------ | --------------------------------------------- |
| 60 minutes without a request               | Session ends; the user signs in again         |
| 12 hours after sign-in                     | Session ends, whatever the activity           |
| Sign-out                                   | Session deleted on the server; cookie cleared |
| Password change, role change, deactivation | All the user's sessions are revoked           |
| Admin forces sign-out                      | The chosen sessions are revoked               |

Session ids are rotated at sign-in and at step-up, so an id seen before authentication is worthless afterwards.

## How this is checked

| Check                                                   | Where                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Nothing sensitive in `localStorage` or `sessionStorage` | `apps/web/tests/e2e/security.spec.ts`, Semgrep rule `pitchforge.no-browser-storage` |
| Cross-site writes are refused                           | `apps/web/lib/api/api.test.ts`                                                      |
| Cookie attributes in the API                            | To add with sessions, in Phase 2 step B1                                            |

The mock API sets these cookies with the same attributes, but its values are fixed role names, not random ids. Real session ids, timeouts and revocation arrive in Phase 2 step B1.

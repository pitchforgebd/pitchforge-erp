# Threat model

**Method: STRIDE over the main assets.** Reviewed at every gate and whenever a new module, integration or data type is added.

## Assets

| Asset                              | Why it matters                         |
| ---------------------------------- | -------------------------------------- |
| Ledger and journal                 | Determines profit, partner shares, tax |
| Bank, cash and payment runs        | Money leaves the company here          |
| Salaries, NID, bank details        | Most sensitive personal data           |
| Partner balances and drawings      | Disputes between owners                |
| Client contracts, tenders, pricing | Commercial secrets                     |
| Credentials and sessions           | Key to everything else                 |
| Audit log                          | Proof of what happened                 |

## Threats and controls

| #   | STRIDE                  | Threat                                                    | Control                                                                                                                            | Residual risk |
| --- | ----------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| T1  | Spoofing                | Stolen password used on a finance account                 | Mandatory TOTP, new-device alert, step-up for sensitive actions                                                                    | Low           |
| T2  | Spoofing                | Phishing page imitating the login                         | TOTP, user training, HSTS preload, single known domain                                                                             | Medium        |
| T3  | Tampering               | Insider edits a past payment to hide fraud                | Immutable journal (DB triggers), reversal-only corrections, hash-chained audit                                                     | Low           |
| T4  | Tampering               | Back-dated entry into a closed month                      | Period lock enforced by the database; reopen needs a Partner and is alerted                                                        | Low           |
| T5  | Tampering               | Double-clicked or replayed payment                        | Idempotency keys; payment run status machine                                                                                       | Low           |
| T6  | Repudiation             | "I never approved that"                                   | Approval actions with user, time, IP, device in the audit log; step-up auth                                                        | Low           |
| T7  | Information disclosure  | Employee sees colleagues' salaries via search or export   | Policies compiled to SQL for every read path; field omission in the API                                                            | Low           |
| T8  | Information disclosure  | IDOR: changing an ID in the URL shows another record      | Policy check on every record load; UUIDs; access tests per role                                                                    | Low           |
| T9  | Information disclosure  | Secrets leaked in repo, logs or frontend bundle           | Gitleaks, log masking, bundle secret check, secret manager                                                                         | Low           |
| T10 | Information disclosure  | Malicious file uploaded as a receipt                      | Type checks, ClamAV quarantine, attachment-only download                                                                           | Low           |
| T11 | Denial of service       | Login brute force or expensive report spam                | WAF, rate limits, report timeouts, async exports                                                                                   | Medium        |
| T12 | Elevation of privilege  | User approves own expense or drawing                      | Segregation-of-duties rule in the approval engine                                                                                  | Low           |
| T13 | Elevation of privilege  | Compromised dependency                                    | Lockfile, audit gate, minimal dependencies, Renovate review                                                                        | Medium        |
| T14 | Elevation of privilege  | Leaked database credential                                | Private network, least-privilege roles, rotation, audit table not writable                                                         | Low           |
| T15 | Frontend-first specific | Business rules copied into the UI and trusted             | Rule: mocks return fixed results; backend recomputes everything; code review                                                       | Low           |
| T16 | Elevation of privilege  | Malicious code in a CI action or a build script           | Actions pinned to SHAs, install scripts denied by default, 7-day release cooldown, read-only workflow token                        | Medium        |
| T17 | Tampering               | Change merged without review                              | Ruleset: 2 approvals, code owners, required checks, signed commits, no bypass                                                      | Low           |
| T18 | Information disclosure  | Mock mode reaches production and serves fake data as real | Production image is built with no mock code; `API_MODE=mock` is refused there; `check-images.mjs` proves it in CI                  | Low           |
| T19 | Information disclosure  | Staging on the mock API is reachable from the internet    | Fictional data only, so nothing real can leak; WAF and TLS as in production. Decide before staging opens whether to limit it by IP | Low           |
| T20 | Elevation of privilege  | Someone reaches the API directly, skipping the BFF checks | The API runs in private subnets with no load balancer path; only the web tasks can reach it; every route has a policy              | Low           |
| T21 | Tampering               | Cross-site request made with the session cookie           | BFF refuses non-GET requests without same-origin `Sec-Fetch-Site` and a matching `Origin`; `SameSite=Lax`                          | Low           |
| T22 | Spoofing                | Stolen session cookie                                     | `__Host-` cookie, `HttpOnly`, `Secure`, server-side sessions, idle and absolute timeouts, revocation, strict CSP                   | Low           |
| T23 | Denial of service       | Forged `X-Forwarded-For` escapes the rate limit           | `TRUSTED_PROXY_HOPS` counts only our own proxies; the WAF limits by the address it sees                                            | Low           |
| T24 | Elevation of privilege  | A new API route is added and forgotten by the policy      | Global deny-by-default guard, and the API refuses to start with a route that has no policy                                         | Low           |

## Review log

| Date        | Change                                                                                                                       | Reviewer                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 03 Nov 2026 | Version 1                                                                                                                    | Security owner          |
| 06 Nov 2026 | Draft v1.1: T16 to T24 cover CI and the supply chain, mock mode on staging, the BFF, the cookie session and the API skeleton | Pending: security owner |

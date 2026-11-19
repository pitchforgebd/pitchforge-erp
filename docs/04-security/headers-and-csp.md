# Security headers and Content-Security-Policy

**Every page gets a fresh CSP nonce and a strict policy: no `unsafe-inline`, no `unsafe-eval`, and nothing loads from another origin.** The code is `apps/web/lib/security/headers.ts`, applied by `apps/web/proxy.ts`. Unit tests and Playwright specs check it on the production build.

- **Status:** Draft for security owner approval (step 0.10)
- **Owner:** Security owner

## Headers

| Header                       | Value                                                          | Why                                                                                              |
| ---------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Content-Security-Policy`    | See below                                                      | Stops injected scripts                                                                           |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains`                          | HTTPS only, for 2 years                                                                          |
| `X-Content-Type-Options`     | `nosniff`                                                      | No MIME sniffing                                                                                 |
| `X-Frame-Options`            | `DENY`                                                         | Clickjacking, for older browsers                                                                 |
| `Referrer-Policy`            | `no-referrer`                                                  | Record URLs do not leak                                                                          |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Off until a feature needs them. The PWA receipt camera and attendance location will change this. |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                  | Isolates the window                                                                              |

`X-Powered-By` is off.

## Content-Security-Policy

| Directive         | Value                                                |
| ----------------- | ---------------------------------------------------- |
| `default-src`     | `'self'`                                             |
| `script-src`      | `'self' 'nonce-{random}' 'strict-dynamic'`           |
| `style-src`       | `'self' 'nonce-{random}'`                            |
| `img-src`         | `'self' data:`                                       |
| `font-src`        | `'self'` (fonts are self-hosted through `next/font`) |
| `connect-src`     | `'self'`                                             |
| `object-src`      | `'none'`                                             |
| `base-uri`        | `'self'`                                             |
| `form-action`     | `'self'`                                             |
| `frame-ancestors` | `'none'`                                             |

The development server adds `'unsafe-eval'`, inline styles and a hot-reload WebSocket. A production build never has these.

## What this rules out for the code

| Thing                                                  | Why                                           | Instead                                                                    |
| ------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------- |
| Libraries that inject `<style>` with no nonce (sonner) | Blocked                                       | Radix Toast                                                                |
| Server-rendered `style=""` attributes                  | Blocked. Styles set from JavaScript are fine. | Tailwind classes, or render on the client                                  |
| `eval` and `new Function`                              | Blocked                                       | Zod runs with `jitless: true` (`packages/contracts/src/zod-config.ts`)     |
| Radix scroll lock                                      | Adds a `<style>`                              | Allowed with the nonce, through `get-nonce` (`features/app-providers.tsx`) |

## API

The API answers only the BFF, but it sends helmet's default headers anyway, including `Strict-Transport-Security`, `X-Content-Type-Options: nosniff` and a `default-src 'self'` policy. `X-Powered-By` is off, and `apps/api/src/app.test.ts` checks these. Its responses are JSON, so the web app's nonce policy does not apply.

## CSRF

Cookie-authenticated writes are protected in the BFF (`apps/web/lib/api/forward.ts`): a non-GET request must carry `Sec-Fetch-Site: same-origin` and an `Origin` matching the host. Browsers set both and scripts cannot forge them. The session cookie is also `SameSite=Lax`. No separate token is used.

## Evidence

- `apps/web/tests/e2e/security.spec.ts` runs on the production build: headers, a new nonce per response, a whole journey with no violation, an injected script blocked while a nonced one runs, no browser storage, HTTP-only cookies, and cross-site writes refused.
- The external header scan needs staging (step 0.9, Q6).

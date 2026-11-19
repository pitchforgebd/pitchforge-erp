# apps/web

Next.js (App Router) user interface and thin backend-for-frontend. **Screens are built in Phase 1 against the mock API; progress is in [phase 1](../../docs/03-development-phases/phase-1-frontend.md#progress).** Mocks serve the prototype's fictional records and leave out restricted fields by role, so each sample user sees what the real API will send them. It holds no database credentials and no business rules.

- Architecture: [frontend architecture](../../docs/02-architecture/frontend-architecture.md), [ADR-0008](../../docs/02-architecture/adr/0008-mock-transport-in-the-bff.md)
- Security: [headers and CSP](../../docs/04-security/headers-and-csp.md)
- Visual reference: [prototype](../../docs/07-prototype/README.md)

## Run it

```bash
pnpm dev                 # http://localhost:3000, mock mode, no setup needed
pnpm test:e2e            # production build + Playwright (first: pnpm --filter @pitchforge/web exec playwright install chromium)
pnpm check:bundle        # after pnpm build: no mock code, sample data or secrets in the client bundle
```

Sample sign-ins in mock mode (any password; any 6-digit code except `000000`):

| Email                        | Result                  |
| ---------------------------- | ----------------------- |
| `farhana@pitchforge.example` | Partner, every section  |
| `rafiq@pitchforge.example`   | Finance                 |
| `nusrat@pitchforge.example`  | Project manager         |
| `arif@pitchforge.example`    | Employee                |
| `sadia@pitchforge.example`   | Must enrol in 2FA       |
| `locked@pitchforge.example`  | Account locked          |
| Anything else                | Wrong email or password |

## Environment

| Variable           | Default                                         | Meaning                                                                   |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `API_MODE`         | `mock` outside production, `real` in production | Server-side only                                                          |
| `API_REAL_MODULES` | empty                                           | Modules on the real API while the rest stay mocked: `accounting,partners` |
| `API_URL`          | `http://localhost:4000`                         | The NestJS API                                                            |
| `ALLOW_MOCK_API`   | `false`                                         | Needed for mock mode in a production build. Staging only.                 |

## Layout

| Path                           | What                                                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `proxy.ts`                     | CSP nonce and security headers on every response; sends visitors with no session to login                                        |
| `instrumentation.ts`           | Validates the environment at start-up; starts mock mode                                                                          |
| `app/(auth)/`, `app/(app)/`    | Sign-in pages; the signed-in shell and sections                                                                                  |
| `app/bff/v1/[...path]/`        | Backend-for-frontend                                                                                                             |
| `features/`                    | Screens and components per area                                                                                                  |
| `lib/api/`                     | Typed client built from the contracts; `browser.ts` for client code, `server.ts` for server components, `forward.ts` for the BFF |
| `lib/config/`, `lib/security/` | Environment validation; security headers                                                                                         |
| `messages/`                    | All user-facing text (next-intl)                                                                                                 |
| `mocks/`                       | MSW handlers and sample data. Never imported by app code.                                                                        |
| `tests/e2e/`                   | Playwright specs: auth, security, accessibility                                                                                  |

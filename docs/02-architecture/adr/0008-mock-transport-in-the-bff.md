# ADR-0008: Mock API inside the backend-for-frontend

- **Status:** Accepted
- **Date:** 06 Nov 2026
- **Deciders:** Tech lead

## Context

Phase 1 builds every screen against a mock API ([ADR-0002](0002-frontend-first-contract-first.md)). The first design ran Mock Service Worker in the browser, switched by `NEXT_PUBLIC_API_MODE`. That cannot exercise HTTP-only cookies, puts mock code and sample data in the client bundle, and needs a service worker that the strict Content-Security-Policy must allow.

## Options considered

1. **MSW service worker in the browser:** the common setup. But no real cookies, mock code ships to the browser, and server components cannot use it.
2. **A separate mock HTTP server:** realistic, but one more process in development, CI and staging.
3. **MSW in the Next.js server process:** the browser always calls the same-origin BFF; the BFF and server components call `API_URL`; in mock mode MSW intercepts those calls.

## Decision

Option 3.

- The browser talks only to `/bff/v1/*`, which forwards known contract endpoints to `API_URL`.
- `instrumentation.ts` starts MSW when `API_MODE=mock`. The mode is server-side only: there is no `NEXT_PUBLIC_API_MODE`.
- `API_REAL_MODULES=accounting,partners` switches modules to the real API one at a time.
- A production build refuses `API_MODE=mock` unless `ALLOW_MOCK_API=true`, which only staging sets.
- `pnpm check:bundle` fails if mock code or sample data reaches the client bundle, and a boundary rule stops app code importing `mocks/`.

## Consequences

- Sessions, cookies and the BFF run the same way in mock and real mode, so switching to the real API changes no UI code.
- Storybook uses plain props, so it needs no mock transport for now. Data stories would add MSW's browser worker in Storybook only.
- Mock code is in the server image on staging. Production never starts it: a build with `BUILD_WITHOUT_MOCKS=true` holds no mock code at all, and that image refuses `API_MODE=mock`.
- A mock that breaks its contract throws, so screens cannot be built on a shape the API will not send.
- Endpoints with no hand-written handler answer from `@pitchforge/contracts/fixtures`. These replies are fixed: they ignore filters and ids, keep no state, and do not hide restricted fields by role. A screen that needs more gets a hand-written handler, still with no business rules.

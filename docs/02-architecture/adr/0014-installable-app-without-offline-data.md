# ADR-0014: Installable app without offline data

- **Status:** Proposed
- **Date:** 20 Nov 2026
- **Deciders:** Partners, security owner

## Context

UX-04 asks for an installable app with push notifications, and UX-05 for quick actions on a phone (check in, approve, claims). A service worker is the usual way to make a web app installable and to cache it for offline use. This app shows salaries, bank details, partner balances and the ledger. Anything a service worker caches stays on the device after sign-out, outside the server's access control and the audit log.

## Options considered

1. **Full PWA with an offline cache:** works without a connection, but personal and financial data is left on phones, including lost or shared ones.
2. **Service worker that caches only the app shell:** small benefit for this app, but every change to the worker needs a security review, and mistakes cache API answers.
3. **Manifest only, no service worker, for now:** the app installs on Android and desktop and opens full screen with its quick actions. It needs a connection, like the web version. Push waits for Phase 2.

## Decision

Option 3. `app/manifest.ts` describes the app, its icon and four shortcuts (check in, request leave, approvals, expense claims). There is no service worker in Phase 1. The manifest and icon are public paths, because browsers fetch them without cookies, and hold no data.

## Consequences

- Nothing about a person or the books is ever stored on the device by the app.
- No offline use. A screen without a connection shows the browser's offline page.
- Push (UX-04) is deferred to Phase 2. It will need a service worker that handles `push` only, never `fetch`, plus a review against the secure coding checklist, recorded as a new ADR.

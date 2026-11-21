# ADR-0018: Capabilities for collection actions

- **Status:** Accepted
- **Date:** 21 Nov 2026
- **Deciders:** Partners, security owner

## Context

Buttons on a record come from its `allowedActions`, which the API fills per user. Actions that
belong to no record yet, such as "New employee", "Close the year" or "New equity version", had
nothing to go by. Screens fell back on `admin.read`, as a stand-in for "is a partner". That breaks as
soon as real roles exist: the access-control matrix gives Finance and the Auditor read access to
settings, so they would see buttons they cannot use, while HR or a procurement officer would lose
buttons they may use.

## Options considered

1. **Role names in the session:** simple, but the UI would hard-code which role may do what, which
   the matrix forbids (permissions belong to roles, not to code).
2. **`canCreate` on each list response:** precise, but only covers "new"; it does not help with
   year close or dashboards, and every list grows a field.
3. **Capability codes in `CurrentSession.permissions`:** the session already lists `<area>.read`
   codes for navigation. Add codes for collection actions, filled by the server from the
   person's roles.

## Decision

Option 3. Capability codes: `admin.manage`, `crm.manage`, `hr.manage`, `ledger.close`,
`partners.manage`, `payroll.manage`, `procurement.manage`, `projects.create`, and
`dashboard.<kind>` for each home dashboard a person may open. The web app asks
`useCan(code)`; record actions still come from `allowedActions`.

## Consequences

- No screen reads `admin.read` to guess a role.
- The server must fill these codes from role grants in Phase 2; the mocks list them per sample user.
- A code only shapes the screen. Every call is still authorised on the server.

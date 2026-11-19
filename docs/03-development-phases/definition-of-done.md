# Definition of done

A task, story or pull request is done only when every applicable item is true.

## All work

- [ ] Linked to a feature ID; acceptance criteria met
- [ ] Code reviewed and approved (two reviewers for accounting, payroll, partners, auth, infra)
- [ ] CI green: lint, types, tests, boundaries, contract diff, secret scan, dependency audit
- [ ] No secrets, real personal data or real financial data in code, fixtures, logs or screenshots
- [ ] Docs, ADR or runbook updated if behaviour or architecture changed

## Frontend

- [ ] Uses the typed client from `packages/contracts`; no hand-written API types
- [ ] Loading, empty, error, no-permission and success states
- [ ] Works at 360 px and with keyboard only; passes axe checks
- [ ] Strings through i18n; money via `<Money>`; dates `DD MMM YYYY`
- [ ] Storybook story for new components; Playwright test for new journeys
- [ ] No business calculation in the browser

## Backend

- [ ] Matches the contract; contract test passes
- [ ] Authorisation enforced in the use case; policy test for each role
- [ ] Input validated with the contract schema; parameterised SQL only
- [ ] Money as poisha via `Money`; posting only through the posting engine
- [ ] Idempotency key on money-moving or message-sending commands
- [ ] Audit trail verified for the changed tables
- [ ] Unit tests for domain rules; integration test against a real PostgreSQL
- [ ] Migrations reviewed, forward-only, tested on a copy of staging data

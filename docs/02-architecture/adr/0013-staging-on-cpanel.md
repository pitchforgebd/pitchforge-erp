# ADR-0013: Staging on cPanel shared hosting, mock mode only

- **Status:** Accepted
- **Date:** 19 Nov 2026
- **Deciders:** Partners, tech lead

## Context

Gate G0 needs a staging site over HTTPS with an A header grade, so the Partners can review screens as they are built. The plan put staging on AWS (step 0.9), but the AWS account, region and domain (Q6) are not ready, and the company already has cPanel shared hosting with Node.js apps (Passenger), SSH, 4 GB of memory and Node 24.19.0.

In Phase 0 and Phase 1 staging runs only the web app on the mock API: there is no database, cache, API or worker to host yet.

## Options considered

1. **Wait for AWS:** matches the plan, but G0 waits on Q6.
2. **A VPS with the Docker Compose stack:** close to production and ready for the backend, but one more server to run before it is needed.
3. **cPanel shared hosting:** already paid for, enough for one Node.js process, and HTTPS through AutoSSL.

## Decision

Option 3, for the mock-mode web app only:

- `pnpm build:cpanel` packs the Next.js standalone build into one folder with a flat `node_modules` and no symlinks (`dist/cpanel/pitchforge-web.tar.gz`).
- cPanel runs it on Node 24.19.0 with `API_MODE=mock` and `ALLOW_MOCK_API=true`. The guide is [cpanel-staging.md](../../05-engineering/cpanel-staging.md).
- **No real data is stored on shared hosting.** Restricted data never leaves production ([data classification](../../04-security/data-classification.md)), and a shared server has no private network, field encryption keys or secret manager.
- When the backend arrives in Phase 2, staging moves to a VPS or to AWS. The Terraform in `infra/terraform` stays as written, unapplied.

## Consequences

- G0's header scan runs against the cPanel subdomain.
- The build runs on Node 26 and staging runs on Node 24. Next.js supports both, and the package is tested on 24.19.0 before upload. The API and worker still need Node 26 and do not run here.
- Passenger may stop an idle app, so the first request after a quiet spell is slow.
- Other customers share the server, so staging holds only the fictional sample data. Partners who want to test with real records do that on the VPS or AWS staging in Phase 2.
- Staging should be closed to the public with cPanel Directory Privacy until G1.

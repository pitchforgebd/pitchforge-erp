# Phase 0 · Foundation and contracts

**Weeks 1–4. Goal: everything the frontend needs to start and nothing it has to redo later: the repository, the pipeline, the design system, a contract for every module and a security baseline.**

## Deliverables

| #    | Deliverable                                                                                                            | Owner                | Done when                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| 0.1  | Monorepo (pnpm, Turborepo, strict TypeScript, ESLint, Prettier) with `apps/` and `packages/` as in the README          | Tech lead            | `pnpm build` and `pnpm test` pass on a clean clone                  |
| 0.2  | CI: lint, types, tests, boundaries, contract diff, gitleaks, dependency audit, static analysis                         | Tech lead            | Pipeline blocks a PR with a planted secret and a vulnerable package |
| 0.3  | Branch protection: required checks, required reviews, CODEOWNERS, signed commits                                       | Tech lead            | Direct push to `main` is impossible                                 |
| 0.4  | `packages/shared-kernel`: Money (poisha), IDs, dates (Asia/Dhaka), document numbers, error types                       | Backend              | 100% unit-tested                                                    |
| 0.5  | **`packages/contracts` v1 for all 13 modules**: entities, list/detail/command endpoints, error codes, `allowedActions` | Backend + BA         | Reviewed against the feature list; OpenAPI generated                |
| 0.6  | Mock server (MSW) scaffold, seeded with the prototype's sample data                                                    | Frontend             | Login → home works in mock mode                                     |
| 0.7  | Design system: tokens (colour, type, spacing), light/dark, core components in Storybook                                | Frontend + designer  | Buttons, inputs, tables, dialogs, toasts, pills, money, date        |
| 0.8  | Database ERD draft and chart of accounts template                                                                      | Backend + accountant | Signed by the accountant                                            |
| 0.9  | Infrastructure: Terraform for staging, Docker Compose for local, secrets in a secret manager                           | DevOps               | Staging serves the web app in mock mode over HTTPS                  |
| 0.10 | Security baseline: headers and CSP, cookie policy, threat model v1, data classification, secure coding checklist       | Security owner       | Documents in `docs/04-security` approved                            |

## Gate G0

- [ ] Partners and tech lead have reviewed contracts v1
- [ ] CI is green and blocks secrets and vulnerable dependencies
- [ ] Staging is reachable only over HTTPS with security headers (A grade on a header scanner)
- [ ] Chart of accounts and approval thresholds are agreed (SRS open questions 1, 2, 4, 5)

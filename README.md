# Pitchforge ERP

One internal system that runs Pitchforge Partners end to end: sales and tenders, projects, accounting on a double-entry ledger, partner equity, HR and payroll, procurement and assets.

> **Status:** Phase 0 · Foundation (in progress: steps 0.1–0.10 built; sign-offs, CI run and staging pending) · **Owner:** Pitchforge Partners · **Classification:** Confidential, internal

## Start here

| If you are…                    | Read first                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A partner or stakeholder       | [Project overview](docs/00-project-overview.md) → [Roadmap](docs/03-development-phases/roadmap.md)                                                                                         |
| A developer joining the team   | [Architecture overview](docs/02-architecture/architecture-overview.md) → [Coding standards](docs/05-engineering/coding-standards.md) → [Git workflow](docs/05-engineering/git-workflow.md) |
| Reviewing security             | [Security architecture](docs/04-security/security-architecture.md) → [Threat model](docs/04-security/threat-model.md)                                                                      |
| Starting work with Claude Code | [CLAUDE.md](CLAUDE.md) → [Claude Code playbook](docs/05-engineering/claude-code-playbook.md)                                                                                               |
| Wanting to see the product     | Open [the prototype](docs/07-prototype/pitchforge-erp-poc.html) in a browser                                                                                                               |

Full documentation index: [docs/README.md](docs/README.md)

## How we build it

1. **Contracts first.** Every API is defined as Zod schemas in `packages/contracts` before anyone writes UI or backend code.
2. **Frontend first.** The whole UI is built and signed off against a mock API that serves those contracts (Phase 1).
3. **Backend second.** The backend implements the same contracts module by module; the UI switches from mock to real without changes (Phase 2).
4. **Security from day one.** Security gates apply to every phase, not only before go-live.

## Repository layout

```text
pitchforge-erp/
├─ apps/
│  ├─ web/              Next.js UI and backend-for-frontend          (Phase 1)
│  ├─ api/              NestJS REST API, one module per domain       (Phase 2)
│  └─ worker/           Queues, scheduler, outbox relay, PDFs        (Phase 2)
├─ packages/
│  ├─ contracts/        Zod schemas + OpenAPI: the single API source (Phase 0)
│  ├─ ui/               Design system components                     (Phase 0–1)
│  ├─ shared-kernel/    Money, IDs, dates, errors                    (Phase 0)
│  └─ config/           ESLint, TypeScript, test presets             (Phase 0)
├─ db/                  Migrations, seeds, chart-of-accounts template (Phase 2)
├─ infra/               Terraform and Docker                          (Phase 0, 3)
├─ scripts/             Developer and CI scripts
└─ docs/                Requirements, architecture, phases, security, engineering, operations, prototype
```

## Tech stack

TypeScript · Next.js · NestJS · PostgreSQL 16 · Redis + BullMQ · S3-compatible storage · Docker · Terraform · GitHub Actions. Reasons are in the [architecture decision records](docs/02-architecture/adr/README.md).

## Security

Do not open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).

---

Proprietary and confidential. © 2026 Pitchforge Partners. All rights reserved. See [LICENSE.md](LICENSE.md).

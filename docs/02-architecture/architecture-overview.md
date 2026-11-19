# Architecture overview

**Pitchforge ERP is a modular monolith in TypeScript: a Next.js web app, a NestJS API and NestJS workers, sharing one PostgreSQL database with one schema per module.** A single posting engine writes every financial effect to an immutable double-entry ledger. One database transaction can therefore cover the approval, the journal and the outbound event, which matters more for an ERP than independent scaling.

Full rationale: [ADR-0001](adr/0001-modular-monolith.md). Detailed version: _Software Architecture Document v1.0_.

## 1. System context

```mermaid
flowchart LR
  subgraph People
    P[Partners]
    F[Finance and HR]
    PM[PMs and engineers]
    S[Sales and tender team]
    C[Clients · later]
  end
  ERP((Pitchforge ERP))
  subgraph External
    E[Email service]
    SMS[SMS gateway]
    B[Banks · statement and salary files]
    BIO[Biometric devices · file import]
    SSO[Google / Microsoft SSO · later]
  end
  P & F & PM & S & C --> ERP
  ERP --> E & SMS & B & BIO & SSO
```

No external service is on the critical path for recording money. If email or SMS is down, work continues and messages queue.

## 2. Containers

```mermaid
flowchart TB
  U[Browsers and PWA] -->|HTTPS| LB[Load balancer + WAF]
  LB --> WEB[Web app · Next.js<br/>screens + BFF<br/>no DB access]
  LB -->|integration tokens| API
  WEB -->|REST + session| API[API · NestJS<br/>10 modules, policies,<br/>posting engine]
  API --> PG[(PostgreSQL 16<br/>primary + replica)]
  API --> R[(Redis<br/>sessions, queues)]
  API --> S3[(Object storage)]
  WK[Workers · NestJS<br/>outbox, scheduler,<br/>PDF, virus scan] --> PG & R & S3
  WK --> EXT[Email · SMS · bank files]
```

| Container      | Technology                          | State                         | Scales by                             |
| -------------- | ----------------------------------- | ----------------------------- | ------------------------------------- |
| Web app        | Next.js, React, TypeScript          | Stateless                     | More containers                       |
| API            | NestJS                              | Stateless (sessions in Redis) | More containers, PgBouncer            |
| Workers        | NestJS, BullMQ, Gotenberg, ClamAV   | Stateless                     | More workers per queue                |
| PostgreSQL     | Managed, Multi-AZ, PITR             | System of record              | Bigger instance, replicas, partitions |
| Redis          | Managed, Multi-AZ                   | Rebuildable                   | Bigger node                           |
| Object storage | S3-compatible, versioned, encrypted | Files                         | Unlimited                             |

**The web app holds no database credentials.** A flaw in the UI layer cannot read data directly.

## 3. Module layers

```mermaid
flowchart TB
  REP[Reporting · read models, dashboards, exports]
  subgraph Business modules
    CRM[CRM] --- BIL[Billing] --- PRJ[Projects] --- HR[HR] --- PAY[Payroll] --- PRC[Procurement] --- PAR[Partners]
  end
  ACC[Accounting · posting engine, ledger, payables, bank, tax]
  CORE[Core · identity, policies, approvals, notifications, audit, files, numbering]
  REP -.reads.-> CRM & BIL & PRJ & HR & PAY & PRC & PAR
  CRM & BIL & PRJ & HR & PAY & PRC & PAR --> ACC
  ACC --> CORE
```

Dependencies point down only. Business modules never call each other; they react to events. Rules: [module boundaries](module-boundaries.md).

## 4. The money path

```mermaid
sequenceDiagram
  actor A as Approver
  participant W as Web app
  participant API as Core approval use case
  participant H as Module handler
  participant PE as Posting engine
  participant DB as PostgreSQL
  participant WK as Worker
  A->>W: Approve bill
  W->>API: POST /core/approvals/{id}:approve (Idempotency-Key)
  API->>API: Policy + segregation of duties
  rect rgba(11,110,102,0.08)
  API->>DB: BEGIN · approve step
  API->>H: final step: on approved
  H->>PE: post(bill)
  PE->>DB: balanced journal + outbox event
  API->>DB: COMMIT (balance and period checks)
  end
  API-->>W: 200 + entry number
  WK->>DB: read outbox
  WK->>WK: notify, refresh balances
```

Approval, journal and event commit together or not at all. Every approval takes this path; the module that owns the document registers the handler, so core never imports it ([ADR-0007](adr/0007-approvals-through-core.md)).

## 5. Key decisions

| ADR                                                | Decision                                                       |
| -------------------------------------------------- | -------------------------------------------------------------- |
| [0001](adr/0001-modular-monolith.md)               | Modular monolith, not microservices                            |
| [0002](adr/0002-frontend-first-contract-first.md)  | Frontend first, on shared contracts and a mock API             |
| [0003](adr/0003-double-entry-ledger.md)            | Double-entry ledger with one posting engine; immutable journal |
| [0004](adr/0004-server-side-sessions.md)           | Server-side sessions, not JWT in the browser                   |
| [0005](adr/0005-audit-by-database-trigger.md)      | Audit by database triggers with a hash chain                   |
| [0006](adr/0006-runtime-and-toolchain-baseline.md) | Node 26 LTS, TypeScript 6.0, pnpm 12, 7-day release cooldown   |
| [0007](adr/0007-approvals-through-core.md)         | Every approval decision goes through core                      |
| [0008](adr/0008-mock-transport-in-the-bff.md)      | Mock API inside the backend-for-frontend                       |

## 6. Stack

| Layer               | Choice                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Front end           | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query and Table, React Hook Form + Zod |
| Mock API (Phase 1)  | Mock Service Worker serving `packages/contracts`                                                           |
| Back end            | NestJS, TypeScript; Prisma or Drizzle for CRUD, hand-written SQL for ledger and reports                    |
| Database            | PostgreSQL 16                                                                                              |
| Jobs and events     | Redis + BullMQ, transactional outbox                                                                       |
| Authorisation       | CASL policies compiled to SQL                                                                              |
| Files and documents | S3-compatible storage, ClamAV, Gotenberg PDF, ExcelJS                                                      |
| Infrastructure      | Docker, Terraform, AWS (Singapore or Mumbai) or a Bangladesh data centre                                   |
| CI/CD               | GitHub Actions                                                                                             |
| Observability       | Sentry, OpenTelemetry, Grafana or CloudWatch                                                               |

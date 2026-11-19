# ADR-0001: Modular monolith, not microservices

- **Status:** Accepted
- **Date:** 03 Nov 2026
- **Deciders:** Partners, tech lead

## Context

The ERP must post approvals, journal entries and events atomically. The team is about six people, the user base is up to a few hundred, and the system must be operable without a platform team.

## Options considered

1. **Microservices** per module: independent scaling and deploys; but distributed transactions for every posting, more infrastructure, more failure modes.
2. **Unstructured monolith:** fastest at first; modules tangle and cannot be split later.
3. **Modular monolith:** one deployable codebase and one database, with enforced module boundaries and internal events.

## Decision

Build a modular monolith: Next.js web, NestJS API and NestJS workers from one repository, PostgreSQL with one schema per module.

## Consequences

- Postings stay in one ACID transaction; operations stay simple.
- Boundaries must be enforced by tooling (dependency-cruiser in CI) and review, or the code tangles.
- A module with unusual load can later be extracted using its existing public API and events.

# ADR-0002: Frontend first, contract first

- **Status:** Accepted
- **Date:** 03 Nov 2026
- **Deciders:** Partners, tech lead

## Context

The Partners want to see and approve the complete product before backend work starts, so that changes are cheap and the backend builds exactly what was agreed.

## Options considered

1. **Backend first:** correct business logic early; Partners see little until late.
2. **Module by module (vertical slices):** earliest go-live; UI decisions spread over the whole project.
3. **Frontend first on mocks, without contracts:** fast UI; high risk of building screens the backend cannot support.
4. **Frontend first on shared contracts:** UI complete and signed off first, against the exact API the backend will implement.

## Decision

Option 4. Phase 0 defines Zod contracts for every module. Phase 1 builds every screen against a Mock Service Worker that serves those contracts. Phase 2 implements the contracts in the backend; the UI switches per module with a flag.

## Consequences

- Partners sign off a working UI early; the backend has an unambiguous target.
- First go-live is later than with vertical slices. Mitigation: Phase 2 delivers in waves (W1–W4) and each wave can go live.
- Business rules must not leak into the frontend or the mocks. Mitigation: code review rule, and mocks return fixed results only.
- Contract changes during Phase 2 cost UI rework. Mitigation: contract freeze per module at the end of Phase 1; changes need a change request.

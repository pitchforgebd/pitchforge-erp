# ADR-0004: Server-side sessions, not JWT in the browser

- **Status:** Accepted
- **Date:** 03 Nov 2026
- **Deciders:** Tech lead, security owner

## Context

Finance and HR users handle sensitive data. Sessions must be revocable immediately (stolen laptop, role change, leaver).

## Decision

Opaque session ID in an HTTP-only, Secure, SameSite=Lax cookie; session state in Redis. Integrations use scoped personal access tokens, never browser sessions.

## Consequences

- Instant revocation and no tokens reachable by JavaScript.
- Redis is a required dependency; it runs Multi-AZ.
- CSRF protection is required on cookie-authenticated writes.

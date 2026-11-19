# ADR-0011: Static analysis with Semgrep CE

- **Status:** Accepted
- **Date:** 06 Nov 2026
- **Deciders:** Tech lead

## Context

The security gates need static analysis that blocks merges. CodeQL on a private repository needs GitHub Advanced Security, which depends on the plan chosen in Q2. The rules that matter most here are specific to this project: no float money, no string-built SQL, nothing in browser storage.

## Options considered

1. **CodeQL:** deep analysis, but it costs extra on private repositories.
2. **Semgrep CE:** free, runs from a pinned container, and custom rules are short and testable.
3. **ESLint security plugins alone:** already in use, but limited to JavaScript syntax and to what plugins offer.

## Decision

Semgrep CE in CI, with the rules in `.semgrep/rules` tested by `semgrep --test`. ESLint stays as the first layer. If Q2 adds Advanced Security, CodeQL joins Semgrep rather than replacing it.

## Consequences

- Project rules are cheap to add, and each has a test.
- Semgrep CE has no taint analysis across files, so it will miss what CodeQL could find. The external pen test in Phase 3 covers part of that.
- Developers without Semgrep or Docker see a skip locally, and CI always runs it.

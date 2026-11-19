# Security policy

Pitchforge ERP holds salaries, bank details, partner balances and client contracts. Security issues are treated as the highest-priority work in every phase.

## Reporting a vulnerability

- Email **security@pitchforge.com.bd** (or message the security owner directly). Do **not** open a GitHub issue, pull request or chat thread that describes the problem.
- Include: what you found, where, how to reproduce, and what data could be exposed.
- You will get an acknowledgement within **1 working day** and a fix plan within **3 working days**.

## Severity and response targets

| Severity | Example                                                      | Fix deployed within      |
| -------- | ------------------------------------------------------------ | ------------------------ |
| Critical | Anyone can read salaries, post to the ledger or bypass login | 24 hours, hotfix         |
| High     | A role can see or change data outside its scope              | 3 working days           |
| Medium   | Missing rate limit, weak header, verbose error               | Next release (≤ 2 weeks) |
| Low      | Hardening suggestion                                         | Planned backlog          |

## Supported versions

Only the version running in production and the current `main` branch receive security fixes.

## More

- [Security architecture](docs/04-security/security-architecture.md)
- [Threat model](docs/04-security/threat-model.md)
- [Secure coding checklist](docs/04-security/secure-coding-checklist.md)
- [Incident response](docs/04-security/incident-response.md)

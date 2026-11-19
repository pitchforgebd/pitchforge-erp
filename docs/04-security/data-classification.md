# Data classification

| Class            | Examples                                                                                         | Storage                                          | Sharing                                          | In non-production                 |
| ---------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ | --------------------------------- |
| **Restricted**   | Salaries, bank accounts, NID, TIN of individuals, partner balances, credentials, encryption keys | Field-level encryption; strict field permissions | Never by email or chat; only in-system           | Never; replaced by synthetic data |
| **Confidential** | Ledger, invoices, client contracts, tender pricing, employee records                             | Encrypted at rest; role and scope permissions    | Need-to-know, via the system or approved exports | Anonymised copies only            |
| **Internal**     | Project plans, tasks, internal documents                                                         | Encrypted at rest                                | Staff                                            | Allowed                           |
| **Public**       | Company name, published services                                                                 | —                                                | Anyone                                           | Allowed                           |

## Rules

1. Staging uses anonymised production copies: names, phones, emails, NIDs, bank details and salaries replaced.
2. Exports of Restricted data are logged, watermarked with user and time, and alerted when large.
3. Screenshots, tickets and docs use sample data only.
4. Retention: financial, tax and payroll records are kept at least as long as Bangladesh law requires (confirm with the tax advisor); the application never purges them.

## Where each rule is enforced

| Rule                                         | Enforced by                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Restricted fields can be left out of a reply | `restricted()` in the contracts; a test fails if a sensitive response field is not marked               |
| No personal data in logs                     | Redaction paths in `apps/api/src/platform/logging/logging.ts`, with a test                              |
| No real data in fixtures                     | `packages/contracts/fixtures` is fictional and masked; reviewed by hand, because no tool can prove this |
| Exports of Restricted data                   | Not built yet: Phase 2                                                                                  |

## Approval

| Role           | Name | Date | Result  |
| -------------- | ---- | ---- | ------- |
| Security owner |      |      | Pending |

# Testing strategy

**Money code carries the heaviest tests because an error there is the most expensive.**

| Level           | Covers                                                                                                            | Tools                       | Target                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------ |
| Unit            | Money maths, posting rules, tax and withholding, payroll, leave, profit distribution                              | Vitest                      | 90%+ on accounting, tax, payroll, partners |
| Property-based  | Any generated sequence of documents keeps the ledger balanced; reversals net to zero                              | fast-check                  | Runs on every PR                           |
| Component       | UI components in all states                                                                                       | Storybook + Testing Library | Every component in `packages/ui`           |
| Integration     | Use cases on a real PostgreSQL: approve and post, reverse, period lock, policy filters                            | Vitest + Testcontainers     | Every money-moving use case                |
| Contract        | API responses match the frozen schemas; mocks match the same schemas                                              | Zod + generated tests       | Every endpoint and mock                    |
| End-to-end      | Critical journeys per role                                                                                        | Playwright                  | Phase 1 on mocks, Phase 2 on real API      |
| Golden datasets | A month of real-shaped data reproduces the accountant's P&L, balances, partner statements and payroll to the taka | Custom runner               | Gate for every wave                        |
| Security        | Policy tests per role, IDOR, SoD, idempotency; DAST                                                               | Vitest, OWASP ZAP           | Every wave                                 |
| Performance     | 200 concurrent users, 5 M journal lines                                                                           | k6                          | Before go-live                             |
| Accessibility   | WCAG 2.1 AA                                                                                                       | axe-core in Playwright      | Every screen                               |

## Test data

Synthetic only. The seed is the prototype's sample company. Never copy production data into tests.

# Phase 3 · Integration, hardening and go-live

**Weeks 43–50. Goal: real data in, security proven, users trained, and one month of parallel running before the spreadsheets are retired.**

| Step                    | Weeks | Work                                                                                                                                | Done when                                              |
| ----------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Data migration          | 43–44 | Import chart of accounts, opening balances, clients, vendors, employees, open invoices and bills, assets; rehearse twice on staging | Opening trial balance signed by the accountant         |
| Performance             | 43–44 | k6 load test: 200 concurrent users, 5 M journal lines                                                                               | API p95 < 500 ms; statements < 5 s                     |
| Penetration test        | 44–45 | External test against staging, ASVS Level 2 scope                                                                                   | No open high or critical findings                      |
| Disaster recovery drill | 45    | Restore production-like backup to a new environment                                                                                 | Within RTO 4 h, RPO 15 min                             |
| UAT                     | 45–46 | Each role runs its scripts with the BA                                                                                              | All Must acceptance criteria pass                      |
| Training                | 46    | Role-based sessions and short videos                                                                                                | Every user has logged in and completed their checklist |
| Parallel run            | 47–48 | Run ERP and sheets side by side for one month-end                                                                                   | Month-end figures match                                |
| Go-live                 | 49    | Cut-over, lock old sheets, hypercare rota                                                                                           | Gate G4 signed                                         |
| Hypercare               | 49–50 | Daily check-ins, fast fixes                                                                                                         | Warranty period starts                                 |

## Gate G4 · Go-live

- [ ] Parallel-run month-end matches to the taka
- [ ] Pen test findings closed or formally accepted by Partners
- [ ] Backups, monitoring and alerts verified in production
- [ ] Runbooks written and rehearsed
- [ ] Rollback plan agreed

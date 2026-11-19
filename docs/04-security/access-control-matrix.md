# Access control matrix

**Every permission below is enforced on the server for each API call, search, export and report.** The UI hides what a role cannot do, but hiding is never the control.

Codes: **F** full · **O** own scope · **A** approve · **S** submit/request · **R** read · **–** none

| Area                                    | Partner | Finance          | PM   | Employee        | Sales | HR  | Procurement | Auditor |
| --------------------------------------- | ------- | ---------------- | ---- | --------------- | ----- | --- | ----------- | ------- |
| Users, roles, settings                  | F       | R                | –    | –               | –     | –   | –           | R       |
| Approval rules, tax tables, periods     | F       | R (lock periods) | –    | –               | –     | –   | –           | R       |
| Leads, clients, tenders                 | F       | R                | R    | –               | F     | –   | –           | R       |
| Quotations, contracts                   | F, A    | R                | R    | –               | F     | –   | –           | R       |
| Invoices, receipts                      | F, A    | F                | S    | –               | S     | –   | –           | R       |
| Vendor bills, payment runs              | F, A    | F, S             | –    | –               | –     | –   | S           | R       |
| Journal, bank, reconciliation           | F, A    | F, S             | –    | –               | –     | –   | –           | R       |
| Partner capital, drawings, distribution | F, A    | F                | –    | –               | –     | –   | –           | R       |
| Projects, milestones, tasks             | F       | R                | O    | O               | R     | –   | –           | R       |
| Project budget and profit               | F       | F                | O    | –               | –     | –   | –           | R       |
| Timesheets                              | F       | R                | O, A | O               | –     | R   | –           | R       |
| Expense claims, advances                | F, A    | F                | S, A | S               | S     | S   | S           | R       |
| Requisitions, POs                       | F, A    | R                | S, A | S               | S     | S   | F           | R       |
| Employees, attendance, leave            | F       | R                | O, A | O               | –     | F   | –           | R       |
| Salaries and payroll                    | F, A    | R                | –    | O (own payslip) | –     | F   | –           | R       |
| Assets                                  | F       | R                | R    | O               | –     | R   | F           | R       |
| Financial statements                    | F       | F                | –    | –               | –     | –   | –           | R       |
| Audit log                               | F       | R                | –    | –               | –     | –   | –           | R       |

## Field-level rules

| Field                                | Visible to                                       |
| ------------------------------------ | ------------------------------------------------ |
| Salary, allowances, payslip amounts  | Partner, HR, the employee themself               |
| Bank account and NID                 | HR (masked except last 4), the employee themself |
| Partner capital and current balances | Partners, Finance, Auditor                       |
| Labour cost per person on a project  | Partner, Finance; PMs see project totals only    |

## Segregation of duties

1. Nobody approves a request they created.
2. Nobody approves a payment to themselves.
3. The person who prepares a payment run does not approve it.
4. Partner drawings above the threshold need every other partner.
5. Period reopen needs a Partner who did not post into that period after it was locked.

## Access reviews

Quarterly: Partners review every user's roles; leavers are deactivated the same day by HR and checked by Finance.

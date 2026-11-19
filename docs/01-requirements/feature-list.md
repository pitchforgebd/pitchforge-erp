# Feature list

**260 features across 13 modules.** Every task, pull request and test references a feature ID from this list.

- **Priority:** M must · S should · C could
- **Wave:** the go-live wave the feature's backend ships in. All screens are built in Phase 1 regardless of wave; see the [roadmap](../03-development-phases/roadmap.md).

| Wave | Modules                                                                   |
| ---- | ------------------------------------------------------------------------- |
| W1   | Core platform, accounting, partners, projects, self-service, core reports |
| W2   | CRM, tenders, billing, tax                                                |
| W3   | HR, payroll                                                               |
| W4   | Procurement and assets, remaining reports                                 |

| Module                                                                      | Features | Must |
| --------------------------------------------------------------------------- | -------- | ---- |
| [Core platform](#1-core-platform)                                           | 45       | 33   |
| [CRM and sales](#2-crm-and-sales)                                           | 21       | 18   |
| [Tenders and bids](#3-tenders-and-bids)                                     | 14       | 10   |
| [Billing and receivables](#4-billing-and-receivables)                       | 12       | 9    |
| [Accounting and finance](#5-accounting-and-finance)                         | 25       | 20   |
| [Tax](#6-tax)                                                               | 9        | 9    |
| [Partner equity](#7-partner-equity)                                         | 16       | 14   |
| [Projects](#8-projects)                                                     | 32       | 23   |
| [HR](#9-hr)                                                                 | 20       | 14   |
| [Payroll](#10-payroll)                                                      | 17       | 15   |
| [Procurement and assets](#11-procurement-and-assets)                        | 17       | 9    |
| [Reports and dashboards](#12-reports-and-dashboards)                        | 21       | 19   |
| [Self-service, mobile and usability](#13-self-service-mobile-and-usability) | 11       | 6    |

## 1. Core platform

Default wave: **W1**

| ID      | Feature                                                                | Priority |
| ------- | ---------------------------------------------------------------------- | -------- |
| CORE-01 | Company profile: legal name, TIN, BIN, licence, logo, BDT, fiscal year | M        |
| CORE-02 | Branches, departments and cost centres tree                            | M        |
| CORE-03 | Shared contact master (client, vendor, employee, partner)              | M        |
| CORE-04 | Gap-free document numbering per type and fiscal year                   | M        |
| CORE-05 | Holiday calendar per branch                                            | M        |
| CORE-06 | Email and password login, Argon2id hashing                             | M        |
| CORE-07 | TOTP two-factor login, mandatory for Partner, Finance, HR, Admin       | M        |
| CORE-08 | Invite users by email; 30-minute single-use reset links                | M        |
| CORE-09 | Deactivate user without losing history; approvals move to a delegate   | M        |
| CORE-10 | Session timeout, device list, force sign-out                           | M        |
| CORE-11 | Rate limiting, lockout, new-device alert                               | M        |
| CORE-12 | Roles, data scope and permissions; cloneable roles                     | M        |
| CORE-13 | Field-level security for salary, bank, NID, partner balances           | M        |
| CORE-14 | Segregation of duties in every approval                                | M        |
| CORE-15 | Time-boxed auditor and viewer access                                   | S        |
| CORE-16 | Approval engine: rules by type, amount, department, project            | M        |
| CORE-17 | Approve, reject with reason, return, delegate; full history            | M        |
| CORE-18 | Multi-approver rules (e.g. all other partners)                         | M        |
| CORE-19 | Approval SLA, reminders and escalation                                 | S        |
| CORE-20 | Approve from email or phone                                            | S        |
| CORE-21 | In-app notification centre                                             | M        |
| CORE-22 | Email notifications with retry                                         | M        |
| CORE-23 | Web push notifications                                                 | S        |
| CORE-24 | SMS / WhatsApp alerts via local gateway                                | C        |
| CORE-25 | Reminder schedules (7, 3, 1, 0 days) reset when dates change           | M        |
| CORE-26 | Daily digest of overdue items                                          | M        |
| CORE-27 | Notification preferences per user                                      | S        |
| CORE-28 | Audit log: user, time, IP, device, old and new values                  | M        |
| CORE-29 | Append-only, hash-chained audit log                                    | M        |
| CORE-30 | Activity timeline on every record                                      | M        |
| CORE-31 | Attachments up to 25 MB on any record                                  | M        |
| CORE-32 | Encrypted object storage, signed URLs, virus scan                      | M        |
| CORE-33 | File versioning                                                        | S        |
| CORE-34 | Document library with folders and tags                                 | S        |
| CORE-35 | Expiry reminders for licences, guarantees, contracts, NDAs             | M        |
| CORE-36 | Branded PDF templates (invoice, payslip, PO, statement)                | M        |
| CORE-37 | Global search respecting permissions                                   | M        |
| CORE-38 | Excel import with dry run and error report                             | M        |
| CORE-39 | Excel / CSV export of any list                                         | M        |
| CORE-40 | Saved views and filters                                                | S        |
| CORE-41 | Quick add from any page (< 30 s)                                       | M        |
| CORE-42 | Custom fields on main records                                          | S        |
| CORE-43 | Backup and restore tooling                                             | M        |
| CORE-44 | REST API tokens and webhooks                                           | S        |
| CORE-45 | Google / Microsoft single sign-on                                      | C        |

## 2. CRM and sales

Default wave: **W2**

| ID     | Feature                                                 | Priority |
| ------ | ------------------------------------------------------- | -------- |
| CRM-01 | Leads with source, owner, status, follow-up             | M        |
| CRM-02 | Convert lead to client and contacts                     | M        |
| CRM-03 | Duplicate check by name, phone, email, TIN              | M        |
| CRM-04 | Client accounts with TIN, BIN, terms, credit limit      | M        |
| CRM-05 | Multiple contacts per client                            | M        |
| CRM-06 | Activities: calls, meetings, notes, follow-up reminders | M        |
| CRM-07 | Client 360 page                                         | M        |
| CRM-08 | Email capture to client record                          | C        |
| CRM-09 | Opportunities with value, probability, owner            | M        |
| CRM-10 | Configurable pipeline stages                            | M        |
| CRM-11 | Lost reason and competitor                              | M        |
| CRM-12 | Pipeline board and list                                 | M        |
| CRM-13 | Weighted sales forecast by month                        | M        |
| CRM-14 | Won deal creates the project                            | M        |
| CRM-15 | Quotations with lines, discount, VAT, PDF               | M        |
| CRM-16 | Quotation versions                                      | M        |
| CRM-17 | Discount approval above a limit                         | M        |
| CRM-18 | Contracts with terms, retention, warranty               | M        |
| CRM-19 | Contract and AMC renewal reminders                      | M        |
| CRM-20 | Change orders                                           | S        |
| CRM-21 | Retainer and AMC recurring billing                      | S        |

## 3. Tenders and bids

Default wave: **W2**

| ID     | Feature                                          | Priority |
| ------ | ------------------------------------------------ | -------- |
| TND-01 | Tender register (entity, e-GP ID, method, value) | M        |
| TND-02 | Tender deadlines with reminders                  | M        |
| TND-03 | Go / no-go decision with approver                | S        |
| TND-04 | Bid document checklist with owners               | M        |
| TND-05 | Reusable standard document library with expiry   | M        |
| TND-06 | Bid team and internal deadlines                  | M        |
| TND-07 | Bid costing sheet with versions                  | S        |
| TND-08 | Bid security tracker                             | M        |
| TND-09 | Performance guarantee tracker                    | M        |
| TND-10 | Margin money tracking                            | M        |
| TND-11 | Tender outcome, rank, winning price              | M        |
| TND-12 | Competitor price history                         | S        |
| TND-13 | Tender cost per bid and per win                  | S        |
| TND-14 | Awarded tender creates contract and project      | M        |

## 4. Billing and receivables

Default wave: **W2**

| ID     | Feature                                                   | Priority |
| ------ | --------------------------------------------------------- | -------- |
| BIL-01 | Invoice from milestone, billing plan, timesheet or manual | M        |
| BIL-02 | VAT invoice layout per current Mushak form                | M        |
| BIL-03 | Advance invoices and adjustment                           | M        |
| BIL-04 | Receipts against one or many invoices                     | M        |
| BIL-05 | Record AIT, VDS and retention deducted by clients         | M        |
| BIL-06 | Credit notes and write-offs with approval                 | M        |
| BIL-07 | Receivables ageing (not due, 1–30 … 90+)                  | M        |
| BIL-08 | Collection reminders                                      | M        |
| BIL-09 | Retention money tracker                                   | S        |
| BIL-10 | Client statement PDF                                      | M        |
| BIL-11 | Unbilled revenue                                          | S        |
| BIL-12 | Client portal                                             | C        |

## 5. Accounting and finance

Default wave: **W1**

| ID     | Feature                                                    | Priority |
| ------ | ---------------------------------------------------------- | -------- |
| FIN-01 | Chart of accounts with Bangladesh service-company template | M        |
| FIN-02 | Double-entry journal; DB-enforced balance                  | M        |
| FIN-03 | Posting engine with configurable rules                     | M        |
| FIN-04 | Dimensions on every journal line                           | M        |
| FIN-05 | Immutable posted entries; reversal and adjustment          | M        |
| FIN-06 | Manual journals with approval                              | M        |
| FIN-07 | Recurring journals                                         | S        |
| FIN-08 | Opening balance import with balancing check                | M        |
| FIN-09 | Vendor bills with VAT, project, attachment                 | M        |
| FIN-10 | Payment runs with partial payments and bank advice         | M        |
| FIN-11 | Employee expense claims and reimbursements                 | M        |
| FIN-12 | Employee advances and settlement                           | M        |
| FIN-13 | Payee directory and payment history                        | M        |
| FIN-14 | Payables ageing and vendor statement                       | M        |
| FIN-15 | Bank, cash, bKash, Nagad, Rocket accounts                  | M        |
| FIN-16 | Transfers between accounts with charges                    | M        |
| FIN-17 | Bank statement import and reconciliation                   | M        |
| FIN-18 | Cheque register incl. post-dated cheques                   | M        |
| FIN-19 | Petty cash with float and top-ups                          | S        |
| FIN-20 | Cash forecast 30/60/90 days                                | S        |
| FIN-21 | Multi-currency with manual rate                            | M        |
| FIN-22 | Realised FX gain/loss and revaluation                      | S        |
| FIN-23 | Company budget by account and department                   | S        |
| FIN-24 | Month-end close checklist and period lock                  | M        |
| FIN-25 | Year-end close                                             | M        |

## 6. Tax

Default wave: **W2**

| ID     | Feature                                      | Priority |
| ------ | -------------------------------------------- | -------- |
| TAX-01 | Output VAT on invoices                       | M        |
| TAX-02 | Input VAT on bills                           | M        |
| TAX-03 | VAT payable report for the monthly return    | M        |
| TAX-04 | AIT/TDS and VDS on payments from rate table  | M        |
| TAX-05 | AIT and VDS deducted by clients              | M        |
| TAX-06 | Withholding certificates issued and received | M        |
| TAX-07 | Challan tracking                             | M        |
| TAX-08 | Salary TDS from payroll                      | M        |
| TAX-09 | Effective-dated rate tables                  | M        |

## 7. Partner equity

Default wave: **W1**

| ID     | Feature                                       | Priority |
| ------ | --------------------------------------------- | -------- |
| PAR-01 | Partner register linked to users              | M        |
| PAR-02 | Effective-dated equity history totalling 100% | M        |
| PAR-03 | Capital contributions                         | M        |
| PAR-04 | Profit drawings                               | M        |
| PAR-05 | Capital returns                               | M        |
| PAR-06 | Loans to partners                             | M        |
| PAR-07 | Partner remuneration (if the deed allows)     | M        |
| PAR-08 | Money held in a partner's personal account    | M        |
| PAR-09 | Drawing approval by other partners            | M        |
| PAR-10 | Profit distribution run after reserve %       | M        |
| PAR-11 | Day-weighted split when equity changes        | M        |
| PAR-12 | Per-project profit-split override             | S        |
| PAR-13 | Distribution preview and whole-run reversal   | M        |
| PAR-14 | Withdrawable balance with warning             | M        |
| PAR-15 | Partner statement PDF                         | M        |
| PAR-16 | Partner exit settlement                       | S        |

## 8. Projects

Default wave: **W1**

| ID     | Feature                                                     | Priority |
| ------ | ----------------------------------------------------------- | -------- |
| PRJ-01 | Projects with client, contract, type, PM, value             | M        |
| PRJ-02 | Project types: fixed price, T&M, retainer, internal, tender | M        |
| PRJ-03 | Project statuses incl. Closed lock                          | M        |
| PRJ-04 | Team with role, allocation, billing rate                    | M        |
| PRJ-05 | Budget by category and hours, versioned                     | M        |
| PRJ-06 | Project overview with value, cost, margin, progress         | M        |
| PRJ-07 | Project templates                                           | S        |
| PRJ-08 | Closure checklist                                           | S        |
| PRJ-09 | Milestones with deliverables, weight, billing amount        | M        |
| PRJ-10 | Weights must total 100%                                     | M        |
| PRJ-11 | Derived overdue flag                                        | M        |
| PRJ-12 | Deadline change requires a reason                           | M        |
| PRJ-13 | Client sign-off triggers invoice request                    | M        |
| PRJ-14 | Milestone dependencies                                      | S        |
| PRJ-15 | Tasks and sub-tasks                                         | M        |
| PRJ-16 | Multiple assignees                                          | M        |
| PRJ-17 | Kanban board                                                | M        |
| PRJ-18 | List and calendar views                                     | M        |
| PRJ-19 | Gantt timeline                                              | S        |
| PRJ-20 | My Work page                                                | M        |
| PRJ-21 | Comments with @mentions                                     | M        |
| PRJ-22 | Recurring tasks                                             | S        |
| PRJ-23 | Weekly timesheets                                           | M        |
| PRJ-24 | Timesheet approval and lock                                 | M        |
| PRJ-25 | Labour cost from approved hours                             | M        |
| PRJ-26 | Resource planner                                            | S        |
| PRJ-27 | Utilisation report                                          | S        |
| PRJ-28 | Project P&L from the ledger                                 | M        |
| PRJ-29 | Budget alerts at 80% and 100%                               | M        |
| PRJ-30 | Overhead allocation                                         | S        |
| PRJ-31 | Engineer and freelancer fee agreements                      | M        |
| PRJ-32 | Estimate at completion                                      | S        |

## 9. HR

Default wave: **W3**

| ID    | Feature                                       | Priority |
| ----- | --------------------------------------------- | -------- |
| HR-01 | Employee profiles with protected fields       | M        |
| HR-02 | Job records: grade, department, manager, type | M        |
| HR-03 | Lifecycle events                              | M        |
| HR-04 | Org chart                                     | S        |
| HR-05 | Onboarding checklist                          | S        |
| HR-06 | Offboarding and clearance                     | M        |
| HR-07 | Probation and contract end alerts             | M        |
| HR-08 | Shifts, weekends, holidays                    | M        |
| HR-09 | Web / PWA check-in with optional location     | M        |
| HR-10 | Biometric device import                       | M        |
| HR-11 | Late, early-leave and absence rules           | M        |
| HR-12 | Attendance regularisation                     | M        |
| HR-13 | Field visit and work-from-home                | S        |
| HR-14 | Leave types seeded from the Labour Act        | M        |
| HR-15 | Accrual, carry-forward, encashment rules      | M        |
| HR-16 | Leave request and approval                    | M        |
| HR-17 | Team leave calendar                           | M        |
| HR-18 | Recruitment                                   | C        |
| HR-19 | Performance appraisal                         | S        |
| HR-20 | Training records                              | C        |

## 10. Payroll

Default wave: **W3**

| ID     | Feature                                          | Priority |
| ------ | ------------------------------------------------ | -------- |
| PAY-01 | Salary structure per grade or person             | M        |
| PAY-02 | Monthly payroll run from attendance and leave    | M        |
| PAY-03 | Draft, review, approve, lock                     | M        |
| PAY-04 | Overtime                                         | M        |
| PAY-05 | Festival bonus runs                              | M        |
| PAY-06 | Provident fund ledger and loans                  | S        |
| PAY-07 | Gratuity provision                               | S        |
| PAY-08 | Salary tax: projection, declaration, monthly TDS | M        |
| PAY-09 | Salary advances and loans                        | M        |
| PAY-10 | Payslip PDF and self-service                     | M        |
| PAY-11 | Salary sheet                                     | M        |
| PAY-12 | Bank salary file per bank format                 | M        |
| PAY-13 | PF and tax reports                               | M        |
| PAY-14 | Yearly tax certificate                           | M        |
| PAY-15 | Payroll posting split by project via timesheets  | M        |
| PAY-16 | Final settlement                                 | M        |
| PAY-17 | Freelancers paid through payables                | M        |

## 11. Procurement and assets

Default wave: **W4**

| ID     | Feature                                                 | Priority |
| ------ | ------------------------------------------------------- | -------- |
| PRC-01 | Vendor master with TIN, BIN, bank, withholding category | M        |
| PRC-02 | Purchase requisitions with approval by amount           | M        |
| PRC-03 | RFQ and quote comparison                                | S        |
| PRC-04 | Purchase orders with amendments                         | M        |
| PRC-05 | Goods receipt (GRN)                                     | M        |
| PRC-06 | Three-way match                                         | S        |
| PRC-07 | Vendor performance                                      | C        |
| PRC-08 | Item master                                             | S        |
| PRC-09 | Stock movements                                         | S        |
| PRC-10 | Stock valuation and reorder alerts                      | S        |
| PRC-11 | Asset register with tags                                | M        |
| PRC-12 | Depreciation: straight-line and reducing balance        | M        |
| PRC-13 | Asset assignment and return                             | M        |
| PRC-14 | Maintenance log                                         | S        |
| PRC-15 | Asset disposal                                          | S        |
| PRC-16 | Licences, subscriptions, domains with renewals          | M        |
| PRC-17 | Guarantees and deposits given                           | M        |

## 12. Reports and dashboards

Default wave: **W1–W4**

| ID     | Feature                                          | Priority |
| ------ | ------------------------------------------------ | -------- |
| RPT-01 | Partner dashboard                                | M        |
| RPT-02 | Finance dashboard                                | M        |
| RPT-03 | PM dashboard                                     | M        |
| RPT-04 | Sales dashboard                                  | M        |
| RPT-05 | HR dashboard                                     | M        |
| RPT-06 | Employee home                                    | M        |
| RPT-07 | Trial balance, P&L, balance sheet, cash flow     | M        |
| RPT-08 | General ledger, journal register, cash book      | M        |
| RPT-09 | Project P&L, budget vs actual, slippage          | M        |
| RPT-10 | Partner statements and distribution              | M        |
| RPT-11 | Payee payment history                            | M        |
| RPT-12 | Receivables and payables ageing                  | M        |
| RPT-13 | VAT and withholding reports                      | M        |
| RPT-14 | Pipeline, win/loss, tender and guarantee reports | M        |
| RPT-15 | Timesheet, utilisation, labour cost              | M        |
| RPT-16 | Payroll and HR reports                           | M        |
| RPT-17 | Procurement and asset reports                    | M        |
| RPT-18 | Department budget vs actual                      | S        |
| RPT-19 | Drill-down to source documents                   | M        |
| RPT-20 | PDF / Excel / CSV export and scheduled email     | M        |
| RPT-21 | Custom report builder                            | C        |

## 13. Self-service, mobile and usability

Default wave: **W1**

| ID    | Feature                                                 | Priority |
| ----- | ------------------------------------------------------- | -------- |
| UX-01 | Employee self-service                                   | M        |
| UX-02 | Manager self-service                                    | M        |
| UX-03 | Responsive from 360 px                                  | M        |
| UX-04 | Installable PWA with push                               | S        |
| UX-05 | Mobile quick actions (receipt photo, approve, check in) | S        |
| UX-06 | BDT formatting and amount in words                      | M        |
| UX-07 | DD MMM YYYY, Asia/Dhaka                                 | M        |
| UX-08 | Bangla interface                                        | S        |
| UX-09 | Dark mode                                               | C        |
| UX-10 | Keyboard shortcuts for finance screens                  | S        |
| UX-11 | WCAG 2.1 AA                                             | M        |

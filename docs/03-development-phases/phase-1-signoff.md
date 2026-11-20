# Phase 1 sign-off checklist

Phase 1 built every screen against the contracts, served by the mock API with the prototype's fictional company. Before Phase 2 (the real backend) starts, the people below walk through the screens on staging and tick each line. Nothing here uses real data: sign in with the sample accounts (password `sample-only`, code `123456`).

| Sample account               | Role            |
| ---------------------------- | --------------- |
| `farhana@pitchforge.example` | Partner         |
| `rafiq@pitchforge.example`   | Finance         |
| `nusrat@pitchforge.example`  | Project manager |
| `arif@pitchforge.example`    | Employee        |

A screen that shows the wrong thing becomes an issue with the screen, the account used and what was expected. Wording, layout and missing fields are welcome; they change the contracts before Phase 2, when changing them is cheap.

## What every reviewer checks on every screen

- [ ] Figures, dates and document numbers read correctly: `৳1,25,000`, `20 Nov 2026`, `PREFIX-2627-00001`.
- [ ] A button appears only when that role may do the action.
- [ ] Amounts the role must not see say "Hidden for your role" or are left out, never shown.
- [ ] The screen works on a phone held upright.

## Partners

| Area               | Check                                                                                                         | Done |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ---- |
| Home and approvals | Your dashboard; approve, reject and return a request; approving asks for your password again                  | [ ]  |
| Partners           | Balances and withdrawable amount; a drawing above the limit is refused; distribution preview, then post       | [ ]  |
| Sales and tenders  | Move, win and lose a deal; quotation revisions; tender outcome; release a guarantee                           | [ ]  |
| Projects           | Money only for partners, finance and the project's manager; milestone sign-off; deadline change needs reason  | [ ]  |
| People and payroll | Lock the November run after your password; salary sheet; final settlement; NID and bank stay hidden from you  | [ ]  |
| Procurement        | Requisition to order to goods received; depreciation refuses September (locked) and posts November            | [ ]  |
| Reports            | Statements agree: profit in the balance sheet equals the profit and loss; average salary column is yours only | [ ]  |
| Administration     | Users and roles, approval rules, document numbers                                                             | [ ]  |

## Accountant

| Area             | Check                                                                                                | Done |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ---- |
| Ledger           | Chart of accounts; a manual journal that does not balance is refused; reversal needs a reason        | [ ]  |
| Periods          | July to September locked; finance can lock, only a partner reopens                                   | [ ]  |
| Payables         | Vendor bill posting preview; payment run with TDS and VDS; the preparer cannot approve their own run | [ ]  |
| Billing and tax  | Invoice, receipt with AIT and VDS, credit note; VAT return by month; withholding certificates        | [ ]  |
| Bank             | Reconciliation: match, unmatch, post a bank charge                                                   | [ ]  |
| Statements       | Trial balance totals agree; opening an account shows its ledger; cash flow ends at the balance sheet | [ ]  |
| Payroll postings | October payroll journal JE-2627-00412 splits salaries between project and administration             | [ ]  |

## Security owner

| Check                                                                                                        | Done |
| ------------------------------------------------------------------------------------------------------------ | ---- |
| Staging response headers scanned (CSP, HSTS, frame and referrer policy), result attached to the G0 record    | [ ]  |
| Signed in as the employee, no other person's salary, NID, bank account or payslip can be reached by URL      | [ ]  |
| Finance sees vendor bank details but no employee's bank account                                              | [ ]  |
| Step-up is asked before: approve, reopen period, drawing, distribution, payroll lock, bank file, month close | [ ]  |
| The installed app (PWA) keeps no data on the device: signing out and going offline shows nothing             | [ ]  |
| `pnpm check:bundle` passed on the build that is on staging                                                   | [ ]  |

## Sign-off

| Who            | Name | Date | Signature |
| -------------- | ---- | ---- | --------- |
| Partner        |      |      |           |
| Partner        |      |      |           |
| Accountant     |      |      |           |
| Security owner |      |      |           |

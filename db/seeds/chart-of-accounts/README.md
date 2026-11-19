# Chart of accounts template

Template for a Bangladeshi service company (FIN-01), based on the prototype's chart. **It is a draft and is not signed.** Import it only after the accountant has answered the questions below.

## Columns

| Column           | Meaning                                                                              |
| ---------------- | ------------------------------------------------------------------------------------ |
| `code`           | 4 digits: 1 assets, 2 liabilities, 3 equity, 4 income, 5 and 6 expenses              |
| `name`           | Account name; no commas                                                              |
| `type`           | `asset`, `liability`, `equity`, `income` or `expense`, as in the contracts           |
| `normal_balance` | `debit` or `credit`                                                                  |
| `parent_code`    | Parent account; empty at the top of each type. An account with children is a heading |
| `is_contra`      | `true` if the normal balance is the opposite of its type                             |
| `is_control`     | `true` if only the posting engine may write to it (see the `Account` contract)       |
| `tax_mapping`    | The tax figure this account carries; the VAT and withholding reports read it         |

A test checks the file on every run: [chart-of-accounts.test.ts](../../../scripts/db/chart-of-accounts.test.ts).

## Assumptions to confirm

These came from the prototype or from the engineering team, not from an accountant.

1. **Partners have one capital and one current account each.** `Partner A`, `B` and `C` are placeholders for the partners in the deed. The ledger also has a `partner_id` dimension, so one control account per kind would work too.
2. **Added to the prototype's chart:** furniture and fixtures (1620), gratuity provision (2280), exchange gain (4920), exchange loss (6720), and the heading accounts.
3. **Control accounts** go beyond AR, AP and payroll payable: tax, retention, advances, partner accounts, retained earnings and accumulated depreciation are posted by the engine only.
4. **Travel, meals and professional fees** sit under cost of services (5xxx), as their codes do in the prototype, although the prototype's statements show them as operating expenses.
5. **Not in the chart yet:** income tax expense and payable, bad debts, rounding differences, discounts allowed, and provident fund assets.

## Questions for the accountant

- Is the structure right for a partnership firm, and for the audit format you use?
- Should partner balances stay as per-partner accounts, or use one account with a partner dimension?
- Which accounts above should not be control accounts? For example, may staff post to 1690 by manual journal?
- What is the opening-balance date? (Q7 in the Phase 0 plan.)
- Which of the missing accounts in assumption 5 are needed from day one?

## Sign-off

| Role       | Name | Date | Result  |
| ---------- | ---- | ---- | ------- |
| Accountant |      |      | Pending |

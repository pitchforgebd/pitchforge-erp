# packages/shared-kernel

Small, dependency-free building blocks used by every app. Runs in Node and the browser. **No runtime dependencies** (enforced by dependency-cruiser) and **100% test coverage** (enforced by the Vitest threshold). Changes need tech lead and finance-reviewer approval (CODEOWNERS).

```ts
import {
  parseMoney,
  multiplyByRate,
  parseRate,
  formatMoney,
  unwrap,
} from '@pitchforge/shared-kernel';

const net = unwrap(parseMoney('125000.00', 'BDT'));
const vat = multiplyByRate(net, unwrap(parseRate('0.15'))); // ৳18,750.00, rounded once
formatMoney(vat); // "৳18,750"
```

| Area                | What                                                                                                                                                                                                                                                 | Rules                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `money/`            | `Money` (bigint minor units + currency), `add`, `subtract`, `negate`, `abs`, `sum`, `compare`, `parseMoney` / `toDecimalString` (`"125000.00"`), `Rate` with `multiplyByRate` and `convert`, `allocate`, `formatMoney` (lakh/crore), `amountInWords` | Never a float. Mixing currencies throws `CURRENCY_MISMATCH`. Values must fit PostgreSQL `BIGINT` (`AMOUNT_OUT_OF_RANGE`). Parsing never rounds away extra decimals; it rejects them. |
| `money/rounding.ts` | `divideRounded`: **the** rounding rule                                                                                                                                                                                                               | Half away from zero, so a reversal is the exact negative. **Provisional** until the accountant confirms (Q9).                                                                        |
| `ids/`              | `uuidV7()` (RFC 9562, time-ordered, monotonic), `parseUuid`, `Id<'User'>`                                                                                                                                                                            | Uses `crypto.getRandomValues`; never `Math.random`                                                                                                                                   |
| `dates/`            | `BusinessDate` (`YYYY-MM-DD`), `addDays`, `addMonths`, `formatDate` (`04 Nov 2026`), `toBusinessDate` / `todayInDhaka` (Asia/Dhaka via the time-zone database), `fiscalYearOf` (July–June, code `2627`, label `2026–27`), `fiscalPeriodOf`           | Inject the clock (`todayInDhaka(now)`) in domain code                                                                                                                                |
| `document-no/`      | `formatDocumentNo` / `parseDocumentNo`: `INV-2627-00045`                                                                                                                                                                                             | 5-digit minimum sequence; only the canonical form parses                                                                                                                             |
| `errors/`           | `DomainError` with stable `ErrorCode`s, `Result`, `ok` / `err` / `unwrap`                                                                                                                                                                            | Parsing untrusted input returns `Result`; broken invariants throw                                                                                                                    |

## Waiting for the accountant

[`src/money/golden.test.ts`](src/money/golden.test.ts) lists what the system will print and compute: display format, amount in words, rounding of VAT and AIT, and profit splits. It has a sign-off line. Open points: the rounding rule (half away from zero, or half-even), whether zero paisa is hidden in display (`৳1,25,000`), and the amount-in-words wording.

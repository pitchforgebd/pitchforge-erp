/**
 * Payroll sample records. Every amount — structures, run totals, salary sheet rows, payslips,
 * tax projections, loans and settlements — is written out as the server would send it. The
 * mock does no payroll arithmetic; restricted amounts are dropped per viewer in define.ts.
 */
import type {
  FinalSettlement,
  PayrollRun,
  Payslip,
  PayslipLine,
  SalaryLoan,
  SalarySheetRow,
  SalaryStructure,
  TaxCertificate,
  TaxDeclaration,
} from '@pitchforge/contracts';

import { bdt, rid } from './core-records.ts';
import { STAFF } from './hr-records.ts';
import type { SampleRole } from './sample-company.ts';

const meta = (at: string, by: string = STAFF.farhana.id) => ({
  createdAt: at,
  createdBy: by,
  updatedAt: at,
  updatedBy: by,
  version: 1,
});

interface Person {
  readonly id: string;
  readonly name: string;
}

/** Partners run payroll; finance reads run totals; everyone else sees only their own. */
export const runsPayroll = (role: SampleRole) => role === 'partner';
export const readsPayroll = (role: SampleRole) => role === 'partner' || role === 'finance';
const ownOrAll = (role: SampleRole, viewerId: string, person: Person) =>
  readsPayroll(role) || person.id === viewerId;

/* Structures ------------------------------------------------------------------------------- */

/** basic, house rent, medical, conveyance, gross. */
type Pay = readonly [string, string, string, string, string];

const PAY: readonly (readonly [Person, string, Pay])[] = [
  [STAFF.rafiq, 'M2', ['90000.00', '45000.00', '7500.00', '7500.00', '150000.00']],
  [STAFF.nusrat, 'M2', ['99000.00', '49500.00', '8250.00', '8250.00', '165000.00']],
  [STAFF.mehedi, 'E3', ['87000.00', '43500.00', '7250.00', '7250.00', '145000.00']],
  [STAFF.arif, 'E2', ['55200.00', '27600.00', '4600.00', '4600.00', '92000.00']],
  [STAFF.sadia, 'E2', ['46800.00', '23400.00', '3900.00', '3900.00', '78000.00']],
  [STAFF.tahmid, 'E2', ['66000.00', '33000.00', '5500.00', '5500.00', '110000.00']],
  [STAFF.rumana, 'E1', ['34800.00', '17400.00', '2900.00', '2900.00', '58000.00']],
  [STAFF.shirin, 'E1', ['33000.00', '16500.00', '2750.00', '2750.00', '55000.00']],
];

export function salaryStructuresFor(
  role: SampleRole,
  viewerId: string,
): readonly SalaryStructure[] {
  return PAY.filter(([person]) => ownOrAll(role, viewerId, person)).map(
    ([employee, grade, [basic, house, medical, conveyance, gross]], index) => ({
      id: rid(8700 + index),
      employee,
      grade,
      basicSalary: bdt(basic),
      allowances: [
        { name: 'House rent', amount: bdt(house) },
        { name: 'Medical', amount: bdt(medical) },
        { name: 'Conveyance', amount: bdt(conveyance) },
      ],
      grossSalary: bdt(gross),
      validFrom: '2026-07-01',
      validTo: null,
      meta: meta('2026-06-25T04:00:00Z'),
    }),
  );
}

/* Runs ------------------------------------------------------------------------------------- */

export const NOVEMBER_RUN_ID = rid(8801);
export const OCTOBER_RUN_ID = rid(8802);

type RunSeed = readonly [
  id: string,
  number: string,
  month: string,
  headcount: number,
  totals: readonly [gross: string, tax: string, pf: string, net: string],
  status: PayrollRun['status'],
  journalEntryNo: string | null,
];

const RUNS: readonly RunSeed[] = [
  [
    NOVEMBER_RUN_ID,
    'PAY-2627-00005',
    '2026-11',
    24,
    ['1432000.00', '99300.00', '57280.00', '1275420.00'],
    'approved',
    null,
  ],
  [
    OCTOBER_RUN_ID,
    'PAY-2627-00004',
    '2026-10',
    24,
    ['1420000.00', '98700.00', '57000.00', '1264300.00'],
    'locked',
    'JE-2627-00412',
  ],
  [
    rid(8803),
    'PAY-2627-00003',
    '2026-09',
    24,
    ['1405000.00', '97100.00', '56200.00', '1251700.00'],
    'locked',
    'JE-2627-00356',
  ],
  [
    rid(8804),
    'PAY-2627-00002',
    '2026-08',
    23,
    ['1352000.00', '92900.00', '54080.00', '1205020.00'],
    'locked',
    'JE-2627-00297',
  ],
  [
    rid(8805),
    'PAY-2627-00001',
    '2026-07',
    23,
    ['1352000.00', '92900.00', '54080.00', '1205020.00'],
    'locked',
    'JE-2627-00231',
  ],
];

const runActions = (
  role: SampleRole,
  status: PayrollRun['status'],
): PayrollRun['allowedActions'] => {
  if (!runsPayroll(role)) return [];
  if (status === 'draft') return ['submit'];
  if (status === 'approved') return ['lock'];
  return status === 'locked' ? ['export_bank_file'] : [];
};

export function payrollRunsFor(role: SampleRole): readonly PayrollRun[] {
  if (!readsPayroll(role)) return [];
  return RUNS.map(
    ([id, number, month, headcount, [gross, tax, pf, net], status, journalEntryNo]) => ({
      id,
      number,
      kind: 'monthly',
      month,
      headcount,
      gross: bdt(gross),
      tax: bdt(tax),
      providentFund: bdt(pf),
      net: bdt(net),
      status,
      approvalId: status === 'draft' ? null : rid(8960),
      journalEntryNo,
      allowedActions: runActions(role, status),
      meta: meta(`${month}-25T04:00:00Z`),
    }),
  );
}

/** What starting a run returns: accepted, and being calculated in the background. */
export const STARTED_RUN = {
  id: rid(8806),
  number: null,
  headcount: 0,
  gross: bdt('0.00'),
  tax: bdt('0.00'),
  providentFund: bdt('0.00'),
  net: bdt('0.00'),
  status: 'calculating',
  approvalId: null,
  journalEntryNo: null,
  allowedActions: [],
  meta: meta('2026-11-20T05:00:00Z'),
} as const;

/** Attendance for these months is closed, so a run may start. */
export const CLOSED_MONTHS: ReadonlySet<string> = new Set([
  '2026-07',
  '2026-08',
  '2026-09',
  '2026-10',
  '2026-11',
]);

/** days worked, overtime, gross, tax, net. */
const SHEET: readonly (readonly [Person, string, string, string, string, string])[] = [
  [STAFF.rafiq, '22', '0.00', '150000.00', '10000.00', '134000.00'],
  [STAFF.nusrat, '22', '0.00', '165000.00', '11500.00', '146900.00'],
  [STAFF.mehedi, '22', '0.00', '145000.00', '9500.00', '129700.00'],
  [STAFF.arif, '21', '0.00', '92000.00', '4200.00', '79120.00'],
  [STAFF.sadia, '20', '0.00', '78000.00', '2800.00', '72080.00'],
  [STAFF.tahmid, '22', '6400.00', '116400.00', '6600.00', '105400.00'],
  [STAFF.rumana, '22', '0.00', '58000.00', '800.00', '44880.00'],
  [STAFF.shirin, '22', '0.00', '55000.00', '500.00', '52300.00'],
];

export const SALARY_SHEET: readonly SalarySheetRow[] = SHEET.map(
  ([employee, daysWorked, overtime, gross, tax, net]) => ({
    employee,
    daysWorked,
    overtimePay: bdt(overtime),
    grossPay: bdt(gross),
    taxDeducted: bdt(tax),
    netPay: bdt(net),
  }),
);

/* Payslips --------------------------------------------------------------------------------- */

const earning = (label: string, amount: string): PayslipLine => ({
  label,
  kind: 'earning',
  amount: bdt(amount),
});
const deduction = (label: string, amount: string): PayslipLine => ({
  label,
  kind: 'deduction',
  amount: bdt(amount),
});

/** tax, provident fund, loan deduction, net. */
const SLIP_DEDUCTIONS = new Map<string, readonly [string, string, string | null, string]>([
  [STAFF.rafiq.id, ['10000.00', '6000.00', null, '134000.00']],
  [STAFF.nusrat.id, ['11500.00', '6600.00', null, '146900.00']],
  [STAFF.mehedi.id, ['9500.00', '5800.00', null, '129700.00']],
  [STAFF.arif.id, ['4200.00', '3680.00', '5000.00', '79120.00']],
  [STAFF.sadia.id, ['2800.00', '3120.00', null, '72080.00']],
  [STAFF.tahmid.id, ['6000.00', '4400.00', null, '99600.00']],
  [STAFF.rumana.id, ['800.00', '2320.00', '10000.00', '44880.00']],
  [STAFF.shirin.id, ['500.00', '2200.00', null, '52300.00']],
]);

export function payslipsFor(role: SampleRole, viewerId: string): readonly Payslip[] {
  const months = [
    ['2026-10', OCTOBER_RUN_ID, '2026-10-31T10:00:00Z'],
    ['2026-09', rid(8803), '2026-09-30T10:00:00Z'],
  ] as const;
  return months.flatMap(([month, payrollRunId, issuedAt], m) =>
    PAY.filter(([person]) => ownOrAll(role, viewerId, person)).map(
      ([employee, , [basic, house, medical, conveyance, gross]], index) => {
        const [tax, pf, loan, net] = SLIP_DEDUCTIONS.get(employee.id) ?? [
          '0.00',
          '0.00',
          null,
          gross,
        ];
        return {
          id: rid(8810 + m * 20 + index),
          payrollRunId,
          employee,
          month,
          lines: [
            earning('Basic', basic),
            earning('House rent', house),
            earning('Medical', medical),
            earning('Conveyance', conveyance),
            deduction('Income tax (TDS)', tax),
            deduction('Provident fund', pf),
            ...(loan === null ? [] : [deduction('Salary loan', loan)]),
          ],
          grossPay: bdt(gross),
          netPay: bdt(net),
          issuedAt,
        };
      },
    ),
  );
}

/* Tax declarations -------------------------------------------------------------------------- */

const DECLARATIONS = new Map<string, readonly [string, string, string]>([
  [STAFF.arif.id, ['50400.00', '4200.00', '0.00']],
  [STAFF.nusrat.id, ['138000.00', '11500.00', '150000.00']],
  [STAFF.mehedi.id, ['114000.00', '9500.00', '100000.00']],
  [STAFF.sadia.id, ['33600.00', '2800.00', '0.00']],
  [STAFF.rafiq.id, ['120000.00', '10000.00', '200000.00']],
]);

/** The viewer's own projection; partners have no employee record and get none. */
export function taxDeclarationOf(
  person: Person,
  fiscalYearCode: string,
): TaxDeclaration | undefined {
  const values = DECLARATIONS.get(person.id);
  if (values === undefined) return undefined;
  const [projected, monthly, investments] = values;
  return {
    id: rid(8850),
    employee: person,
    fiscalYearCode,
    projectedAnnualTax: bdt(projected),
    monthlyTds: bdt(monthly),
    investments: bdt(investments),
    meta: meta('2026-07-10T04:00:00Z', person.id),
  };
}

/** After a declaration the server recalculates; these are its fixed answers. */
export const DECLARED: ReadonlyMap<string, readonly [string, string]> = new Map([
  [STAFF.arif.id, ['41400.00', '3450.00']],
  [STAFF.nusrat.id, ['126000.00', '10500.00']],
  [STAFF.mehedi.id, ['105000.00', '8750.00']],
  [STAFF.sadia.id, ['27600.00', '2300.00']],
  [STAFF.rafiq.id, ['108000.00', '9000.00']],
]);

/* Loans ------------------------------------------------------------------------------------ */

export const DRAFT_LOAN_ID = rid(8903);

export function salaryLoansFor(role: SampleRole, viewerId: string): readonly SalaryLoan[] {
  const rows: readonly SalaryLoan[] = [
    {
      id: rid(8901),
      employee: STAFF.arif,
      kind: 'advance',
      principal: bdt('30000.00'),
      monthlyDeduction: bdt('5000.00'),
      outstanding: bdt('20000.00'),
      status: 'active',
      approvalId: rid(8961),
      allowedActions: [],
      meta: meta('2026-08-20T04:00:00Z'),
    },
    {
      id: rid(8902),
      employee: STAFF.rumana,
      kind: 'loan',
      principal: bdt('100000.00'),
      monthlyDeduction: bdt('10000.00'),
      outstanding: bdt('40000.00'),
      status: 'active',
      approvalId: rid(8962),
      allowedActions: [],
      meta: meta('2026-05-05T04:00:00Z'),
    },
    {
      id: DRAFT_LOAN_ID,
      employee: STAFF.sadia,
      kind: 'advance',
      principal: bdt('15000.00'),
      monthlyDeduction: bdt('5000.00'),
      outstanding: bdt('15000.00'),
      status: 'draft',
      approvalId: null,
      allowedActions: runsPayroll(role) ? ['submit'] : [],
      meta: meta('2026-11-18T04:00:00Z'),
    },
  ];
  return rows.filter((row) => ownOrAll(role, viewerId, row.employee));
}

/* Final settlements ------------------------------------------------------------------------ */

export const RUMANA_SETTLEMENT_ID = rid(8601);

export function finalSettlementsFor(
  role: SampleRole,
  viewerId: string,
): readonly FinalSettlement[] {
  const rows: readonly FinalSettlement[] = [
    {
      id: RUMANA_SETTLEMENT_ID,
      employee: STAFF.rumana,
      lastWorkingDay: '2026-11-30',
      lines: [
        earning('Salary, November (30 days)', '58000.00'),
        earning('Earned leave encashment (9 days)', '17400.00'),
        earning('Provident fund balance', '46400.00'),
        deduction('Salary loan outstanding', '40000.00'),
        deduction('Income tax (TDS)', '800.00'),
      ],
      netPay: bdt('81000.00'),
      status: 'draft',
      approvalId: null,
      journalEntryNo: null,
      allowedActions: runsPayroll(role) ? ['submit'] : [],
      meta: meta('2026-11-15T04:00:00Z'),
    },
    {
      id: rid(8602),
      employee: STAFF.kamal,
      lastWorkingDay: '2026-08-31',
      lines: [
        earning('Salary, August (31 days)', '52000.00'),
        earning('Provident fund balance', '18650.00'),
        deduction('Income tax (TDS)', '400.00'),
        deduction('Laptop not returned (book value)', '6000.00'),
      ],
      netPay: bdt('64250.00'),
      status: 'paid',
      approvalId: rid(8963),
      journalEntryNo: 'JE-2627-00281',
      allowedActions: [],
      meta: meta('2026-09-05T04:00:00Z'),
    },
  ];
  return rows.filter((row) => ownOrAll(role, viewerId, row.employee));
}

/* Tax certificates ------------------------------------------------------------------------- */

export function taxCertificatesFor(role: SampleRole, viewerId: string): readonly TaxCertificate[] {
  return [STAFF.rafiq, STAFF.nusrat, STAFF.mehedi, STAFF.arif, STAFF.sadia]
    .filter((person) => ownOrAll(role, viewerId, person))
    .map((employee, index) => ({
      id: rid(8870 + index),
      employee,
      fiscalYearCode: '2526',
      fileId: rid(8880 + index),
      issuedAt: '2026-07-15T06:00:00Z',
    }));
}

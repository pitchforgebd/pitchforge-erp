/**
 * Accounting sample records from the prototype's fictional company. Every balance, total and
 * posting preview is written out here as the posting engine would produce it; nothing is
 * calculated (CLAUDE.md rule 2).
 */
import type {
  Account,
  AgeingReport,
  BankAccount,
  BankStatementLine,
  Cheque,
  CloseChecklist,
  EmployeeAdvance,
  ExchangeRate,
  ExpenseClaim,
  FiscalPeriod,
  JournalEntry,
  ManualJournal,
  PartyStatement,
  Payee,
  PayeePayment,
  PaymentRun,
  PostingPreview,
  PostingRule,
  ReconciliationSummary,
  TaxCode,
  Transfer,
  VendorBill,
  WithholdingRule,
} from '@pitchforge/contracts';

import { CHART } from './chart.ts';
import { PEOPLE, bdt, rid } from './core-records.ts';
import type { SampleRole } from './sample-company.ts';

const T = '2026-11-02T03:00:00Z';
const meta = (at = T, by = PEOPLE.rafiq.id, version = 1) => ({
  createdAt: at,
  createdBy: by,
  updatedAt: at,
  updatedBy: by,
  version,
});
const ZERO = bdt('0.00');

/* Chart of accounts ------------------------------------------------------------------------- */

const accountId = (code: string) => rid(3000 + Number(code) / 10);
const accountName = new Map(CHART.map(([code, name]) => [code, name]));
const nameOf = (code: string) => accountName.get(code) ?? code;

export function accountsFor(role: SampleRole): readonly Account[] {
  const canEdit = role === 'partner' || role === 'finance';
  return CHART.map(([code, name, type, normalBalance, parentCode, isControl]) => ({
    id: accountId(code),
    code,
    name,
    type,
    normalBalance,
    parentId: parentCode === null ? null : accountId(parentCode),
    isControl,
    active: true,
    allowedActions: canEdit ? (isControl ? ['update'] : ['update', 'deactivate']) : [],
    meta: meta('2026-07-01T04:00:00Z'),
  }));
}

/* Fiscal periods ----------------------------------------------------------------------------- */

const PERIODS = [
  [1, '2026-07-01', '2026-07-31', '2026-08-03T04:00:00Z'],
  [2, '2026-08-01', '2026-08-31', '2026-09-02T04:00:00Z'],
  [3, '2026-09-01', '2026-09-30', '2026-10-01T04:00:00Z'],
  [4, '2026-10-01', '2026-10-31', null],
  [5, '2026-11-01', '2026-11-30', null],
  [6, '2026-12-01', '2026-12-31', null],
] as const;

export const periodId = (number: number) => rid(3200 + number);

export function periodsFor(role: SampleRole): readonly FiscalPeriod[] {
  return PERIODS.map(([number, startDate, endDate, lockedAt]) => {
    const locked = lockedAt !== null;
    // Finance may lock a period; only a Partner reopens one (access-control matrix).
    let allowedActions: FiscalPeriod['allowedActions'] = [];
    if (!locked && (role === 'finance' || role === 'partner')) allowedActions = ['lock'];
    if (locked && role === 'partner') allowedActions = ['reopen'];
    return {
      id: periodId(number),
      fiscalYearCode: '2627',
      number,
      startDate,
      endDate,
      status: locked ? 'locked' : 'open',
      lockedAt,
      lockedBy: locked ? PEOPLE.tanvir : null,
      allowedActions,
      meta: meta(lockedAt ?? '2026-07-01T04:00:00Z'),
    };
  });
}

export const CLOSE_CHECKLIST: CloseChecklist = {
  periodId: periodId(4),
  items: [
    { key: 'bank', label: 'Bank accounts reconciled', done: false, doneBy: null, doneAt: null },
    {
      key: 'bills',
      label: 'Vendor bills for the month recorded',
      done: true,
      doneBy: PEOPLE.rafiq,
      doneAt: '2026-11-01T10:00:00Z',
    },
    {
      key: 'payroll',
      label: 'Payroll posted',
      done: true,
      doneBy: PEOPLE.rafiq,
      doneAt: '2026-10-31T12:02:00Z',
    },
    {
      key: 'accruals',
      label: 'Accruals and prepayments journaled',
      done: false,
      doneBy: null,
      doneAt: null,
    },
    {
      key: 'depreciation',
      label: 'Depreciation run posted',
      done: false,
      doneBy: null,
      doneAt: null,
    },
    { key: 'vat', label: 'VAT and withholding reviewed', done: false, doneBy: null, doneAt: null },
  ],
};

/* Journal ------------------------------------------------------------------------------------ */

const noDimensions = {
  projectId: null,
  departmentId: null,
  costCenterId: null,
  employeeId: null,
  partnerId: null,
  contactId: null,
};

let lineSeq = 0;
const jl = (code: string, debit: string, credit: string, description: string | null = null) => {
  lineSeq += 1;
  return {
    id: rid(3500 + lineSeq),
    accountId: accountId(code),
    accountCode: code,
    accountName: nameOf(code),
    description,
    debit: bdt(debit),
    credit: bdt(credit),
    fxRate: '1',
    dimensions: noDimensions,
  };
};

const entry = (
  n: number,
  entryNo: string,
  entryDate: string,
  sourceType: string,
  description: string,
  lines: JournalEntry['lines'],
  total: string,
  extra: Partial<JournalEntry> = {},
): JournalEntry => ({
  id: rid(3400 + n),
  entryNo,
  entryDate,
  periodId: periodId(entryDate.startsWith('2026-09') ? 3 : 4),
  sourceType,
  sourceId: null,
  description,
  status: 'posted',
  reversalOfId: null,
  reversedById: null,
  lines,
  totalDebit: bdt(total),
  totalCredit: bdt(total),
  postedAt: `${entryDate}T12:00:00Z`,
  postedBy: PEOPLE.rafiq,
  allowedActions: [],
  ...extra,
});

export const REVERSED_ENTRY_ID = rid(3401);

const JOURNALS: readonly JournalEntry[] = [
  entry(
    12,
    'JE-2627-00412',
    '2026-10-31',
    'payroll_run',
    'Payroll · October 2026 (24 employees)',
    [
      jl('5110', '1040000.00', '0.00', 'Split by timesheets'),
      jl('6110', '380000.00', '0.00'),
      jl('2210', '0.00', '1264300.00'),
      jl('2230', '0.00', '98700.00'),
      jl('2240', '0.00', '57000.00'),
    ],
    '1420000.00',
  ),
  entry(
    11,
    'JE-2627-00411',
    '2026-10-30',
    'receipt',
    'Receipt · Nodi Microfinance against INV-2627-00045',
    [
      jl('1120', '1332000.00', '0.00'),
      jl('1340', '108000.00', '0.00', 'PF-2601'),
      jl('1210', '0.00', '1440000.00', 'PF-2601 · Nodi Microfinance'),
    ],
    '1440000.00',
  ),
  entry(
    10,
    'JE-2627-00410',
    '2026-10-28',
    'payment_run',
    'Payment · CloudNest Hosting, September bill',
    [
      jl('2110', '172500.00', '0.00', 'CloudNest Hosting Ltd'),
      jl('1120', '0.00', '164000.00'),
      jl('2250', '0.00', '8500.00'),
    ],
    '172500.00',
  ),
  entry(
    9,
    'JE-2627-00409',
    '2026-10-27',
    'partner_transaction',
    'Profit drawing · Farhana Kabir',
    [jl('3220', '200000.00', '0.00'), jl('1130', '0.00', '200000.00')],
    '200000.00',
  ),
  entry(
    8,
    'JE-2627-00408',
    '2026-10-26',
    'reversal',
    'Reversal of JE-2627-00401 · charged to the wrong project',
    [
      jl('2110', '120000.00', '0.00', 'Mahin Chowdhury'),
      jl('5310', '0.00', '120000.00', 'PF-2601'),
    ],
    '120000.00',
    { reversalOfId: REVERSED_ENTRY_ID },
  ),
  entry(
    1,
    'JE-2627-00401',
    '2026-10-22',
    'vendor_bill',
    'Freelancer bill · Mahin Chowdhury, UI design',
    [
      jl('5310', '120000.00', '0.00', 'PF-2601'),
      jl('2110', '0.00', '120000.00', 'Mahin Chowdhury'),
    ],
    '120000.00',
    { status: 'reversed', reversedById: rid(3408) },
  ),
  entry(
    13,
    'JE-2627-00398',
    '2026-09-30',
    'depreciation_run',
    'Depreciation · September 2026',
    [jl('6510', '15800.00', '0.00'), jl('1690', '0.00', '15800.00')],
    '15800.00',
  ),
];

/** Finance and partners may reverse a posted entry; the API refuses a second reversal. */
export function journalsFor(role: SampleRole): readonly JournalEntry[] {
  const canReverse = role === 'partner' || role === 'finance';
  return JOURNALS.map((item) => ({
    ...item,
    allowedActions:
      canReverse &&
      item.status === 'posted' &&
      item.reversalOfId === null &&
      item.periodId !== periodId(3)
        ? ['reverse']
        : [],
  }));
}

/* Manual journals ---------------------------------------------------------------------------- */

const mjLine = (
  code: string,
  debit: string,
  credit: string,
  description: string | null = null,
) => ({
  accountId: accountId(code),
  description,
  debit: bdt(debit),
  credit: bdt(credit),
  ...noDimensions,
});

/** The draft that does not balance, so NOT_BALANCED can be seen on submit. */
export const UNBALANCED_DRAFT_ID = rid(3602);
/** The draft dated in locked September, so PERIOD_LOCKED can be seen on submit. */
export const LOCKED_PERIOD_DRAFT_ID = rid(3603);

export function manualJournalsFor(role: SampleRole): readonly ManualJournal[] {
  const isFinance = role === 'finance';
  const draft = (
    id: string,
    entryDate: string,
    description: string,
    lines: ManualJournal['lines'],
  ): ManualJournal => ({
    id,
    number: null,
    entryDate,
    description,
    status: 'draft',
    approvalId: null,
    lines,
    journalEntryNo: null,
    fileIds: [],
    allowedActions: isFinance ? ['update', 'submit', 'delete'] : [],
    meta: meta('2026-11-02T05:00:00Z'),
  });
  return [
    {
      id: rid(3601),
      number: 'JV-2627-00021',
      entryDate: '2026-10-31',
      description: 'October accrual · statutory audit fee',
      status: 'pending_approval',
      approvalId: rid(1102),
      lines: [
        mjLine('5720', '75000.00', '0.00'),
        mjLine('2190', '0.00', '75000.00', 'Chowdhury and Associates'),
      ],
      journalEntryNo: null,
      fileIds: [rid(1303)],
      allowedActions: [],
      meta: meta('2026-11-02T03:10:00Z'),
    },
    draft(UNBALANCED_DRAFT_ID, '2026-10-31', 'Prepaid software · November share', [
      mjLine('5420', '18000.00', '0.00'),
      mjLine('1520', '0.00', '17500.00'),
    ]),
    draft(LOCKED_PERIOD_DRAFT_ID, '2026-09-30', 'September rent accrual (late)', [
      mjLine('6210', '225000.00', '0.00'),
      mjLine('2190', '0.00', '225000.00', 'Gulshan Office Space Ltd'),
    ]),
    {
      id: rid(3604),
      number: 'JV-2627-00019',
      entryDate: '2026-10-15',
      description: 'Reclassify September travel to PF-2604',
      status: 'posted',
      approvalId: rid(3690),
      lines: [mjLine('5610', '6400.00', '0.00', 'PF-2604'), mjLine('5610', '0.00', '6400.00')],
      journalEntryNo: 'JE-2627-00379',
      fileIds: [],
      allowedActions: [],
      meta: meta('2026-10-15T08:00:00Z'),
    },
  ];
}

/* Vendors, bills and payments ---------------------------------------------------------------- */

export const VENDORS = {
  cloudnest: { id: rid(3701), name: 'CloudNest Hosting Ltd' },
  gulshan: { id: rid(3702), name: 'Gulshan Office Space Ltd' },
  mahin: { id: rid(3703), name: 'Mahin Chowdhury' },
  bdcom: { id: rid(3704), name: 'Bdcom Online Ltd' },
  chowdhury: { id: rid(3705), name: 'Chowdhury and Associates' },
  sheba: { id: rid(3706), name: 'Sheba Cabs' },
  techpoint: { id: rid(3707), name: 'TechPoint BD' },
} as const;

export const PROJECT_IDS = {
  'PF-2601': rid(2001),
  'PF-2602': rid(2002),
  'PF-2603': rid(2003),
  'PF-2604': rid(2004),
  'PF-2605': rid(2005),
} as const;

type BillSeed = readonly [
  n: number,
  number: string | null,
  vendor: { id: string; name: string },
  description: string,
  accountCode: string,
  project: keyof typeof PROJECT_IDS | null,
  net: string,
  vat: string,
  gross: string,
  balanceDue: string,
  billDate: string,
  dueDate: string,
  status: VendorBill['status'],
  journalEntryNo: string | null,
];

const BILL_SEEDS: readonly BillSeed[] = [
  [
    187,
    'BILL-2627-00187',
    VENDORS.cloudnest,
    'Cloud hosting · October',
    '5410',
    'PF-2603',
    '160000.00',
    '24000.00',
    '184000.00',
    '184000.00',
    '2026-11-01',
    '2026-11-15',
    'pending_approval',
    null,
  ],
  [
    186,
    'BILL-2627-00186',
    VENDORS.gulshan,
    'Office rent · November',
    '6210',
    null,
    '225000.00',
    '0.00',
    '225000.00',
    '225000.00',
    '2026-11-01',
    '2026-11-05',
    'ready_to_pay',
    'JE-2627-00405',
  ],
  [
    184,
    'BILL-2627-00184',
    VENDORS.mahin,
    'UI design (freelance)',
    '5310',
    'PF-2602',
    '120000.00',
    '0.00',
    '120000.00',
    '120000.00',
    '2026-10-27',
    '2026-11-03',
    'ready_to_pay',
    'JE-2627-00407',
  ],
  [
    182,
    'BILL-2627-00182',
    VENDORS.bdcom,
    'Internet · October to December',
    '6610',
    null,
    '42400.00',
    '0.00',
    '42400.00',
    '42400.00',
    '2026-10-20',
    '2026-11-10',
    'ready_to_pay',
    'JE-2627-00396',
  ],
  [
    178,
    'BILL-2627-00178',
    VENDORS.chowdhury,
    'Interim audit fee',
    '5720',
    null,
    '160000.00',
    '0.00',
    '160000.00',
    '160000.00',
    '2026-10-10',
    '2026-11-20',
    'ready_to_pay',
    'JE-2627-00388',
  ],
  [
    185,
    'BILL-2627-00185',
    VENDORS.sheba,
    'Staff transport',
    '5610',
    null,
    '18400.00',
    '0.00',
    '18400.00',
    '0.00',
    '2026-10-24',
    '2026-10-31',
    'paid',
    'JE-2627-00403',
  ],
  [
    183,
    'BILL-2627-00183',
    VENDORS.techpoint,
    'Monitors (2)',
    '1610',
    null,
    '96000.00',
    '0.00',
    '96000.00',
    '0.00',
    '2026-10-18',
    '2026-10-25',
    'paid',
    'JE-2627-00399',
  ],
  [
    190,
    null,
    VENDORS.cloudnest,
    'Backup storage · November',
    '5410',
    'PF-2603',
    '18000.00',
    '2700.00',
    '20700.00',
    '20700.00',
    '2026-11-02',
    '2026-11-30',
    'draft',
    null,
  ],
];

export const DRAFT_BILL_ID = rid(3890);
export const PENDING_BILL_ID = rid(3887);

export function billsFor(role: SampleRole): readonly VendorBill[] {
  const isFinance = role === 'finance';
  return BILL_SEEDS.map(
    ([
      n,
      number,
      vendor,
      description,
      accountCode,
      project,
      net,
      vat,
      gross,
      balanceDue,
      billDate,
      dueDate,
      status,
      journalEntryNo,
    ]) => {
      let allowedActions: VendorBill['allowedActions'] = [];
      if (isFinance && status === 'draft') allowedActions = ['update', 'submit'];
      if (isFinance && status === 'ready_to_pay') allowedActions = ['pay'];
      return {
        id: rid(3700 + n),
        number,
        vendorId: vendor.id,
        vendorName: vendor.name,
        // eslint-disable-next-line security/detect-object-injection -- key is the project code union
        projectId: project === null ? null : PROJECT_IDS[project],
        accountCode,
        description,
        billDate,
        dueDate,
        net: bdt(net),
        vat: bdt(vat),
        gross: bdt(gross),
        balanceDue: bdt(balanceDue),
        journalEntryNo,
        status,
        approvalId: status === 'pending_approval' ? rid(1101) : null,
        fileIds: [rid(1301)],
        allowedActions,
        meta: meta(`${billDate}T05:00:00Z`),
      };
    },
  );
}

/** What the posting engine would post for each bill. Keyed by bill id. */
export const BILL_POSTINGS = new Map<string, PostingPreview>([
  [
    PENDING_BILL_ID,
    {
      lines: [
        {
          accountCode: '5410',
          accountName: nameOf('5410'),
          description: 'PF-2603',
          debit: bdt('160000.00'),
          credit: ZERO,
        },
        {
          accountCode: '1460',
          accountName: nameOf('1460'),
          description: null,
          debit: bdt('24000.00'),
          credit: ZERO,
        },
        {
          accountCode: '2110',
          accountName: nameOf('2110'),
          description: 'CloudNest Hosting Ltd',
          debit: ZERO,
          credit: bdt('184000.00'),
        },
      ],
    },
  ],
  [
    DRAFT_BILL_ID,
    {
      lines: [
        {
          accountCode: '5410',
          accountName: nameOf('5410'),
          description: 'PF-2603',
          debit: bdt('18000.00'),
          credit: ZERO,
        },
        {
          accountCode: '1460',
          accountName: nameOf('1460'),
          description: null,
          debit: bdt('2700.00'),
          credit: ZERO,
        },
        {
          accountCode: '2110',
          accountName: nameOf('2110'),
          description: 'CloudNest Hosting Ltd',
          debit: ZERO,
          credit: bdt('20700.00'),
        },
      ],
    },
  ],
]);

export const BANK = {
  cash: rid(3901),
  city: rid(3902),
  brac: rid(3903),
  bkash: rid(3904),
  nagad: rid(3905),
} as const;

/** A run the viewer prepared: SOD stops them approving it. */
export const OWN_RUN_ID = rid(3951);

export function paymentRunsFor(role: SampleRole): readonly PaymentRun[] {
  const isFinance = role === 'finance';
  return [
    {
      id: OWN_RUN_ID,
      number: 'PRN-2627-00014',
      paymentDate: '2026-11-04',
      bankAccountId: BANK.city,
      status: 'draft',
      approvalId: null,
      lines: [
        {
          billId: rid(3886),
          billNumber: 'BILL-2627-00186',
          payeeName: 'Gulshan Office Space Ltd',
          amount: bdt('225000.00'),
          tds: bdt('11250.00'),
          vds: ZERO,
          netPaid: bdt('213750.00'),
        },
        {
          billId: rid(3884),
          billNumber: 'BILL-2627-00184',
          payeeName: 'Mahin Chowdhury',
          amount: bdt('120000.00'),
          tds: bdt('12000.00'),
          vds: ZERO,
          netPaid: bdt('108000.00'),
        },
      ],
      totalNetPaid: bdt('321750.00'),
      preparedBy: PEOPLE.rafiq,
      journalEntryNo: null,
      allowedActions: isFinance ? ['update', 'submit'] : [],
      meta: meta('2026-11-02T06:00:00Z'),
    },
    {
      id: rid(3952),
      number: 'PRN-2627-00013',
      paymentDate: '2026-10-28',
      bankAccountId: BANK.city,
      status: 'paid',
      approvalId: rid(3691),
      lines: [
        {
          billId: rid(3869),
          billNumber: 'BILL-2627-00169',
          payeeName: 'CloudNest Hosting Ltd',
          amount: bdt('172500.00'),
          tds: bdt('8500.00'),
          vds: ZERO,
          netPaid: bdt('164000.00'),
        },
      ],
      totalNetPaid: bdt('164000.00'),
      preparedBy: PEOPLE.rafiq,
      journalEntryNo: 'JE-2627-00410',
      allowedActions: isFinance ? ['export_advice'] : [],
      meta: meta('2026-10-28T06:00:00Z'),
    },
  ];
}

export const PAYEES: readonly Payee[] = [
  {
    id: VENDORS.cloudnest.id,
    name: 'CloudNest Hosting Ltd',
    kind: 'vendor',
    paidThisFiscalYear: bdt('502600.00'),
    withheldThisFiscalYear: bdt('24500.00'),
    outstanding: bdt('204700.00'),
  },
  {
    id: VENDORS.gulshan.id,
    name: 'Gulshan Office Space Ltd',
    kind: 'vendor',
    paidThisFiscalYear: bdt('900000.00'),
    withheldThisFiscalYear: bdt('45000.00'),
    outstanding: bdt('225000.00'),
  },
  {
    id: VENDORS.mahin.id,
    name: 'Mahin Chowdhury',
    kind: 'freelancer',
    paidThisFiscalYear: bdt('220000.00'),
    withheldThisFiscalYear: bdt('22000.00'),
    outstanding: bdt('120000.00'),
  },
  {
    id: VENDORS.techpoint.id,
    name: 'TechPoint BD',
    kind: 'vendor',
    paidThisFiscalYear: bdt('96000.00'),
    withheldThisFiscalYear: bdt('4800.00'),
    outstanding: ZERO,
  },
  {
    id: VENDORS.sheba.id,
    name: 'Sheba Cabs',
    kind: 'vendor',
    paidThisFiscalYear: bdt('18400.00'),
    withheldThisFiscalYear: bdt('920.00'),
    outstanding: ZERO,
  },
];

const payment = (
  date: string,
  reference: string,
  documentNo: string,
  gross: string,
  tds: string,
  netPaid: string,
): PayeePayment => ({
  date,
  reference,
  documentNo,
  gross: bdt(gross),
  tds: bdt(tds),
  vds: ZERO,
  netPaid: bdt(netPaid),
});

export const PAYEE_PAYMENTS = new Map<string, readonly PayeePayment[]>([
  [
    VENDORS.cloudnest.id,
    [
      payment(
        '2026-10-28',
        'PMT-2627-00232',
        'BILL-2627-00169',
        '172500.00',
        '8500.00',
        '164000.00',
      ),
      payment(
        '2026-09-28',
        'PMT-2627-00201',
        'BILL-2627-00150',
        '165600.00',
        '7200.00',
        '158400.00',
      ),
    ],
  ],
  [
    VENDORS.gulshan.id,
    [
      payment(
        '2026-10-05',
        'PMT-2627-00214',
        'BILL-2627-00161',
        '225000.00',
        '11250.00',
        '213750.00',
      ),
    ],
  ],
  [
    VENDORS.mahin.id,
    [
      payment(
        '2026-10-05',
        'PMT-2627-00213',
        'BILL-2627-00158',
        '100000.00',
        '10000.00',
        '90000.00',
      ),
    ],
  ],
  [
    VENDORS.techpoint.id,
    [payment('2026-10-25', 'PMT-2627-00229', 'BILL-2627-00183', '96000.00', '4800.00', '91200.00')],
  ],
  [
    VENDORS.sheba.id,
    [payment('2026-10-31', 'PMT-2627-00233', 'BILL-2627-00185', '18400.00', '920.00', '17480.00')],
  ],
]);

export const PAYEE_STATEMENT: PartyStatement = {
  partyId: VENDORS.cloudnest.id,
  partyName: 'CloudNest Hosting Ltd',
  from: '2026-09-01',
  to: '2026-11-04',
  opening: bdt('-165600.00'),
  lines: [
    {
      date: '2026-09-28',
      reference: 'PMT-2627-00201',
      description: 'Payment, August bill',
      debit: bdt('165600.00'),
      credit: ZERO,
      balance: ZERO,
    },
    {
      date: '2026-10-01',
      reference: 'BILL-2627-00169',
      description: 'Cloud hosting · September',
      debit: ZERO,
      credit: bdt('172500.00'),
      balance: bdt('-172500.00'),
    },
    {
      date: '2026-10-28',
      reference: 'PMT-2627-00232',
      description: 'Payment, September bill',
      debit: bdt('172500.00'),
      credit: ZERO,
      balance: ZERO,
    },
    {
      date: '2026-11-01',
      reference: 'BILL-2627-00187',
      description: 'Cloud hosting · October',
      debit: ZERO,
      credit: bdt('184000.00'),
      balance: bdt('-184000.00'),
    },
  ],
  closing: bdt('-184000.00'),
};

const ageing = (id: string, name: string, notDue: string, d30: string, total: string) => ({
  partyId: id,
  partyName: name,
  notDue: bdt(notDue),
  days1To30: bdt(d30),
  days31To60: ZERO,
  days61To90: ZERO,
  over90: ZERO,
  total: bdt(total),
});

export const PAYABLES_AGEING: AgeingReport = {
  asOf: '2026-11-04',
  rows: [
    ageing(VENDORS.cloudnest.id, 'CloudNest Hosting Ltd', '184000.00', '0.00', '184000.00'),
    ageing(VENDORS.gulshan.id, 'Gulshan Office Space Ltd', '225000.00', '0.00', '225000.00'),
    ageing(VENDORS.mahin.id, 'Mahin Chowdhury', '0.00', '120000.00', '120000.00'),
    ageing(VENDORS.bdcom.id, 'Bdcom Online Ltd', '42400.00', '0.00', '42400.00'),
    ageing(VENDORS.chowdhury.id, 'Chowdhury and Associates', '160000.00', '0.00', '160000.00'),
  ],
  totals: {
    notDue: bdt('611400.00'),
    days1To30: bdt('120000.00'),
    days31To60: ZERO,
    days61To90: ZERO,
    over90: ZERO,
    total: bdt('731400.00'),
  },
};

/* Claims and advances ----------------------------------------------------------------------- */

export function claimsFor(role: SampleRole, userId: string): readonly ExpenseClaim[] {
  const all: ExpenseClaim[] = [
    {
      id: rid(4001),
      number: 'CLM-2627-00342',
      employee: PEOPLE.arif,
      projectId: PROJECT_IDS['PF-2604'],
      accountCode: '5610',
      description: 'Client visit to Chattogram · bus, hotel, meals',
      expenseDate: '2026-10-30',
      amount: bdt('12850.00'),
      status: 'pending_approval',
      approvalId: rid(1106),
      fileIds: [rid(1308), rid(1309)],
      journalEntryNo: null,
      allowedActions: [],
      meta: meta('2026-11-01T13:30:00Z', PEOPLE.arif.id),
    },
    {
      id: rid(4002),
      number: 'CLM-2627-00337',
      employee: PEOPLE.mehedi,
      projectId: PROJECT_IDS['PF-2601'],
      accountCode: '5620',
      description: 'Team lunch after UAT kick-off',
      expenseDate: '2026-10-21',
      amount: bdt('6400.00'),
      status: 'approved',
      approvalId: rid(4092),
      fileIds: [],
      journalEntryNo: 'JE-2627-00402',
      allowedActions: role === 'finance' ? ['pay'] : [],
      meta: meta('2026-10-22T05:00:00Z', PEOPLE.mehedi.id),
    },
    {
      id: rid(4003),
      number: null,
      employee: PEOPLE.arif,
      projectId: null,
      accountCode: '5610',
      description: 'Ride to the BRAC Bank branch',
      expenseDate: '2026-11-03',
      amount: bdt('450.00'),
      status: 'draft',
      approvalId: null,
      fileIds: [],
      journalEntryNo: null,
      allowedActions: role === 'employee' ? ['update', 'submit'] : [],
      meta: meta('2026-11-03T10:00:00Z', PEOPLE.arif.id),
    },
  ];
  // People outside finance see only their own claims.
  return role === 'finance' || role === 'partner'
    ? all
    : all.filter((claim) => claim.employee.id === userId);
}

export function advancesFor(role: SampleRole): readonly EmployeeAdvance[] {
  return [
    {
      id: rid(4101),
      number: 'ADV-2627-00011',
      employee: PEOPLE.mehedi,
      purpose: 'Field trip to Sylhet · Megh Telecom site survey',
      amount: bdt('45000.00'),
      settled: bdt('0.00'),
      outstanding: bdt('45000.00'),
      status: 'paid',
      approvalId: rid(4191),
      requestedAt: '2026-10-12T04:00:00Z',
      journalEntryNo: 'JE-2627-00386',
      allowedActions: role === 'finance' ? ['settle'] : [],
      meta: meta('2026-10-12T04:00:00Z'),
    },
  ];
}

/* Bank ---------------------------------------------------------------------------------------- */

const bankAccount = (
  id: string,
  name: string,
  kind: BankAccount['kind'],
  institution: string | null,
  accountNumber: string | null,
  ledgerAccountCode: string,
  balance: string,
  role: SampleRole,
): BankAccount => ({
  id,
  name,
  kind,
  institution,
  accountNumber,
  currency: 'BDT',
  ledgerAccountCode,
  balance: bdt(balance),
  active: true,
  allowedActions: role === 'finance' ? ['update'] : [],
  meta: meta('2026-07-01T04:00:00Z'),
});

export function bankAccountsFor(role: SampleRole): readonly BankAccount[] {
  return [
    bankAccount(
      BANK.city,
      'City Bank · current',
      'bank',
      'City Bank',
      '••••4821',
      '1120',
      '1845300.00',
      role,
    ),
    bankAccount(
      BANK.brac,
      'BRAC Bank · SND',
      'bank',
      'BRAC Bank',
      '••••1907',
      '1130',
      '912750.00',
      role,
    ),
    bankAccount(
      BANK.bkash,
      'bKash merchant',
      'bkash',
      'bKash',
      '••••0042',
      '1140',
      '138400.00',
      role,
    ),
    bankAccount(
      BANK.nagad,
      'Nagad merchant',
      'nagad',
      'Nagad',
      '••••0007',
      '1150',
      '42600.00',
      role,
    ),
    bankAccount(
      BANK.cash,
      'Cash in hand · head office',
      'cash',
      null,
      null,
      '1110',
      '64200.00',
      role,
    ),
  ];
}

export const TRANSFERS: readonly Transfer[] = [
  {
    id: rid(4201),
    number: 'TRF-2627-00009',
    date: '2026-10-29',
    fromAccountId: BANK.bkash,
    toAccountId: BANK.city,
    amount: bdt('125000.00'),
    charges: bdt('0.00'),
    note: 'bKash merchant settlement',
    journalEntryNo: 'JE-2627-00406',
    meta: meta('2026-10-29T06:00:00Z'),
  },
];

/** A matched line can be unmatched; Finance matches or posts the rest. */
export function statementLinesFor(role: SampleRole): readonly BankStatementLine[] {
  const can = role === 'finance';
  const line = (
    n: number,
    date: string,
    description: string,
    amount: string,
    status: BankStatementLine['status'],
    suggestedEntryNo: string | null,
    matchedEntryNo: string | null = null,
  ): BankStatementLine => ({
    id: rid(4300 + n),
    bankAccountId: BANK.city,
    date,
    description,
    amount: bdt(amount),
    status,
    matchedEntryNo,
    suggestedEntryNo,
    allowedActions: !can
      ? []
      : status === 'matched'
        ? ['unmatch']
        : suggestedEntryNo === null
          ? ['post_charge']
          : ['match'],
  });
  return [
    line(
      1,
      '2026-10-28',
      'NPSB to CloudNest Hosting Ltd',
      '-164000.00',
      'unmatched',
      'JE-2627-00410',
    ),
    line(
      2,
      '2026-10-30',
      'RTGS from Nodi Microfinance',
      '1332000.00',
      'unmatched',
      'JE-2627-00411',
    ),
    line(3, '2026-10-31', 'SMS alert charges · October', '-575.00', 'unmatched', null),
    line(4, '2026-10-31', 'Account maintenance fee', '-1150.00', 'unmatched', null),
    line(5, '2026-10-31', 'Interest credit', '3412.00', 'unmatched', null),
    line(
      6,
      '2026-10-29',
      'bKash merchant settlement',
      '125000.00',
      'matched',
      null,
      'JE-2627-00406',
    ),
  ];
}

export const RECONCILIATION: ReconciliationSummary = {
  bankAccountId: BANK.city,
  asOf: '2026-10-31',
  statementBalance: bdt('1847000.00'),
  ledgerBalance: bdt('1845300.00'),
  difference: bdt('1700.00'),
  unmatchedLines: 5,
};

export function chequesFor(role: SampleRole): readonly Cheque[] {
  const can = role === 'finance';
  return [
    {
      id: rid(4401),
      chequeNo: '0012457',
      direction: 'issued',
      bankAccountId: BANK.brac,
      partyName: 'Gulshan Office Space Ltd',
      amount: bdt('213750.00'),
      chequeDate: '2026-11-05',
      status: 'issued',
      allowedActions: can ? ['set_status'] : [],
      meta: meta('2026-11-02T06:00:00Z'),
    },
    {
      id: rid(4402),
      chequeNo: '7745210',
      direction: 'received',
      bankAccountId: BANK.city,
      partyName: 'Kaashful Retail',
      amount: bdt('230000.00'),
      chequeDate: '2026-10-29',
      status: 'cleared',
      allowedActions: [],
      meta: meta('2026-10-29T06:00:00Z'),
    },
  ];
}

/* Settings ------------------------------------------------------------------------------------- */

export const POSTING_RULES: readonly PostingRule[] = [
  {
    id: rid(4501),
    sourceType: 'vendor_bill',
    name: 'Vendor bill',
    lines: [
      { side: 'debit', accountId: accountId('5410'), amountField: 'net' },
      { side: 'debit', accountId: accountId('1460'), amountField: 'vat' },
      { side: 'credit', accountId: accountId('2110'), amountField: 'gross' },
    ],
    validFrom: '2026-07-01',
    validTo: null,
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(4502),
    sourceType: 'payment_run',
    name: 'Vendor payment with withholding',
    lines: [
      { side: 'debit', accountId: accountId('2110'), amountField: 'gross' },
      { side: 'credit', accountId: accountId('1120'), amountField: 'net_paid' },
      { side: 'credit', accountId: accountId('2250'), amountField: 'tds' },
      { side: 'credit', accountId: accountId('2260'), amountField: 'vds' },
    ],
    validFrom: '2026-07-01',
    validTo: null,
    meta: meta('2026-07-01T04:00:00Z'),
  },
];

export const EXCHANGE_RATES: readonly ExchangeRate[] = [
  {
    id: rid(4601),
    currency: 'USD',
    date: '2026-11-03',
    rate: '121.75',
    meta: meta('2026-11-03T04:00:00Z'),
  },
  {
    id: rid(4602),
    currency: 'EUR',
    date: '2026-11-03',
    rate: '132.4',
    meta: meta('2026-11-03T04:00:00Z'),
  },
  {
    id: rid(4603),
    currency: 'GBP',
    date: '2026-11-03',
    rate: '155.1',
    meta: meta('2026-11-03T04:00:00Z'),
  },
];

export const TAX_CODES: readonly TaxCode[] = [
  {
    id: rid(4701),
    code: 'VAT15',
    name: 'Standard VAT',
    rate: '0.15',
    validFrom: '2026-07-01',
    validTo: null,
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(4702),
    code: 'VAT0',
    name: 'Exempt',
    rate: '0',
    validFrom: '2026-07-01',
    validTo: null,
    meta: meta('2026-07-01T04:00:00Z'),
  },
];

const withholding = (
  n: number,
  kind: WithholdingRule['kind'],
  category: string,
  rate: string,
): WithholdingRule => ({
  id: rid(4800 + n),
  kind,
  category,
  rate,
  threshold: null,
  validFrom: '2026-07-01',
  validTo: null,
  meta: meta('2026-07-01T04:00:00Z'),
});

export const WITHHOLDING_RULES: readonly WithholdingRule[] = [
  withholding(1, 'tds', 'IT and cloud services', '0.1'),
  withholding(2, 'vds', 'IT and cloud services', '1'),
  withholding(3, 'tds', 'Internet and utilities', '0.05'),
  withholding(4, 'tds', 'Office rent', '0.05'),
  withholding(5, 'tds', 'Professional and freelance fees', '0.1'),
  withholding(6, 'tds', 'Supply of goods', '0.05'),
];

/* Reversals, written out as the posting engine would post them ------------------------------ */

const reversal = (
  originalId: string,
  originalNo: string,
  lines: JournalEntry['lines'],
  total: string,
): JournalEntry =>
  entry(99, 'JE-2627-00414', '2026-11-04', 'reversal', `Reversal of ${originalNo}`, lines, total, {
    periodId: periodId(5),
    reversalOfId: originalId,
  });

/** Original entry id → its reversal. An entry not listed here cannot be reversed. */
export const REVERSALS = new Map<string, JournalEntry>([
  [
    rid(3412),
    reversal(
      rid(3412),
      'JE-2627-00412',
      [
        jl('5110', '0.00', '1040000.00', 'Split by timesheets'),
        jl('6110', '0.00', '380000.00'),
        jl('2210', '1264300.00', '0.00'),
        jl('2230', '98700.00', '0.00'),
        jl('2240', '57000.00', '0.00'),
      ],
      '1420000.00',
    ),
  ],
  [
    rid(3411),
    reversal(
      rid(3411),
      'JE-2627-00411',
      [
        jl('1120', '0.00', '1332000.00'),
        jl('1340', '0.00', '108000.00', 'PF-2601'),
        jl('1210', '1440000.00', '0.00', 'PF-2601 · Nodi Microfinance'),
      ],
      '1440000.00',
    ),
  ],
  [
    rid(3410),
    reversal(
      rid(3410),
      'JE-2627-00410',
      [
        jl('2110', '0.00', '172500.00', 'CloudNest Hosting Ltd'),
        jl('1120', '164000.00', '0.00'),
        jl('2250', '8500.00', '0.00'),
      ],
      '172500.00',
    ),
  ],
  [
    rid(3409),
    reversal(
      rid(3409),
      'JE-2627-00409',
      [jl('3220', '0.00', '200000.00'), jl('1130', '200000.00', '0.00')],
      '200000.00',
    ),
  ],
]);

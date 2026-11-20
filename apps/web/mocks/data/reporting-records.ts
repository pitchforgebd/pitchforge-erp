/**
 * Financial statements and reports for the prototype's fictional company, July–October 2026.
 * Every figure is written out as the ledger would give it: the trial balance balances, the
 * balance sheet balances, and the profit in it equals the profit and loss. Nothing is added up
 * here; a test checks the figures agree with each other.
 */
import type {
  AccountLedger,
  FinancialStatement,
  Money,
  ReportColumn,
  ReportId,
  ReportSchedule,
  ReportTable,
  StatementRow,
  TrialBalance,
} from '@pitchforge/contracts';

import { CHART } from './chart.ts';
import { PEOPLE, bdt, rid } from './core-records.ts';
import { OCTOBER_RUN_ID } from './payroll-records.ts';
import type { SampleRole } from './sample-company.ts';

/** Partners and finance read the books (access-control matrix). */
export const readsReports = (role: SampleRole) => role === 'partner' || role === 'finance';

export const GENERATED_AT = '2026-11-20T05:00:00Z';

/** Same ids as the chart of accounts in the accounting mocks. */
export const accountId = (code: string) => rid(3000 + Number(code) / 10);
const accountName = new Map(CHART.map(([code, name]) => [code, name]));
const nameOf = (code: string) => accountName.get(code) ?? code;

/* Trial balance, 31 October 2026 ------------------------------------------------------------ */

/** code, debit, credit. */
const BALANCES: readonly (readonly [string, string, string])[] = [
  ['1110', '45000.00', '0.00'],
  ['1120', '6174850.00', '0.00'],
  ['1130', '2500000.00', '0.00'],
  ['1140', '38600.00', '0.00'],
  ['1210', '7215000.00', '0.00'],
  ['1340', '312500.00', '0.00'],
  ['1360', '480000.00', '0.00'],
  ['1460', '96300.00', '0.00'],
  ['1510', '60000.00', '0.00'],
  ['1520', '1060000.00', '0.00'],
  ['1610', '2940000.00', '0.00'],
  ['1690', '0.00', '1180000.00'],
  ['2110', '0.00', '845000.00'],
  ['2230', '0.00', '98700.00'],
  ['2240', '0.00', '228000.00'],
  ['2250', '0.00', '64200.00'],
  ['2270', '0.00', '418500.00'],
  ['2280', '0.00', '640000.00'],
  ['2290', '0.00', '350000.00'],
  ['3110', '0.00', '4000000.00'],
  ['3120', '0.00', '3500000.00'],
  ['3130', '0.00', '2500000.00'],
  ['3210', '0.00', '820000.00'],
  ['3220', '0.00', '640000.00'],
  ['3230', '0.00', '410000.00'],
  ['3300', '0.00', '1250000.00'],
  ['4110', '0.00', '10860000.00'],
  ['4120', '0.00', '1520000.00'],
  ['4910', '0.00', '46250.00'],
  ['5110', '4140000.00', '0.00'],
  ['5310', '420000.00', '0.00'],
  ['5410', '612000.00', '0.00'],
  ['5420', '248000.00', '0.00'],
  ['5610', '96500.00', '0.00'],
  ['6110', '1520000.00', '0.00'],
  ['6210', '960000.00', '0.00'],
  ['6310', '54200.00', '0.00'],
  ['6420', '185000.00', '0.00'],
  ['6510', '62300.00', '0.00'],
  ['6610', '132000.00', '0.00'],
  ['6710', '18400.00', '0.00'],
];

export const TRIAL_BALANCE: TrialBalance = {
  asOf: '2026-10-31',
  rows: BALANCES.map(([code, debit, credit]) => ({
    accountId: accountId(code),
    accountCode: code,
    accountName: nameOf(code),
    debit: bdt(debit),
    credit: bdt(credit),
  })),
  totalDebit: bdt('29370650.00'),
  totalCredit: bdt('29370650.00'),
  generatedAt: GENERATED_AT,
};

/* Statements ------------------------------------------------------------------------------- */

const row = (
  code: string | null,
  label: string,
  amount: string,
  comparative: string | null = null,
): StatementRow => ({
  label: code === null ? label : nameOf(code),
  accountId: code === null ? null : accountId(code),
  accountCode: code,
  amount: bdt(amount),
  comparative: comparative === null ? null : bdt(comparative),
  isTotal: false,
});

/** Jul–Oct 2026, with Jul–Oct 2025 alongside when asked. */
export function profitAndLoss(compare: boolean): FinancialStatement {
  const c = (value: string) => (compare ? value : null);
  return {
    title: 'Profit and loss',
    from: '2026-07-01',
    to: '2026-10-31',
    sections: [
      {
        title: 'Revenue',
        rows: [
          row('4110', '', '10860000.00', c('8150000.00')),
          row('4120', '', '1520000.00', c('1270000.00')),
        ],
        total: bdt('12380000.00'),
      },
      {
        title: 'Direct costs',
        rows: [
          row('5110', '', '4140000.00', c('3380000.00')),
          row('5310', '', '420000.00', c('310000.00')),
          row('5410', '', '612000.00', c('498000.00')),
          row('5420', '', '248000.00', c('205000.00')),
          row('5610', '', '96500.00', c('71200.00')),
        ],
        total: bdt('5516500.00'),
      },
      {
        title: 'Operating expenses',
        rows: [
          row('6110', '', '1520000.00', c('1310000.00')),
          row('6210', '', '960000.00', c('900000.00')),
          row('6310', '', '54200.00', c('47800.00')),
          row('6420', '', '185000.00', c('142000.00')),
          row('6510', '', '62300.00', c('48600.00')),
          row('6610', '', '132000.00', c('118500.00')),
          row('6710', '', '18400.00', c('15900.00')),
        ],
        total: bdt('2931900.00'),
      },
      {
        title: 'Other income',
        rows: [row('4910', '', '46250.00', c('31400.00'))],
        total: bdt('46250.00'),
      },
    ],
    result: bdt('3977850.00'),
    generatedAt: GENERATED_AT,
  };
}

/** 31 October 2026. The result is assets less liabilities and equity: zero. */
export const BALANCE_SHEET: FinancialStatement = {
  title: 'Balance sheet',
  from: null,
  to: '2026-10-31',
  sections: [
    {
      title: 'Assets',
      rows: [
        row(null, 'Cash and bank', '8758450.00'),
        row('1210', '', '7215000.00'),
        row('1340', '', '312500.00'),
        row('1360', '', '480000.00'),
        row('1460', '', '96300.00'),
        row('1510', '', '60000.00'),
        row('1520', '', '1060000.00'),
        row(null, 'Fixed assets, net of depreciation', '1760000.00'),
      ],
      total: bdt('19742250.00'),
    },
    {
      title: 'Liabilities',
      rows: [
        row('2110', '', '845000.00'),
        row('2230', '', '98700.00'),
        row('2240', '', '228000.00'),
        row('2250', '', '64200.00'),
        row('2270', '', '418500.00'),
        row('2280', '', '640000.00'),
        row('2290', '', '350000.00'),
      ],
      total: bdt('2644400.00'),
    },
    {
      title: 'Equity',
      rows: [
        row(null, 'Partner capital', '10000000.00'),
        row(null, 'Partner current accounts', '1870000.00'),
        row('3300', '', '1250000.00'),
        row(null, 'Profit for the period', '3977850.00'),
      ],
      total: bdt('17097850.00'),
    },
  ],
  result: bdt('0.00'),
  generatedAt: GENERATED_AT,
};

/** Jul–Oct 2026, indirect method. The result is the net change in cash. */
export const CASH_FLOW: FinancialStatement = {
  title: 'Cash flow statement',
  from: '2026-07-01',
  to: '2026-10-31',
  sections: [
    {
      title: 'Operating activities',
      rows: [
        row(null, 'Profit for the period', '3977850.00'),
        row(null, 'Depreciation', '62300.00'),
        row(null, 'Increase in receivables', '-2140000.00'),
        row(null, 'Increase in payables and provisions', '410300.00'),
      ],
      total: bdt('2310450.00'),
    },
    {
      title: 'Investing activities',
      rows: [row(null, 'Computers and network equipment', '-180500.00')],
      total: bdt('-180500.00'),
    },
    {
      title: 'Financing activities',
      rows: [row(null, 'Partner drawings', '-1150000.00')],
      total: bdt('-1150000.00'),
    },
    {
      title: 'Cash and bank',
      rows: [
        row(null, 'At 1 July 2026', '7778500.00'),
        row(null, 'At 31 October 2026', '8758450.00'),
      ],
      total: bdt('8758450.00'),
    },
  ],
  result: bdt('979950.00'),
  generatedAt: GENERATED_AT,
};

/* General ledger --------------------------------------------------------------------------- */

const ledgerRow = (
  date: string,
  entryNo: string,
  description: string,
  debit: string,
  credit: string,
  balance: string,
  source: { recordType: string; recordId: string } | null = null,
) => ({
  date,
  entryNo,
  description,
  source,
  debit: bdt(debit),
  credit: bdt(credit),
  balance: bdt(balance),
});

/** October on the current account, the one account the sample shows line by line. */
const BANK_OCTOBER: AccountLedger = {
  accountId: accountId('1120'),
  accountName: nameOf('1120'),
  from: '2026-10-01',
  to: '2026-10-31',
  opening: bdt('6024500.00'),
  rows: [
    ledgerRow(
      '2026-10-03',
      'JE-2627-00401',
      'Receipt · Nodi Microfinance',
      '880000.00',
      '0.00',
      '6904500.00',
    ),
    ledgerRow(
      '2026-10-08',
      'JE-2627-00404',
      'Payment run · vendor bills',
      '0.00',
      '412600.00',
      '6491900.00',
    ),
    ledgerRow(
      '2026-10-15',
      'JE-2627-00406',
      'Receipt · Shapla Foods',
      '1250000.00',
      '0.00',
      '7741900.00',
    ),
    ledgerRow('2026-10-22', 'JE-2627-00409', 'Partner drawing', '0.00', '300000.00', '7441900.00'),
    ledgerRow(
      '2026-10-31',
      'JE-2627-00412',
      'Payroll · October 2026',
      '0.00',
      '1264300.00',
      '6177600.00',
      {
        recordType: 'payroll_run',
        recordId: OCTOBER_RUN_ID,
      },
    ),
    ledgerRow('2026-10-31', 'JE-2627-00413', 'Bank charges', '0.00', '2750.00', '6174850.00'),
  ],
  closing: bdt('6174850.00'),
};

/** One account's ledger; other accounts show their closing balance and no lines in the sample. */
export function accountLedgerOf(id: string, from: string, to: string): AccountLedger | undefined {
  if (id === BANK_OCTOBER.accountId) return { ...BANK_OCTOBER, from, to };
  const balance = BALANCES.find(([code]) => accountId(code) === id);
  if (balance === undefined) return undefined;
  const [code, debit, credit] = balance;
  const amount = bdt(debit === '0.00' ? credit : debit);
  return {
    accountId: id,
    accountName: nameOf(code),
    from,
    to,
    opening: amount,
    rows: [],
    closing: amount,
  };
}

/* Tabular reports -------------------------------------------------------------------------- */

type Cell = string | Money | null;
type Kind = ReportColumn['kind'];

interface ReportSeed {
  readonly title: string;
  readonly columns: readonly (readonly [key: string, label: string, kind: Kind, salary?: true])[];
  readonly rows: readonly (readonly Cell[])[];
}

const m = bdt;

const REPORTS: ReadonlyMap<ReportId, ReportSeed> = new Map<ReportId, ReportSeed>([
  [
    'cash_book',
    {
      title: 'Cash book · current account, October 2026',
      columns: [
        ['date', 'Date', 'date'],
        ['entry', 'Entry', 'text'],
        ['description', 'Description', 'text'],
        ['in', 'Receipts', 'money'],
        ['out', 'Payments', 'money'],
        ['balance', 'Balance', 'money'],
      ],
      rows: BANK_OCTOBER.rows.map((line) => [
        line.date,
        line.entryNo,
        line.description,
        line.debit,
        line.credit,
        line.balance,
      ]),
    },
  ],
  [
    'budget_vs_actual',
    {
      title: 'Budget against actual by project',
      columns: [
        ['project', 'Project', 'text'],
        ['budget', 'Budget', 'money'],
        ['actual', 'Actual', 'money'],
        ['used', 'Used %', 'number'],
      ],
      rows: [
        ['Loan Origination Portal', m('6400000.00'), m('3712000.00'), '58'],
        ['Field Sales App', m('2800000.00'), m('2296000.00'), '82'],
        ['Data Platform AMC', m('1900000.00'), m('646000.00'), '34'],
        ['Store POS Rollout', m('3500000.00'), m('1295000.00'), '37'],
        ['HR Self-Service Portal', m('2200000.00'), m('440000.00'), '20'],
      ],
    },
  ],
  [
    'milestone_slippage',
    {
      title: 'Milestones past their planned date',
      columns: [
        ['project', 'Project', 'text'],
        ['milestone', 'Milestone', 'text'],
        ['planned', 'Planned', 'date'],
        ['forecast', 'Forecast', 'date'],
        ['late', 'Days late', 'number'],
      ],
      rows: [
        ['Field Sales App', 'Offline sync', '2026-10-31', '2026-11-28', '28'],
        ['Store POS Rollout', 'Pilot in 5 stores', '2026-11-15', '2026-11-30', '15'],
      ],
    },
  ],
  [
    'partner_distribution',
    {
      title: 'Profit distribution · Q1 2026–27',
      columns: [
        ['partner', 'Partner', 'text'],
        ['share', 'Share %', 'number'],
        ['amount', 'Distributed', 'money'],
      ],
      rows: [
        [PEOPLE.tanvir.name, '40', m('1098000.00')],
        [PEOPLE.farhana.name, '35', m('960750.00')],
        [PEOPLE.sabbir.name, '25', m('686250.00')],
      ],
    },
  ],
  [
    'payee_payments',
    {
      title: 'Payments by payee',
      columns: [
        ['payee', 'Payee', 'text'],
        ['gross', 'Gross', 'money'],
        ['tds', 'TDS', 'money'],
        ['vds', 'VDS', 'money'],
        ['paid', 'Paid', 'money'],
      ],
      rows: [
        ['CloudNest Hosting Ltd', m('152000.00'), m('7600.00'), m('19826.00'), m('124574.00')],
        ['Gulshan Office Space Ltd', m('240000.00'), m('12000.00'), m('31304.00'), m('196696.00')],
        ['Mahin Chowdhury', m('105000.00'), m('10500.00'), m('0.00'), m('94500.00')],
      ],
    },
  ],
  [
    'vat_summary',
    {
      title: 'VAT by month',
      columns: [
        ['month', 'Month', 'text'],
        ['output', 'Output VAT', 'money'],
        ['input', 'Input VAT', 'money'],
        ['payable', 'Net payable', 'money'],
      ],
      rows: [
        ['July 2026', m('96000.00'), m('21500.00'), m('74500.00')],
        ['August 2026', m('104500.00'), m('24800.00'), m('79700.00')],
        ['September 2026', m('101000.00'), m('23100.00'), m('77900.00')],
        ['October 2026', m('117000.00'), m('26900.00'), m('90100.00')],
      ],
    },
  ],
  [
    'withholding_summary',
    {
      title: 'Tax withheld from vendors',
      columns: [
        ['section', 'Section', 'text'],
        ['deducted', 'Deducted', 'money'],
        ['deposited', 'Deposited', 'money'],
        ['due', 'Still to deposit', 'money'],
      ],
      rows: [
        ['Supply of services (s.89)', m('28400.00'), m('21200.00'), m('7200.00')],
        ['Professional services (s.90)', m('22600.00'), m('16000.00'), m('6600.00')],
        ['House or office rent (s.109)', m('48000.00'), m('36000.00'), m('12000.00')],
      ],
    },
  ],
  [
    'pipeline',
    {
      title: 'Pipeline by stage',
      columns: [
        ['stage', 'Stage', 'text'],
        ['deals', 'Deals', 'number'],
        ['value', 'Value', 'money'],
        ['weighted', 'Weighted', 'money'],
      ],
      rows: [
        ['Qualified', '2', m('3150000.00'), m('787500.00')],
        ['Proposal', '2', m('4520000.00'), m('2034000.00')],
        ['Negotiation', '1', m('3600000.00'), m('2520000.00')],
      ],
    },
  ],
  [
    'win_loss',
    {
      title: 'Won and lost by quarter',
      columns: [
        ['quarter', 'Quarter', 'text'],
        ['won', 'Won', 'number'],
        ['lost', 'Lost', 'number'],
        ['rate', 'Win rate %', 'number'],
      ],
      rows: [
        ['Q4 2025–26', '3', '2', '60'],
        ['Q1 2026–27', '4', '3', '57'],
      ],
    },
  ],
  [
    'tenders_and_guarantees',
    {
      title: 'Tenders and guarantees',
      columns: [
        ['tender', 'Tender', 'text'],
        ['status', 'Status', 'text'],
        ['guarantee', 'Guarantee', 'money'],
        ['expires', 'Expires', 'date'],
      ],
      rows: [
        ['Billing and customer service system', 'Preparing', m('250000.00'), '2027-03-05'],
        ['Website and e-services revamp', 'Submitted', m('120000.00'), '2027-01-14'],
        ['Asset management system', 'Won', m('460000.00'), '2026-11-25'],
      ],
    },
  ],
  [
    'timesheets',
    {
      title: 'Timesheets · week of 16 November 2026',
      columns: [
        ['person', 'Person', 'text'],
        ['hours', 'Hours', 'number'],
        ['billable', 'Billable', 'number'],
        ['status', 'Status', 'text'],
      ],
      rows: [
        [PEOPLE.arif.name, '38', '34', 'Submitted'],
        [PEOPLE.mehedi.name, '40', '37', 'Approved'],
        [PEOPLE.sadia.name, '36', '30', 'Draft'],
        ['Tahmid Karim', '41', '38', 'Submitted'],
      ],
    },
  ],
  [
    'utilisation',
    {
      title: 'Utilisation · October 2026',
      columns: [
        ['person', 'Person', 'text'],
        ['available', 'Available hours', 'number'],
        ['billable', 'Billable hours', 'number'],
        ['rate', 'Utilisation %', 'number'],
      ],
      rows: [
        [PEOPLE.arif.name, '176', '148', '84'],
        [PEOPLE.mehedi.name, '176', '152', '86'],
        [PEOPLE.sadia.name, '160', '118', '74'],
        ['Tahmid Karim', '176', '161', '91'],
      ],
    },
  ],
  [
    'labour_cost',
    {
      title: 'Labour cost by project · Jul–Oct 2026',
      columns: [
        ['project', 'Project', 'text'],
        ['hours', 'Hours', 'number'],
        ['cost', 'Labour cost', 'money'],
      ],
      rows: [
        ['Loan Origination Portal', '2140', m('1712000.00')],
        ['Field Sales App', '1630', m('1304000.00')],
        ['Data Platform AMC', '610', m('488000.00')],
        ['Store POS Rollout', '795', m('636000.00')],
      ],
    },
  ],
  [
    'payroll_summary',
    {
      title: 'Payroll by department · October 2026',
      columns: [
        ['department', 'Department', 'text'],
        ['heads', 'People', 'number'],
        ['gross', 'Gross', 'money'],
        ['average', 'Average salary', 'money', true],
      ],
      rows: [
        ['Engineering', '14', m('1218000.00'), m('87000.00')],
        ['Delivery', '6', m('372000.00'), m('62000.00')],
        ['Finance and admin', '4', m('380000.00'), m('95000.00')],
      ],
    },
  ],
  [
    'hr_headcount',
    {
      title: 'Headcount by department',
      columns: [
        ['department', 'Department', 'text'],
        ['permanent', 'Permanent', 'number'],
        ['probation', 'Probation', 'number'],
        ['leavers', 'Leavers this year', 'number'],
      ],
      rows: [
        ['Engineering', '13', '1', '0'],
        ['Delivery', '5', '1', '1'],
        ['Finance and admin', '3', '1', '0'],
      ],
    },
  ],
  [
    'leave_summary',
    {
      title: 'Leave taken · Jul–Nov 2026',
      columns: [
        ['type', 'Leave type', 'text'],
        ['taken', 'Days taken', 'number'],
        ['pending', 'Days pending', 'number'],
      ],
      rows: [
        ['Casual leave', '48', '3'],
        ['Sick leave', '31', '0'],
        ['Earned leave', '62', '5'],
      ],
    },
  ],
  [
    'procurement_spend',
    {
      title: 'Spend by vendor · Jul–Nov 2026',
      columns: [
        ['vendor', 'Vendor', 'text'],
        ['orders', 'Orders', 'number'],
        ['spend', 'Spend', 'money'],
      ],
      rows: [
        ['TechPoint BD', '1', m('596000.00')],
        ['StarTech', '2', m('121200.00')],
        ['Ryans Computers', '2', m('103000.00')],
        ['Ad-Din Printing', '1', m('9600.00')],
      ],
    },
  ],
  [
    'asset_register',
    {
      title: 'Asset register · 31 October 2026',
      columns: [
        ['tag', 'Tag', 'text'],
        ['asset', 'Asset', 'text'],
        ['with', 'With', 'text'],
        ['cost', 'Cost', 'money'],
        ['book', 'Book value', 'money'],
      ],
      rows: [
        ['AST-0142', 'MacBook Pro 14"', PEOPLE.arif.name, m('265000.00'), m('176700.00')],
        ['AST-0139', 'Dell Latitude 7440', PEOPLE.mehedi.name, m('158000.00'), m('87800.00')],
        ['AST-0136', 'Lenovo ThinkPad T14', 'Rumana Sultana', m('132000.00'), m('66000.00')],
        ['AST-0128', 'Synology NAS DS923+', null, m('112000.00'), m('63000.00')],
        ['AST-0117', 'Conference display 65"', null, m('138000.00'), m('80500.00')],
      ],
    },
  ],
]);

/**
 * A report for one viewer. Salary columns go only to those who read salaries; the column is
 * left out of `columns` and of every row, as the API does.
 */
export function reportFor(report: ReportId, role: SampleRole): ReportTable | undefined {
  const seed = REPORTS.get(report);
  if (seed === undefined) return undefined;
  const shown = seed.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column[3] !== true || role === 'partner');
  return {
    report,
    title: seed.title,
    from: null,
    to: null,
    columns: shown.map(({ column: [key, label, kind] }) => ({ key, label, kind })),
    rows: seed.rows.map((cells) =>
      Object.fromEntries(shown.map(({ column: [key], index }) => [key, cells.at(index) ?? null])),
    ),
    generatedAt: GENERATED_AT,
  };
}

export const REPORT_IDS: readonly ReportId[] = [...REPORTS.keys()];

export const SCHEDULES: readonly ReportSchedule[] = [
  {
    id: rid(9701),
    report: 'cash_book',
    format: 'pdf',
    frequency: 'daily',
    recipientUserIds: [PEOPLE.rafiq.id],
    nextRunAt: '2026-11-21T02:00:00Z',
  },
  {
    id: rid(9702),
    report: 'budget_vs_actual',
    format: 'xlsx',
    frequency: 'monthly',
    recipientUserIds: [PEOPLE.farhana.id, PEOPLE.tanvir.id, PEOPLE.sabbir.id],
    nextRunAt: '2026-12-01T03:00:00Z',
  },
];

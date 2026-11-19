/**
 * Billing, tax and partner sample records from the prototype's fictional company. Totals,
 * balances, VAT, withholding and profit shares are written out as the server would send them;
 * nothing is calculated (CLAUDE.md rule 2).
 */
import type {
  AgeingReport,
  Challan,
  CreditNote,
  DistributionRun,
  EquityVersion,
  Partner,
  PartnerTransaction,
  PartyStatement,
  Receipt,
  SalesInvoice,
  VatReturn,
  WithdrawableBalance,
  WithholdingCertificate,
} from '@pitchforge/contracts';

import { BANK, PROJECT_IDS } from './accounting-records.ts';
import { PEOPLE, bdt, rid } from './core-records.ts';
import type { SampleRole } from './sample-company.ts';

const meta = (at: string, by = PEOPLE.rafiq.id) => ({
  createdAt: at,
  createdBy: by,
  updatedAt: at,
  updatedBy: by,
  version: 1,
});
const ZERO = bdt('0.00');

export const CLIENTS = {
  nodi: { id: rid(2101), name: 'Nodi Microfinance' },
  shapla: { id: rid(2102), name: 'Shapla Pharma' },
  megh: { id: rid(2103), name: 'Megh Telecom' },
  kaashful: { id: rid(2104), name: 'Kaashful Retail' },
  karnaphuli: { id: rid(2105), name: 'Karnaphuli Textiles' },
} as const;

/* Invoices ------------------------------------------------------------------------------------ */

type InvoiceSeed = readonly [
  n: number,
  number: string | null,
  client: { id: string; name: string },
  project: keyof typeof PROJECT_IDS,
  description: string,
  net: string,
  total: string,
  balanceDue: string,
  issueDate: string,
  dueDate: string,
  status: SalesInvoice['status'],
  source: SalesInvoice['source'],
  journalEntryNo: string | null,
];

const INVOICE_SEEDS: readonly InvoiceSeed[] = [
  [
    51,
    null,
    CLIENTS.nodi,
    'PF-2601',
    'Milestone 4 · UAT and client sign-off',
    '960000.00',
    '960000.00',
    '960000.00',
    '2026-11-04',
    '2026-11-19',
    'draft',
    'milestone',
    null,
  ],
  [
    50,
    'INV-2627-00050',
    CLIENTS.shapla,
    'PF-2602',
    'Milestone 3 · Android release (advance)',
    '662500.00',
    '662500.00',
    '662500.00',
    '2026-10-28',
    '2026-11-28',
    'posted',
    'milestone',
    'JE-2627-00404',
  ],
  [
    49,
    'INV-2627-00049',
    CLIENTS.megh,
    'PF-2603',
    'AMC · Q2 advance',
    '450000.00',
    '450000.00',
    '450000.00',
    '2026-10-26',
    '2026-11-25',
    'posted',
    'billing_plan',
    'JE-2627-00400',
  ],
  [
    48,
    'INV-2627-00048',
    CLIENTS.kaashful,
    'PF-2604',
    'October time and materials',
    '230000.00',
    '230000.00',
    '230000.00',
    '2026-10-31',
    '2026-11-15',
    'posted',
    'timesheet',
    'JE-2627-00413',
  ],
  [
    47,
    'INV-2627-00047',
    CLIENTS.nodi,
    'PF-2601',
    'Change request CR-02 · bulk disbursement',
    '420000.00',
    '420000.00',
    '420000.00',
    '2026-10-21',
    '2026-11-20',
    'posted',
    'manual',
    'JE-2627-00397',
  ],
  [
    46,
    'INV-2627-00046',
    CLIENTS.nodi,
    'PF-2601',
    'Annual hosting and support',
    '977500.00',
    '977500.00',
    '977500.00',
    '2026-10-20',
    '2026-12-05',
    'posted',
    'billing_plan',
    'JE-2627-00395',
  ],
  [
    45,
    'INV-2627-00045',
    CLIENTS.nodi,
    'PF-2601',
    'Milestone 3 · core build',
    '1440000.00',
    '1440000.00',
    '0.00',
    '2026-10-12',
    '2026-10-27',
    'paid',
    'milestone',
    'JE-2627-00390',
  ],
  [
    44,
    'INV-2627-00044',
    CLIENTS.kaashful,
    'PF-2604',
    'September time and materials',
    '127500.00',
    '127500.00',
    '127500.00',
    '2026-10-05',
    '2026-10-20',
    'posted',
    'timesheet',
    'JE-2627-00384',
  ],
  [
    43,
    'INV-2627-00043',
    CLIENTS.megh,
    'PF-2603',
    'AMC · Q1 balance',
    '150000.00',
    '150000.00',
    '150000.00',
    '2026-09-25',
    '2026-10-10',
    'posted',
    'billing_plan',
    'JE-2627-00371',
  ],
  [
    39,
    'INV-2627-00039',
    CLIENTS.shapla,
    'PF-2602',
    'Milestone 2 · backend and admin panel',
    '662500.00',
    '662500.00',
    '662500.00',
    '2026-09-05',
    '2026-09-20',
    'posted',
    'milestone',
    'JE-2627-00352',
  ],
];

export const DRAFT_INVOICE_ID = rid(5051);

export function invoicesFor(role: SampleRole): readonly SalesInvoice[] {
  const isFinance = role === 'finance';
  return INVOICE_SEEDS.map(
    ([
      n,
      number,
      client,
      project,
      description,
      net,
      total,
      balanceDue,
      issueDate,
      dueDate,
      status,
      source,
      journalEntryNo,
    ]) => {
      let allowedActions: SalesInvoice['allowedActions'] = [];
      if (isFinance && status === 'draft') allowedActions = ['update', 'post'];
      if (isFinance && status === 'posted') allowedActions = ['send_reminder'];
      return {
        id: rid(5000 + n),
        number,
        kind: description.includes('advance') ? 'advance' : 'standard',
        clientId: client.id,
        clientName: client.name,
        // eslint-disable-next-line security/detect-object-injection -- key is the project code union
        projectId: PROJECT_IDS[project],
        source,
        sourceId: null,
        issueDate,
        dueDate,
        lines: [{ description, quantity: '1', unitPrice: bdt(net), taxCodeId: null }],
        net: bdt(net),
        vat: ZERO,
        advanceAdjusted: ZERO,
        total: bdt(total),
        balanceDue: bdt(balanceDue),
        status,
        journalEntryNo,
        allowedActions,
        meta: meta(`${issueDate}T05:00:00Z`),
      };
    },
  );
}

/* Receipts ------------------------------------------------------------------------------------ */

export const DRAFT_RECEIPT_ID = rid(5102);

export function receiptsFor(role: SampleRole): readonly Receipt[] {
  return [
    {
      id: rid(5101),
      number: 'RCP-2627-00098',
      clientId: CLIENTS.nodi.id,
      clientName: CLIENTS.nodi.name,
      date: '2026-10-30',
      bankAccountId: BANK.city,
      amount: bdt('1332000.00'),
      ait: bdt('108000.00'),
      vds: ZERO,
      retention: ZERO,
      allocations: [{ invoiceId: rid(5045), amount: bdt('1440000.00') }],
      status: 'posted',
      journalEntryNo: 'JE-2627-00411',
      allowedActions: [],
      meta: meta('2026-10-30T08:00:00Z'),
    },
    {
      id: DRAFT_RECEIPT_ID,
      number: null,
      clientId: CLIENTS.kaashful.id,
      clientName: CLIENTS.kaashful.name,
      date: '2026-11-03',
      bankAccountId: BANK.city,
      amount: bdt('121125.00'),
      ait: bdt('6375.00'),
      vds: ZERO,
      retention: ZERO,
      allocations: [{ invoiceId: rid(5044), amount: bdt('127500.00') }],
      status: 'draft',
      journalEntryNo: null,
      allowedActions: role === 'finance' ? ['update', 'post'] : [],
      meta: meta('2026-11-03T06:00:00Z'),
    },
  ];
}

export function creditNotesFor(role: SampleRole): readonly CreditNote[] {
  return [
    {
      id: rid(5201),
      number: 'CN-2627-00003',
      kind: 'credit_note',
      invoiceId: rid(5044),
      date: '2026-10-25',
      amount: bdt('12500.00'),
      reason: 'Two days billed twice in September',
      status: 'posted',
      approvalId: rid(5291),
      journalEntryNo: 'JE-2627-00393',
      allowedActions: [],
      meta: meta('2026-10-25T06:00:00Z'),
    },
    {
      id: rid(5202),
      number: null,
      kind: 'write_off',
      invoiceId: rid(5039),
      date: '2026-11-04',
      amount: bdt('62500.00'),
      reason: 'Agreed discount for the late Android release',
      status: 'draft',
      approvalId: null,
      journalEntryNo: null,
      allowedActions: role === 'finance' ? ['submit'] : [],
      meta: meta('2026-11-04T05:00:00Z'),
    },
  ];
}

const ageing = (
  id: string,
  name: string,
  notDue: string,
  d30: string,
  d60: string,
  total: string,
) => ({
  partyId: id,
  partyName: name,
  notDue: bdt(notDue),
  days1To30: bdt(d30),
  days31To60: bdt(d60),
  days61To90: ZERO,
  over90: ZERO,
  total: bdt(total),
});

export const RECEIVABLES_AGEING: AgeingReport = {
  asOf: '2026-11-04',
  rows: [
    ageing(CLIENTS.nodi.id, 'Nodi Microfinance', '1397500.00', '0.00', '0.00', '1397500.00'),
    ageing(CLIENTS.shapla.id, 'Shapla Pharma', '662500.00', '0.00', '662500.00', '1325000.00'),
    ageing(CLIENTS.megh.id, 'Megh Telecom', '450000.00', '150000.00', '0.00', '600000.00'),
    ageing(CLIENTS.kaashful.id, 'Kaashful Retail', '230000.00', '127500.00', '0.00', '357500.00'),
  ],
  totals: {
    notDue: bdt('2740000.00'),
    days1To30: bdt('277500.00'),
    days31To60: bdt('662500.00'),
    days61To90: ZERO,
    over90: ZERO,
    total: bdt('3680000.00'),
  },
};

export const CLIENT_STATEMENT: PartyStatement = {
  partyId: CLIENTS.nodi.id,
  partyName: 'Nodi Microfinance',
  from: '2026-10-01',
  to: '2026-11-04',
  opening: ZERO,
  lines: [
    {
      date: '2026-10-12',
      reference: 'INV-2627-00045',
      description: 'Milestone 3 · core build',
      debit: bdt('1440000.00'),
      credit: ZERO,
      balance: bdt('1440000.00'),
    },
    {
      date: '2026-10-20',
      reference: 'INV-2627-00046',
      description: 'Annual hosting and support',
      debit: bdt('977500.00'),
      credit: ZERO,
      balance: bdt('2417500.00'),
    },
    {
      date: '2026-10-21',
      reference: 'INV-2627-00047',
      description: 'Change request CR-02',
      debit: bdt('420000.00'),
      credit: ZERO,
      balance: bdt('2837500.00'),
    },
    {
      date: '2026-10-30',
      reference: 'RCP-2627-00098',
      description: 'Receipt, AIT ৳1,08,000 deducted',
      debit: ZERO,
      credit: bdt('1440000.00'),
      balance: bdt('1397500.00'),
    },
  ],
  closing: bdt('1397500.00'),
};

/* Tax ------------------------------------------------------------------------------------------ */

export const VAT_RETURNS = new Map<string, VatReturn>([
  [
    '2026-10',
    {
      month: '2026-10',
      outputVat: bdt('264000.00'),
      inputVat: bdt('186000.00'),
      vdsDeducted: bdt('18200.00'),
      payable: bdt('59800.00'),
    },
  ],
  [
    '2026-09',
    {
      month: '2026-09',
      outputVat: bdt('231000.00'),
      inputVat: bdt('142500.00'),
      vdsDeducted: bdt('16400.00'),
      payable: bdt('72100.00'),
    },
  ],
]);

const certificate = (
  n: number,
  direction: WithholdingCertificate['direction'],
  kind: WithholdingCertificate['kind'],
  partyName: string,
  period: string,
  amount: string,
  certificateNo: string,
  fileId: string | null,
): WithholdingCertificate => ({
  id: rid(5300 + n),
  direction,
  kind,
  partyName,
  period,
  amount: bdt(amount),
  certificateNo,
  fileId,
  meta: meta('2026-11-01T05:00:00Z'),
});

export const WITHHOLDING_CERTIFICATES: readonly WithholdingCertificate[] = [
  certificate(
    1,
    'received',
    'tds',
    'Nodi Microfinance',
    '2026-10',
    '108000.00',
    'NMF/AIT/2026/0412',
    rid(5391),
  ),
  certificate(2, 'received', 'vds', 'Megh Telecom', '2026-09', '22500.00', 'MT-VDS-0931', null),
  certificate(
    3,
    'issued',
    'tds',
    'CloudNest Hosting Ltd',
    '2026-10',
    '8500.00',
    'PF/TDS/2627/0044',
    rid(5392),
  ),
  certificate(
    4,
    'issued',
    'tds',
    'Gulshan Office Space Ltd',
    '2026-10',
    '11250.00',
    'PF/TDS/2627/0043',
    rid(5393),
  ),
];

export const CHALLANS: readonly Challan[] = [
  {
    id: rid(5401),
    challanNo: 'CH-2627-0071',
    taxKind: 'salary_tds',
    period: '2026-10',
    amount: bdt('98700.00'),
    paidOn: '2026-11-03',
    journalEntryNo: 'JE-2627-00412',
    meta: meta('2026-11-03T05:00:00Z'),
  },
  {
    id: rid(5402),
    challanNo: 'CH-2627-0070',
    taxKind: 'vat',
    period: '2026-09',
    amount: bdt('72100.00'),
    paidOn: '2026-10-14',
    journalEntryNo: 'JE-2627-00382',
    meta: meta('2026-10-14T05:00:00Z'),
  },
  {
    id: rid(5403),
    challanNo: 'CH-2627-0069',
    taxKind: 'tds',
    period: '2026-09',
    amount: bdt('36500.00'),
    paidOn: '2026-10-14',
    journalEntryNo: 'JE-2627-00381',
    meta: meta('2026-10-14T05:00:00Z'),
  },
];

/* Partners ------------------------------------------------------------------------------------- */

export const PARTNER_IDS = {
  tanvir: rid(5501),
  farhana: rid(5502),
  sabbir: rid(5503),
} as const;

export function partnersFor(role: SampleRole): readonly Partner[] {
  const partner = (
    id: string,
    userId: string,
    name: string,
    equityPercent: string,
    capital: string,
    current: string,
    due: string,
  ): Partner => ({
    id,
    userId,
    name,
    active: true,
    equityPercent,
    capitalBalance: bdt(capital),
    currentBalance: bdt(current),
    dueFromPartner: bdt(due),
    allowedActions: role === 'partner' ? ['update'] : [],
    meta: meta('2026-07-01T04:00:00Z'),
  });
  return [
    partner(
      PARTNER_IDS.tanvir,
      PEOPLE.tanvir.id,
      'Tanvir Ahmed',
      '40',
      '1600000.00',
      '412000.00',
      '0.00',
    ),
    partner(
      PARTNER_IDS.farhana,
      PEOPLE.farhana.id,
      'Farhana Kabir',
      '35',
      '1400000.00',
      '560750.00',
      '0.00',
    ),
    partner(
      PARTNER_IDS.sabbir,
      PEOPLE.sabbir.id,
      'Sabbir Rahman',
      '25',
      '1000000.00',
      '686250.00',
      '150000.00',
    ),
  ];
}

export const WITHDRAWABLE = new Map<string, WithdrawableBalance>([
  [
    PARTNER_IDS.tanvir,
    {
      partnerId: PARTNER_IDS.tanvir,
      asOf: '2026-11-04',
      amount: bdt('412000.00'),
      warning: 'A drawing of ৳3,00,000 is waiting for approval.',
    },
  ],
  [
    PARTNER_IDS.farhana,
    { partnerId: PARTNER_IDS.farhana, asOf: '2026-11-04', amount: bdt('560750.00'), warning: null },
  ],
  [
    PARTNER_IDS.sabbir,
    {
      partnerId: PARTNER_IDS.sabbir,
      asOf: '2026-11-04',
      amount: bdt('536250.00'),
      warning: '৳1,50,000 is owed to the company and is held back.',
    },
  ],
]);

export const PARTNER_STATEMENT: PartyStatement = {
  partyId: PARTNER_IDS.farhana,
  partyName: 'Farhana Kabir · current account',
  from: '2026-07-01',
  to: '2026-11-04',
  opening: ZERO,
  lines: [
    {
      date: '2026-09-30',
      reference: 'DIST-2627-00002',
      description: 'Q1 profit share (35%)',
      debit: ZERO,
      credit: bdt('960750.00'),
      balance: bdt('-960750.00'),
    },
    {
      date: '2026-10-05',
      reference: 'DRW-2627-00006',
      description: 'Profit drawing',
      debit: bdt('200000.00'),
      credit: ZERO,
      balance: bdt('-760750.00'),
    },
    {
      date: '2026-10-27',
      reference: 'DRW-2627-00008',
      description: 'Profit drawing',
      debit: bdt('200000.00'),
      credit: ZERO,
      balance: bdt('-560750.00'),
    },
  ],
  closing: bdt('-560750.00'),
};

export const EQUITY_VERSIONS: readonly EquityVersion[] = [
  {
    id: rid(5601),
    validFrom: '2025-07-01',
    validTo: null,
    shares: [
      { partnerId: PARTNER_IDS.tanvir, percent: '40' },
      { partnerId: PARTNER_IDS.farhana, percent: '35' },
      { partnerId: PARTNER_IDS.sabbir, percent: '25' },
    ],
    reason: 'Sabbir Rahman increased his share after a capital contribution',
    meta: meta('2025-07-01T04:00:00Z', PEOPLE.tanvir.id),
  },
  {
    id: rid(5602),
    validFrom: '2023-07-01',
    validTo: '2025-06-30',
    shares: [
      { partnerId: PARTNER_IDS.tanvir, percent: '45' },
      { partnerId: PARTNER_IDS.farhana, percent: '35' },
      { partnerId: PARTNER_IDS.sabbir, percent: '20' },
    ],
    reason: 'Partnership deed',
    meta: meta('2023-07-01T04:00:00Z', PEOPLE.tanvir.id),
  },
];

/** A drawing larger than the partner's withdrawable balance, to show that refusal. */
export const TOO_LARGE_DRAWING_ID = rid(5703);

export function partnerTransactionsFor(
  role: SampleRole,
  userId: string,
): readonly PartnerTransaction[] {
  const own = (requestedBy: string) => role === 'partner' && requestedBy === userId;
  const draft = (id: string, amount: string, note: string): PartnerTransaction => ({
    id,
    number: null,
    partner: PEOPLE.farhana,
    type: 'drawing',
    date: '2026-11-04',
    amount: bdt(amount),
    bankAccountId: BANK.brac,
    note,
    status: 'draft',
    approvalId: null,
    requestedBy: PEOPLE.farhana,
    journalEntryNo: null,
    allowedActions: own(PEOPLE.farhana.id) ? ['update', 'submit'] : [],
    meta: meta('2026-11-04T05:00:00Z', PEOPLE.farhana.id),
  });
  return [
    {
      id: rid(5701),
      number: 'DRW-2627-00009',
      partner: PEOPLE.tanvir,
      type: 'drawing',
      date: '2026-11-01',
      amount: bdt('300000.00'),
      bankAccountId: BANK.city,
      note: 'Profit drawing',
      status: 'pending_approval',
      approvalId: rid(1104),
      requestedBy: PEOPLE.tanvir,
      journalEntryNo: null,
      allowedActions: [],
      meta: meta('2026-11-01T05:05:00Z', PEOPLE.tanvir.id),
    },
    draft(rid(5702), '50000.00', 'School fees'),
    draft(TOO_LARGE_DRAWING_ID, '900000.00', 'Flat down payment'),
    {
      id: rid(5704),
      number: 'DRW-2627-00008',
      partner: PEOPLE.farhana,
      type: 'drawing',
      date: '2026-10-27',
      amount: bdt('200000.00'),
      bankAccountId: BANK.brac,
      note: 'Profit drawing',
      status: 'posted',
      approvalId: rid(5791),
      requestedBy: PEOPLE.farhana,
      journalEntryNo: 'JE-2627-00409',
      allowedActions: [],
      meta: meta('2026-10-27T05:00:00Z', PEOPLE.farhana.id),
    },
    {
      id: rid(5705),
      number: 'PTX-2627-00004',
      partner: PEOPLE.sabbir,
      type: 'loan_to_partner',
      date: '2026-08-14',
      amount: bdt('150000.00'),
      bankAccountId: BANK.city,
      note: 'Short-term loan, repaid from the next distribution',
      status: 'posted',
      approvalId: rid(5792),
      requestedBy: PEOPLE.sabbir,
      journalEntryNo: 'JE-2627-00281',
      allowedActions: [],
      meta: meta('2026-08-14T05:00:00Z', PEOPLE.sabbir.id),
    },
    {
      id: rid(5706),
      number: 'CAP-2627-00002',
      partner: PEOPLE.sabbir,
      type: 'capital_contribution',
      date: '2026-07-10',
      amount: bdt('250000.00'),
      bankAccountId: BANK.city,
      note: null,
      status: 'posted',
      approvalId: null,
      requestedBy: PEOPLE.rafiq,
      journalEntryNo: 'JE-2627-00214',
      allowedActions: [],
      meta: meta('2026-07-10T05:00:00Z'),
    },
  ];
}

const share = (
  partnerId: string,
  partnerName: string,
  weightedPercent: string,
  amount: string,
) => ({
  partnerId,
  partnerName,
  weightedPercent,
  amount: bdt(amount),
});

export function distributionRunsFor(role: SampleRole): readonly DistributionRun[] {
  return [
    {
      id: rid(5801),
      number: 'DIST-2627-00002',
      periodFrom: '2026-07-01',
      periodTo: '2026-09-30',
      profit: bdt('3050000.00'),
      reservePercent: '10',
      reserve: bdt('305000.00'),
      distributable: bdt('2745000.00'),
      shares: [
        share(PARTNER_IDS.tanvir, 'Tanvir Ahmed', '40', '1098000.00'),
        share(PARTNER_IDS.farhana, 'Farhana Kabir', '35', '960750.00'),
        share(PARTNER_IDS.sabbir, 'Sabbir Rahman', '25', '686250.00'),
      ],
      status: 'posted',
      journalEntryNo: 'JE-2627-00388',
      allowedActions: role === 'partner' ? ['reverse'] : [],
      meta: meta('2026-10-02T05:00:00Z', PEOPLE.tanvir.id),
    },
  ];
}

/** What the server would preview for October to December. */
export const DISTRIBUTION_PREVIEW: DistributionRun = {
  id: rid(5802),
  number: null,
  periodFrom: '2026-10-01',
  periodTo: '2026-10-31',
  profit: bdt('2235000.00'),
  reservePercent: '10',
  reserve: bdt('223500.00'),
  distributable: bdt('2011500.00'),
  shares: [
    share(PARTNER_IDS.tanvir, 'Tanvir Ahmed', '40', '804600.00'),
    share(PARTNER_IDS.farhana, 'Farhana Kabir', '35', '704025.00'),
    share(PARTNER_IDS.sabbir, 'Sabbir Rahman', '25', '502875.00'),
  ],
  status: 'preview',
  journalEntryNo: null,
  allowedActions: ['post'],
  meta: meta('2026-11-04T05:00:00Z', PEOPLE.farhana.id),
};

/** A month with no VAT activity. */
export const EMPTY_VAT_RETURN: Omit<VatReturn, 'month'> = {
  outputVat: ZERO,
  inputVat: ZERO,
  vdsDeducted: ZERO,
  payable: ZERO,
};

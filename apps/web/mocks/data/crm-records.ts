/**
 * Sales and tender sample records from the prototype's fictional company. Quotation totals,
 * discounts, pipeline values and forecasts are written out as the server would send them.
 */
import type {
  ClientAccount,
  ClientContact,
  ClientOverview,
  Contract,
  Guarantee,
  Lead,
  Opportunity,
  PipelineStage,
  Quotation,
  SalesActivity,
  SalesForecast,
  StandardDocument,
  Tender,
  TenderChecklistItem,
} from '@pitchforge/contracts';

import { CLIENTS } from './billing-records.ts';
import { PEOPLE, bdt, rid } from './core-records.ts';
import type { SampleRole } from './sample-company.ts';

const meta = (at: string, by = PEOPLE.farhana.id) => ({
  createdAt: at,
  createdBy: by,
  updatedAt: at,
  updatedBy: by,
  version: 1,
});

/** Partners run sales; finance and project managers read (access-control matrix). */
export const canSell = (role: SampleRole) => role === 'partner';
export const readsSales = (role: SampleRole) =>
  role === 'partner' || role === 'finance' || role === 'pm';

const MORE = {
  dhakaMetro: { id: rid(2106), name: 'Dhaka Metro Logistics' },
  greenValley: { id: rid(2107), name: 'Green Valley School Group' },
} as const;

/* Leads ----------------------------------------------------------------------------------------- */

type LeadSeed = readonly [
  n: number,
  name: string,
  contact: string,
  source: string,
  need: string,
  owner: { id: string; name: string },
  next: string,
  status: Lead['status'],
];

const LEADS: readonly LeadSeed[] = [
  [
    14,
    'Bayside General Hospital',
    'Dr. Kamrul Hasan',
    'Referral',
    'Patient appointment and billing system',
    PEOPLE.farhana,
    '2026-11-04',
    'contacted',
  ],
  [
    13,
    'Padma Life Insurance',
    'Shamima Nasrin',
    'Website',
    'Agent commission portal',
    PEOPLE.tanvir,
    '2026-11-06',
    'new',
  ],
  [
    12,
    'Northern Agro Cooperative',
    'Abdul Malek',
    'Event · BASIS SoftExpo',
    'Farmer loan tracking',
    PEOPLE.sabbir,
    '2026-11-12',
    'new',
  ],
  [
    11,
    'Chattogram Port Users Forum',
    'Imtiaz Uddin',
    'Tender notice',
    'Container booking portal',
    PEOPLE.farhana,
    '2026-10-30',
    'qualified',
  ],
];

export function leadsFor(role: SampleRole): readonly Lead[] {
  if (!readsSales(role)) return [];
  return LEADS.map(([n, name, contactName, source, need, owner, nextFollowUp, status]) => ({
    id: rid(7000 + n),
    number: `LEAD-2627-000${String(n)}`,
    name,
    contactName,
    email: null,
    phone: null,
    source,
    need,
    owner,
    nextFollowUp,
    status,
    allowedActions: canSell(role)
      ? status === 'qualified'
        ? ['update', 'convert']
        : ['update']
      : [],
    meta: meta(`${nextFollowUp}T04:00:00Z`),
  }));
}

/* Clients --------------------------------------------------------------------------------------- */

const CLIENT_LIST = [
  CLIENTS.nodi,
  CLIENTS.shapla,
  CLIENTS.megh,
  CLIENTS.kaashful,
  CLIENTS.karnaphuli,
  MORE.dhakaMetro,
  MORE.greenValley,
];

export function clientsFor(role: SampleRole): readonly ClientAccount[] {
  if (!readsSales(role)) return [];
  return CLIENT_LIST.map((client, index) => ({
    id: client.id,
    name: client.name,
    tin: null,
    bin: null,
    paymentTermsDays: index < 2 ? 15 : 30,
    creditLimit: index < 4 ? bdt('3000000.00') : null,
    active: true,
    allowedActions: canSell(role) ? ['update', 'deactivate'] : [],
    meta: meta('2026-07-01T04:00:00Z'),
  }));
}

const contact = (
  n: number,
  clientId: string,
  name: string,
  roleName: string,
  primary: boolean,
): ClientContact => ({
  id: rid(7100 + n),
  clientId,
  name,
  role: roleName,
  email: null,
  phone: null,
  primary,
});

export const CONTACTS: readonly ClientContact[] = [
  contact(1, CLIENTS.nodi.id, 'Mahbub Alam', 'Chief Technology Officer', true),
  contact(2, CLIENTS.nodi.id, 'Rokeya Begum', 'Head of Finance', false),
  contact(3, CLIENTS.shapla.id, 'Zahid Hasan', 'Sales Director', true),
  contact(4, CLIENTS.megh.id, 'Nasreen Akter', 'IT Operations Manager', true),
];

const activity = (
  n: number,
  clientId: string,
  kind: SalesActivity['kind'],
  subject: string,
  at: string,
  owner: { id: string; name: string },
  followUpOn: string | null = null,
): SalesActivity => ({
  id: rid(7200 + n),
  clientId,
  opportunityId: null,
  kind,
  subject,
  at,
  followUpOn,
  owner,
});

export const ACTIVITIES: readonly SalesActivity[] = [
  activity(
    1,
    CLIENTS.nodi.id,
    'meeting',
    'Mobile app scope walk-through with the CTO',
    '2026-10-29T05:00:00Z',
    PEOPLE.tanvir,
    '2026-11-08',
  ),
  activity(
    2,
    CLIENTS.nodi.id,
    'call',
    'Confirmed UAT dates for the loan portal',
    '2026-11-01T08:30:00Z',
    PEOPLE.nusrat,
  ),
  activity(
    3,
    CLIENTS.shapla.id,
    'follow_up',
    'Chase the overdue milestone 2 payment',
    '2026-11-02T04:00:00Z',
    PEOPLE.farhana,
    '2026-11-05',
  ),
  activity(
    4,
    MORE.dhakaMetro.id,
    'note',
    'Asked for a 5% discount on revision 2',
    '2026-10-24T09:00:00Z',
    PEOPLE.farhana,
  ),
];

type OverviewNumbers = readonly [
  pipeline: string,
  receivable: string,
  projects: number,
  contracts: number,
];

const OVERVIEW_NUMBERS = new Map<string, OverviewNumbers>([
  [CLIENTS.nodi.id, ['3100000.00', '1397500.00', 1, 1]],
  [CLIENTS.shapla.id, ['1420000.00', '1325000.00', 1, 1]],
  [CLIENTS.megh.id, ['2200000.00', '600000.00', 1, 1]],
  [CLIENTS.kaashful.id, ['0.00', '357500.00', 1, 1]],
  [CLIENTS.karnaphuli.id, ['0.00', '0.00', 1, 1]],
  [MORE.dhakaMetro.id, ['3850000.00', '0.00', 0, 0]],
  [MORE.greenValley.id, ['950000.00', '0.00', 0, 0]],
]);

export function clientOverviewFor(role: SampleRole, clientId: string): ClientOverview | undefined {
  const client = clientsFor(role).find((item) => item.id === clientId);
  const numbers = OVERVIEW_NUMBERS.get(clientId);
  if (client === undefined || numbers === undefined) return undefined;
  const [pipeline, receivable, activeProjects, activeContracts] = numbers;
  return {
    client,
    contacts: CONTACTS.filter((item) => item.clientId === clientId),
    recentActivities: ACTIVITIES.filter((item) => item.clientId === clientId),
    openPipelineValue: bdt(pipeline),
    receivableBalance: bdt(receivable),
    activeProjects,
    activeContracts,
  };
}

/* Pipeline ------------------------------------------------------------------------------------- */

export const STAGES: readonly PipelineStage[] = [
  { id: rid(7301), name: 'Qualified', probabilityPercent: '25', closed: false },
  { id: rid(7302), name: 'Proposal', probabilityPercent: '45', closed: false },
  { id: rid(7303), name: 'Negotiation', probabilityPercent: '70', closed: false },
  { id: rid(7304), name: 'Won', probabilityPercent: '100', closed: true },
];

type DealSeed = readonly [
  n: number,
  name: string,
  client: { id: string; name: string },
  value: string,
  probability: string,
  owner: { id: string; name: string },
  stage: number,
  status: Opportunity['status'],
  close: string | null,
];

const DEALS: readonly DealSeed[] = [
  [
    31,
    'Branch network monitoring',
    CLIENTS.megh,
    '2200000.00',
    '30',
    PEOPLE.sabbir,
    0,
    'open',
    '2027-01-31',
  ],
  [
    32,
    'School management system',
    MORE.greenValley,
    '950000.00',
    '25',
    PEOPLE.tanvir,
    0,
    'open',
    '2027-02-15',
  ],
  [
    28,
    'Microfinance mobile app',
    CLIENTS.nodi,
    '3100000.00',
    '50',
    PEOPLE.tanvir,
    1,
    'open',
    '2026-12-15',
  ],
  [
    29,
    'Dealer ordering portal',
    CLIENTS.shapla,
    '1420000.00',
    '45',
    PEOPLE.farhana,
    1,
    'open',
    '2026-12-31',
  ],
  [
    25,
    'Warehouse management',
    MORE.dhakaMetro,
    '3850000.00',
    '70',
    PEOPLE.farhana,
    2,
    'open',
    '2026-11-30',
  ],
  [
    22,
    'HR self-service portal',
    CLIENTS.karnaphuli,
    '1580000.00',
    '100',
    PEOPLE.farhana,
    3,
    'won',
    '2026-10-15',
  ],
];

export function opportunitiesFor(role: SampleRole): readonly Opportunity[] {
  if (!readsSales(role)) return [];
  return DEALS.map(
    ([n, name, client, value, probabilityPercent, owner, stage, status, expectedCloseDate]) => ({
      id: rid(7400 + n),
      name,
      clientId: client.id,
      clientName: client.name,
      stageId: STAGES.at(stage)?.id ?? '',
      value: bdt(value),
      probabilityPercent,
      owner,
      expectedCloseDate,
      status,
      lostReason: null,
      competitor: null,
      projectId: status === 'won' ? rid(2005) : null,
      allowedActions: canSell(role) && status === 'open' ? ['update', 'move', 'win', 'lose'] : [],
      meta: meta('2026-10-01T04:00:00Z'),
    }),
  );
}

export const FORECAST: SalesForecast = {
  months: [
    { month: '2026-11', total: bdt('3850000.00'), weighted: bdt('2695000.00') },
    { month: '2026-12', total: bdt('4520000.00'), weighted: bdt('2189000.00') },
    { month: '2027-01', total: bdt('2200000.00'), weighted: bdt('660000.00') },
    { month: '2027-02', total: bdt('950000.00'), weighted: bdt('237500.00') },
  ],
};

/* Quotations and contracts --------------------------------------------------------------------- */

const quotationLine = (description: string, amount: string) => ({
  description,
  quantity: '1',
  unitPrice: bdt(amount),
});

export const DRAFT_QUOTATION_ID = rid(7532);

export function quotationsFor(role: SampleRole): readonly Quotation[] {
  if (!readsSales(role)) return [];
  const sell = canSell(role);
  return [
    {
      id: rid(7531),
      number: 'QUO-2627-00031',
      revision: 2,
      clientId: MORE.dhakaMetro.id,
      clientName: MORE.dhakaMetro.name,
      opportunityId: rid(7425),
      title: 'Warehouse management system',
      date: '2026-10-24',
      validUntil: '2026-11-23',
      lines: [
        quotationLine('Warehouse management system, build and rollout', '3600000.00'),
        quotationLine('First-year support', '450000.00'),
      ],
      discountPercent: '5',
      gross: bdt('4050000.00'),
      discount: bdt('202500.00'),
      vat: bdt('0.00'),
      total: bdt('3847500.00'),
      status: 'sent',
      approvalId: null,
      allowedActions: sell ? ['accept', 'new_version'] : [],
      meta: meta('2026-10-24T05:00:00Z'),
    },
    {
      id: DRAFT_QUOTATION_ID,
      number: null,
      revision: 1,
      clientId: CLIENTS.nodi.id,
      clientName: CLIENTS.nodi.name,
      opportunityId: rid(7428),
      title: 'Microfinance mobile app',
      date: '2026-10-30',
      validUntil: '2026-11-29',
      lines: [quotationLine('Mobile app for field officers and borrowers', '3100000.00')],
      discountPercent: '0',
      gross: bdt('3100000.00'),
      discount: bdt('0.00'),
      vat: bdt('0.00'),
      total: bdt('3100000.00'),
      status: 'draft',
      approvalId: null,
      allowedActions: sell ? ['update', 'submit'] : [],
      meta: meta('2026-10-30T05:00:00Z', PEOPLE.tanvir.id),
    },
    {
      id: rid(7529),
      number: 'QUO-2627-00029',
      revision: 3,
      clientId: CLIENTS.karnaphuli.id,
      clientName: CLIENTS.karnaphuli.name,
      opportunityId: rid(7422),
      title: 'HR self-service portal',
      date: '2026-10-02',
      validUntil: '2026-11-01',
      lines: [quotationLine('HR self-service portal', '1660000.00')],
      discountPercent: '4.8',
      gross: bdt('1660000.00'),
      discount: bdt('79680.00'),
      vat: bdt('0.00'),
      total: bdt('1580320.00'),
      status: 'accepted',
      approvalId: rid(7591),
      allowedActions: [],
      meta: meta('2026-10-02T05:00:00Z'),
    },
  ];
}

export function contractsFor(role: SampleRole): readonly Contract[] {
  if (!readsSales(role)) return [];
  const contract = (
    n: number,
    client: { id: string; name: string },
    title: string,
    value: string,
    startDate: string,
    endDate: string | null,
    renewalDate: string | null,
    retention: string,
    warrantyEndDate: string | null,
  ): Contract => ({
    id: rid(7600 + n),
    number: `CON-2627-0000${String(n)}`,
    clientId: client.id,
    clientName: client.name,
    title,
    value: bdt(value),
    startDate,
    endDate,
    renewalDate,
    retentionPercent: retention,
    warrantyEndDate,
    terms: null,
    status: 'active',
    fileIds: [rid(7690 + n)],
    allowedActions: canSell(role) ? ['update'] : [],
    meta: meta(`${startDate}T04:00:00Z`),
  });
  return [
    contract(
      1,
      CLIENTS.nodi,
      'Loan origination portal',
      '4800000.00',
      '2026-06-15',
      '2026-12-31',
      null,
      '5',
      '2027-06-30',
    ),
    contract(
      2,
      CLIENTS.megh,
      'Data platform annual maintenance',
      '1800000.00',
      '2026-07-01',
      '2027-06-30',
      '2027-05-31',
      '0',
      null,
    ),
    contract(
      3,
      CLIENTS.karnaphuli,
      'HR self-service portal',
      '1580320.00',
      '2026-10-20',
      '2027-03-31',
      null,
      '10',
      '2027-09-30',
    ),
  ];
}

/* Tenders --------------------------------------------------------------------------------------- */

export const TENDER_IDS = {
  water: rid(7701),
  skills: rid(7702),
  city: rid(7703),
  power: rid(7704),
} as const;

export function tendersFor(role: SampleRole): readonly Tender[] {
  if (!readsSales(role)) return [];
  const sell = canSell(role);
  const tender = (
    id: string,
    title: string,
    procuringEntity: string,
    egpId: string | null,
    method: string,
    estimate: string | null,
    deadline: string,
    team: readonly { id: string; name: string }[],
    status: Tender['status'],
    extra: Partial<Tender> = {},
  ): Tender => ({
    id,
    title,
    procuringEntity,
    egpId,
    method,
    estimatedValue: estimate === null ? null : bdt(estimate),
    submissionDeadline: deadline,
    internalDeadline: null,
    team: [...team],
    status,
    rank: null,
    ourPrice: null,
    winningPrice: null,
    contractId: null,
    allowedActions: !sell
      ? []
      : status === 'preparing'
        ? ['update']
        : status === 'submitted'
          ? ['record_outcome']
          : [],
    meta: meta('2026-10-01T04:00:00Z'),
    ...extra,
  });
  return [
    tender(
      TENDER_IDS.water,
      'Billing and customer service system',
      'Coastal Water Supply Authority',
      '1042877',
      'OTM',
      '12500000.00',
      '2026-11-05T05:00:00Z',
      [PEOPLE.farhana, PEOPLE.nusrat, PEOPLE.rafiq],
      'preparing',
      { internalDeadline: '2026-11-04T10:00:00Z' },
    ),
    tender(
      TENDER_IDS.skills,
      'Trainee tracking platform',
      'National Skills Development Agency',
      '1039554',
      'OTM',
      '9000000.00',
      '2026-11-19T05:00:00Z',
      [PEOPLE.tanvir, PEOPLE.sabbir],
      'preparing',
    ),
    tender(
      TENDER_IDS.city,
      'Website and e-services revamp',
      'City Corporation IT Cell',
      null,
      'RFP',
      '6000000.00',
      '2026-10-14T05:00:00Z',
      [PEOPLE.farhana],
      'submitted',
      { rank: 2, ourPrice: bdt('5640000.00') },
    ),
    tender(
      TENDER_IDS.power,
      'Asset management system',
      'Rural Power Board (sample)',
      '1021036',
      'OTM',
      '23000000.00',
      '2026-06-10T05:00:00Z',
      [PEOPLE.sabbir],
      'won',
      {
        rank: 1,
        ourPrice: bdt('21800000.00'),
        winningPrice: bdt('21800000.00'),
        contractId: rid(7605),
      },
    ),
  ];
}

const check = (
  n: number,
  document: string,
  done: boolean,
  owner: { id: string; name: string } | null = null,
): TenderChecklistItem => ({
  id: rid(7800 + n),
  document,
  owner,
  dueAt: done ? null : '2026-11-04T10:00:00Z',
  done,
  fileId: done ? rid(7880 + n) : null,
});

export const CHECKLISTS = new Map<string, readonly TenderChecklistItem[]>([
  [
    TENDER_IDS.water,
    [
      check(1, 'Trade licence (valid to Jun 2027)', true),
      check(2, 'TIN certificate', true),
      check(3, 'VAT registration (BIN)', true),
      check(4, 'Audited accounts FY 2024–25', true),
      check(5, 'Experience certificate · Nodi Microfinance', true),
      check(6, 'Bank solvency certificate', true),
      check(7, 'Bid security · ৳2,50,000 bank guarantee', true),
      check(8, 'Technical proposal', true, PEOPLE.nusrat),
      check(9, 'Financial proposal', false, PEOPLE.rafiq),
      check(10, 'Team CVs (6)', false, PEOPLE.nusrat),
    ],
  ],
  [
    TENDER_IDS.skills,
    [
      check(11, 'Trade licence', true),
      check(12, 'TIN certificate', true),
      check(13, 'Bid security · ৳1,80,000', false, PEOPLE.rafiq),
      check(14, 'Technical proposal', false, PEOPLE.sabbir),
      check(15, 'Methodology and work plan', false, PEOPLE.sabbir),
    ],
  ],
]);

export const STANDARD_DOCUMENTS: readonly StandardDocument[] = [
  {
    id: rid(7901),
    name: 'Trade licence',
    fileId: rid(7951),
    expiresOn: '2027-06-30',
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(7902),
    name: 'TIN certificate',
    fileId: rid(7952),
    expiresOn: null,
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(7903),
    name: 'VAT registration (BIN)',
    fileId: rid(7953),
    expiresOn: null,
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(7904),
    name: 'Audited accounts FY 2024–25',
    fileId: rid(7954),
    expiresOn: null,
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(7905),
    name: 'Bank solvency certificate',
    fileId: rid(7955),
    expiresOn: '2026-12-31',
    meta: meta('2026-07-01T04:00:00Z'),
  },
];

export function guaranteesFor(role: SampleRole): readonly Guarantee[] {
  if (!readsSales(role)) return [];
  const guarantee = (
    n: number,
    kind: Guarantee['kind'],
    tenderId: string | null,
    issuer: string,
    reference: string,
    amount: string,
    issuedOn: string,
    expiresOn: string,
  ): Guarantee => ({
    id: rid(7950 + n),
    kind,
    tenderId,
    contractId: kind === 'performance_guarantee' ? rid(7605) : null,
    issuer,
    reference,
    amount: bdt(amount),
    issuedOn,
    expiresOn,
    status: 'active',
    allowedActions: canSell(role) ? ['release', 'forfeit'] : [],
    meta: meta(`${issuedOn}T04:00:00Z`),
  });
  return [
    guarantee(
      1,
      'bid_security',
      TENDER_IDS.water,
      'City Bank',
      'CBL/BG/2026/1187',
      '250000.00',
      '2026-10-28',
      '2027-03-05',
    ),
    guarantee(
      2,
      'bid_security',
      TENDER_IDS.city,
      'BRAC Bank',
      'BBL/BG/2026/0912',
      '120000.00',
      '2026-10-10',
      '2027-01-14',
    ),
    guarantee(
      3,
      'performance_guarantee',
      TENDER_IDS.power,
      'City Bank',
      'CBL/PG/2026/0544',
      '460000.00',
      '2026-07-05',
      '2026-11-25',
    ),
  ];
}

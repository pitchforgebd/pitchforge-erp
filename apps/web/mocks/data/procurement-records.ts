/**
 * Procurement and asset sample records from the prototype: vendors, requisitions, purchase
 * orders, goods receipts, the asset register, depreciation, renewals and deposits. Totals and
 * book values are written out as the server would send them.
 */
import type {
  Asset,
  DepositGiven,
  DepreciationRun,
  GoodsReceipt,
  Licence,
  PurchaseOrder,
  Requisition,
  Vendor,
} from '@pitchforge/contracts';

import { VENDORS } from './accounting-records.ts';
import { bdt, rid } from './core-records.ts';
import { STAFF, seesPerson } from './hr-records.ts';
import type { SampleRole } from './sample-company.ts';

const meta = (at: string, by: string = STAFF.farhana.id) => ({
  createdAt: at,
  createdBy: by,
  updatedAt: at,
  updatedBy: by,
  version: 1,
});

/** Partners buy and approve; finance reads; anyone may raise a requisition. */
export const buys = (role: SampleRole) => role === 'partner';
export const readsPurchasing = (role: SampleRole) =>
  role === 'partner' || role === 'finance' || role === 'pm';

const MORE_VENDORS = {
  ryans: { id: rid(3708), name: 'Ryans Computers' },
  addin: { id: rid(3709), name: 'Ad-Din Printing' },
  startech: { id: rid(3710), name: 'StarTech' },
} as const;

/* Vendors ---------------------------------------------------------------------------------- */

type VendorSeed = readonly [
  vendor: { readonly id: string; readonly name: string },
  n: string,
  withholding: string | null,
  bank: string | null,
];

const VENDOR_SEEDS: readonly VendorSeed[] = [
  [VENDORS.cloudnest, '01', 'Supply of services (s.89)', '4471'],
  [VENDORS.gulshan, '02', 'House or office rent (s.109)', '2208'],
  [VENDORS.mahin, '03', 'Professional services (s.90)', '9013'],
  [VENDORS.bdcom, '04', 'Supply of services (s.89)', '7730'],
  [VENDORS.chowdhury, '05', 'Professional services (s.90)', '5521'],
  [VENDORS.sheba, '06', 'Transport (s.89)', null],
  [VENDORS.techpoint, '07', 'Supply of goods (s.89)', '3364'],
  [MORE_VENDORS.ryans, '08', 'Supply of goods (s.89)', '6612'],
  [MORE_VENDORS.addin, '09', 'Supply of goods (s.89)', null],
  [MORE_VENDORS.startech, '10', 'Supply of goods (s.89)', '1845'],
];

export function vendorsFor(role: SampleRole): readonly Vendor[] {
  if (role !== 'partner' && role !== 'finance') return [];
  return VENDOR_SEEDS.map(([vendor, n, withholdingCategory, bank]) => ({
    ...vendor,
    // Zero-led sample numbers, clearly not real registrations.
    tin: vendor === VENDORS.mahin ? null : `0000000037${n}`,
    bin: vendor === VENDORS.mahin ? null : `0000037${n}`,
    withholdingCategory,
    bankAccount: bank === null ? null : `••••••••${bank}`,
    active: true,
    allowedActions: buys(role) ? ['update', 'update_bank_details'] : [],
    meta: meta('2026-07-01T04:00:00Z', STAFF.rafiq.id),
  }));
}

/* Requisitions ----------------------------------------------------------------------------- */

const line = (description: string, quantity: string, price: string) => ({
  description,
  quantity,
  estimatedUnitPrice: bdt(price),
});

export const DRAFT_REQUISITION_ID = rid(9103);

export function requisitionsFor(role: SampleRole, viewerId: string): readonly Requisition[] {
  const rows: readonly Requisition[] = [
    {
      id: rid(9101),
      number: 'REQ-2627-00031',
      requestedBy: STAFF.nusrat,
      departmentId: rid(1902),
      projectId: null,
      purpose: 'Laptops for the four engineers joining in December',
      lines: [line('Laptop, Core i7, 32 GB', '4', '150000.00')],
      estimatedTotal: bdt('600000.00'),
      status: 'ordered',
      approvalId: rid(9191),
      allowedActions: [],
      meta: meta('2026-11-03T04:00:00Z', STAFF.nusrat.id),
    },
    {
      id: rid(9102),
      number: 'REQ-2627-00033',
      requestedBy: STAFF.mehedi,
      departmentId: rid(1902),
      projectId: rid(2001),
      purpose: 'Load-testing tool licence for the loan portal',
      lines: [line('Load-testing tool, annual licence', '1', '42000.00')],
      estimatedTotal: bdt('42000.00'),
      status: 'pending_approval',
      approvalId: rid(9192),
      allowedActions: [],
      meta: meta('2026-11-16T04:00:00Z', STAFF.mehedi.id),
    },
    {
      id: DRAFT_REQUISITION_ID,
      number: null,
      requestedBy: STAFF.arif,
      departmentId: rid(1902),
      projectId: rid(2001),
      purpose: 'External drives for test data',
      lines: [line('External SSD, 1 TB', '2', '9500.00')],
      estimatedTotal: bdt('19000.00'),
      status: 'draft',
      approvalId: null,
      allowedActions: viewerId === STAFF.arif.id ? ['update', 'submit'] : [],
      meta: meta('2026-11-19T04:00:00Z', STAFF.arif.id),
    },
  ];
  if (role === 'partner' || role === 'finance') return rows;
  if (role === 'pm') return rows.filter((row) => seesPerson(role, row.requestedBy.id));
  return rows.filter((row) => row.requestedBy.id === viewerId);
}

/* Purchase orders -------------------------------------------------------------------------- */

export const DRAFT_ORDER_ID = rid(9206);
export const APPROVED_ORDER_ID = rid(9205);
export const RECEIVED_ORDER_ID = rid(9202);

type OrderSeed = readonly [
  n: number,
  number: string | null,
  vendor: { readonly id: string; readonly name: string },
  date: string,
  lines: readonly (readonly [string, string, string])[],
  total: string,
  status: PurchaseOrder['status'],
  requisitionId?: string,
];

const ORDERS: readonly OrderSeed[] = [
  [
    1,
    'PO-2627-00061',
    VENDORS.techpoint,
    '2026-11-06',
    [['Laptop, Core i7, 32 GB', '4', '149000.00']],
    '596000.00',
    'pending_approval',
    rid(9101),
  ],
  [
    2,
    'PO-2627-00058',
    MORE_VENDORS.ryans,
    '2026-10-22',
    [['Network switch and UPS', '1', '84500.00']],
    '84500.00',
    'received',
  ],
  [
    3,
    'PO-2627-00055',
    MORE_VENDORS.addin,
    '2026-10-12',
    [['Tender document binding', '3', '3200.00']],
    '9600.00',
    'received',
  ],
  [
    4,
    'PO-2627-00052',
    MORE_VENDORS.startech,
    '2026-10-02',
    [['Monitor, 27 inch', '2', '48000.00']],
    '96000.00',
    'received',
  ],
  [
    5,
    'PO-2627-00062',
    MORE_VENDORS.startech,
    '2026-11-12',
    [['UPS replacement battery', '6', '4200.00']],
    '25200.00',
    'approved',
  ],
  [
    6,
    null,
    MORE_VENDORS.ryans,
    '2026-11-19',
    [['Meeting room webcam', '1', '18500.00']],
    '18500.00',
    'draft',
  ],
];

const orderActions = (
  role: SampleRole,
  status: PurchaseOrder['status'],
): PurchaseOrder['allowedActions'] => {
  if (!buys(role)) return [];
  if (status === 'draft') return ['update', 'submit'];
  if (status === 'approved' || status === 'partially_received') return ['amend', 'receive'];
  return [];
};

export function purchaseOrdersFor(role: SampleRole): readonly PurchaseOrder[] {
  if (!readsPurchasing(role)) return [];
  return ORDERS.map(([n, number, vendor, date, lines, total, status, requisitionId]) => ({
    id: rid(9200 + n),
    number,
    amendment: 0,
    vendorId: vendor.id,
    vendorName: vendor.name,
    requisitionId: requisitionId ?? null,
    date,
    lines: lines.map(([description, quantity, unitPrice]) => ({
      description,
      quantity,
      unitPrice: bdt(unitPrice),
    })),
    total: bdt(total),
    status,
    approvalId: status === 'draft' ? null : rid(9290 + n),
    allowedActions: orderActions(role, status),
    meta: meta(`${date}T04:00:00Z`),
  }));
}

export const GOODS_RECEIPTS: readonly GoodsReceipt[] = [
  [1, 'GRN-2627-00041', 2, '2026-10-27', 'Network switch and UPS', '1'],
  [2, 'GRN-2627-00040', 3, '2026-10-15', 'Tender document binding', '3'],
  [3, 'GRN-2627-00038', 4, '2026-10-06', 'Monitor, 27 inch', '2'],
].map(([n, number, order, receivedOn, description, quantity]) => ({
  id: rid(9300 + Number(n)),
  number: String(number),
  purchaseOrderId: rid(9200 + Number(order)),
  receivedOn: String(receivedOn),
  receivedBy: STAFF.rafiq,
  lines: [{ description: String(description), quantity: String(quantity) }],
  meta: meta(`${String(receivedOn)}T08:00:00Z`, STAFF.rafiq.id),
}));

/* Assets ----------------------------------------------------------------------------------- */

type AssetSeed = readonly [
  n: number,
  tag: string,
  name: string,
  category: string,
  purchasedOn: string,
  cost: string,
  bookValue: string,
  rate: string,
  assignedTo: { readonly id: string; readonly name: string } | null,
];

const ASSETS: readonly AssetSeed[] = [
  [
    1,
    'AST-0142',
    'MacBook Pro 14"',
    'Computers',
    '2025-02-14',
    '265000.00',
    '176700.00',
    '0.3333',
    STAFF.arif,
  ],
  [
    2,
    'AST-0139',
    'Dell Latitude 7440',
    'Computers',
    '2024-11-02',
    '158000.00',
    '87800.00',
    '0.3333',
    STAFF.mehedi,
  ],
  [
    3,
    'AST-0136',
    'Lenovo ThinkPad T14',
    'Computers',
    '2024-09-15',
    '132000.00',
    '66000.00',
    '0.3333',
    STAFF.rumana,
  ],
  [
    4,
    'AST-0128',
    'Synology NAS DS923+',
    'Servers and network',
    '2024-06-20',
    '112000.00',
    '63000.00',
    '0.25',
    null,
  ],
  [
    5,
    'AST-0117',
    'Conference display 65"',
    'Office equipment',
    '2023-12-01',
    '138000.00',
    '80500.00',
    '0.2',
    null,
  ],
];

export function assetsFor(role: SampleRole, viewerId: string): readonly Asset[] {
  return ASSETS.filter(
    ([, , , , , , , , person]) => role !== 'employee' || person?.id === viewerId,
  ).map(([n, tag, name, category, purchasedOn, cost, bookValue, annualRate, assignedTo]) => ({
    id: rid(9400 + n),
    tag,
    name,
    category,
    purchasedOn,
    cost: bdt(cost),
    bookValue: bdt(bookValue),
    method: 'straight_line',
    annualRate,
    assignedTo,
    status: assignedTo === null ? 'in_store' : 'assigned',
    allowedActions: !buys(role)
      ? []
      : assignedTo === null
        ? ['update', 'assign']
        : ['update', 'return'],
    meta: meta(`${purchasedOn}T04:00:00Z`, STAFF.rafiq.id),
  }));
}

export const DEPRECIATION_RUNS: readonly DepreciationRun[] = [
  ['2026-10', '15800.00', 'JE-2627-00441'],
  ['2026-09', '15800.00', 'JE-2627-00398'],
  ['2026-08', '15350.00', 'JE-2627-00322'],
].map(([month, total, journalEntryNo], index) => ({
  id: rid(9501 + index),
  month: String(month),
  assets: 31,
  total: bdt(String(total)),
  status: 'posted' as const,
  journalEntryNo: String(journalEntryNo),
  allowedActions: [],
  meta: meta(`${String(month)}-28T10:00:00Z`, STAFF.rafiq.id),
}));

/** What previewing November returns; posting turns it into a journal entry. */
export const NOVEMBER_DEPRECIATION: DepreciationRun = {
  id: rid(9510),
  month: '2026-11',
  assets: 31,
  total: bdt('15800.00'),
  status: 'preview',
  journalEntryNo: null,
  allowedActions: ['post'],
  meta: meta('2026-11-20T05:00:00Z', STAFF.rafiq.id),
};

/** Months whose periods are locked (July to September). */
export const LOCKED_MONTHS: ReadonlySet<string> = new Set(['2026-07', '2026-08', '2026-09']);

/* Renewals and deposits -------------------------------------------------------------------- */

export const LICENCES: readonly Licence[] = [
  ['GitHub Team, 18 seats', 'subscription', null, '62400.00', '2026-12-14'],
  ['Figma Professional, 4 seats', 'subscription', null, '27200.00', '2026-11-28'],
  ['Cloud business support', 'subscription', VENDORS.cloudnest.id, '38500.00', '2026-12-01'],
  ['pitchforge.example domain', 'domain', VENDORS.bdcom.id, '1800.00', '2027-01-09'],
].map(([name, kind, vendorId, cost, renewsOn], index) => ({
  id: rid(9601 + index),
  name: String(name),
  kind: kind as Licence['kind'],
  vendorId: vendorId ?? null,
  cost: bdt(String(cost)),
  renewsOn: String(renewsOn),
  meta: meta('2026-07-01T04:00:00Z', STAFF.rafiq.id),
}));

export const DEPOSITS_GIVEN: readonly DepositGiven[] = [
  {
    id: rid(9651),
    kind: 'deposit',
    party: VENDORS.gulshan.name,
    purpose: 'Office rent security deposit, Gulshan',
    amount: bdt('600000.00'),
    givenOn: '2024-07-01',
    expiresOn: null,
    status: 'active',
    meta: meta('2024-07-01T04:00:00Z', STAFF.rafiq.id),
  },
  {
    id: rid(9652),
    kind: 'guarantee',
    party: 'Rural Power Board (sample)',
    purpose: 'Performance guarantee CBL/PG/2026/0544',
    amount: bdt('460000.00'),
    givenOn: '2026-07-05',
    expiresOn: '2026-11-25',
    status: 'active',
    meta: meta('2026-07-05T04:00:00Z', STAFF.rafiq.id),
  },
];

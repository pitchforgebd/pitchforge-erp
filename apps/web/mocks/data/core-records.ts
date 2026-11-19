/**
 * Core sample records from the prototype's fictional company: approvals, audit, users, roles
 * and settings. Fixed data only: who may act on what is written out per record, never worked
 * out here (CLAUDE.md rule 2).
 */
import type {
  ApprovalRequest,
  ApprovalRule,
  AuditEntry,
  Company,
  Dashboard,
  DashboardKind,
  DeviceSession,
  Holiday,
  NumberSeries,
  OrgUnit,
  ReminderRule,
  Role,
  SearchResult,
  User,
} from '@pitchforge/contracts';

import type { SampleRole } from './sample-company.ts';

export const rid = (n: number) => `0190f2a4-7c3b-7d2e-8f00-${String(n).padStart(12, '0')}`;
export const bdt = (amount: string) => ({ amount, currency: 'BDT' as const });
const meta = (at: string, by = rid(1)) => ({
  createdAt: at,
  createdBy: by,
  updatedAt: at,
  updatedBy: by,
  version: 1,
});

export const PEOPLE = {
  rafiq: { id: rid(1), name: 'Rafiq Islam' },
  farhana: { id: rid(2), name: 'Farhana Kabir' },
  nusrat: { id: rid(3), name: 'Nusrat Jahan' },
  arif: { id: rid(4), name: 'Arif Hossain' },
  tanvir: { id: rid(5), name: 'Tanvir Ahmed' },
  sabbir: { id: rid(6), name: 'Sabbir Rahman' },
  mehedi: { id: rid(7), name: 'Mehedi Hasan' },
  sadia: { id: rid(8), name: 'Sadia Akter' },
} as const;

/* Approvals --------------------------------------------------------------------------------- */

interface SampleApproval {
  readonly request: Omit<ApprovalRequest, 'allowedActions'>;
  /** The sample role whose turn it is, or null once decided. */
  readonly waitingOn: SampleRole | 'other' | null;
  /** Sample role of the requester: nobody approves their own request. */
  readonly requestedByRole: SampleRole | 'other';
  /** Roles that already acted, so the inbox can show it as decided for them. */
  readonly actedBy?: readonly SampleRole[];
}

const line = (
  code: string,
  name: string,
  description: string | null,
  debit: string,
  credit: string,
) => ({
  accountCode: code,
  accountName: name,
  description,
  debit: bdt(debit),
  credit: bdt(credit),
});

const step = (
  approver: { id: string; name: string } | null,
  roleName: string | null,
  status: 'waiting' | 'current' | 'approved' | 'rejected' | 'returned' | 'skipped',
  decidedAt: string | null = null,
  comment: string | null = null,
) => ({ approver, roleName, status, decidedAt, comment });

const SAMPLE_APPROVALS: readonly SampleApproval[] = [
  {
    waitingOn: 'partner',
    requestedByRole: 'finance',
    request: {
      id: rid(1101),
      reference: 'BILL-2627-00187',
      sourceType: 'vendor_bill',
      sourceId: rid(1201),
      title: 'CloudNest Hosting Ltd · October cloud hosting',
      amount: bdt('184000.00'),
      status: 'pending',
      requestedBy: PEOPLE.rafiq,
      requestedAt: '2026-11-01T10:42:00Z',
      ruleName: 'Bills above ৳1,00,000 need a Partner',
      steps: [
        step(PEOPLE.rafiq, 'Finance', 'approved', '2026-11-01T10:42:00Z', 'Submitted'),
        step(null, 'Partner', 'current'),
      ],
      posting: {
        lines: [
          line('5410', 'Cloud and hosting', 'PF-2603', '160000.00', '0.00'),
          line('1460', 'Input VAT', null, '24000.00', '0.00'),
          line('2110', 'Accounts payable', 'CloudNest Hosting Ltd', '0.00', '184000.00'),
        ],
      },
      fileIds: [rid(1301), rid(1302)],
      meta: meta('2026-11-01T10:42:00Z'),
    },
  },
  {
    waitingOn: 'partner',
    requestedByRole: 'finance',
    request: {
      id: rid(1102),
      reference: 'JV-2627-00021',
      sourceType: 'manual_journal',
      sourceId: rid(1202),
      title: 'October accrual · statutory audit fee',
      amount: bdt('75000.00'),
      status: 'pending',
      requestedBy: PEOPLE.rafiq,
      requestedAt: '2026-11-02T03:10:00Z',
      ruleName: 'All manual journals need a Partner',
      steps: [
        step(PEOPLE.rafiq, 'Finance', 'approved', '2026-11-02T03:10:00Z', 'Submitted'),
        step(null, 'Partner', 'current'),
      ],
      posting: {
        lines: [
          line('5720', 'Audit and professional fees', null, '75000.00', '0.00'),
          line('2190', 'Accrued expenses', 'Chowdhury and Associates', '0.00', '75000.00'),
        ],
      },
      fileIds: [rid(1303)],
      meta: meta('2026-11-02T03:10:00Z'),
    },
  },
  {
    waitingOn: 'partner',
    requestedByRole: 'pm',
    request: {
      id: rid(1103),
      reference: 'PO-2627-00061',
      sourceType: 'purchase_order',
      sourceId: rid(1203),
      title: '4 laptops for new engineers · TechPoint BD',
      amount: bdt('596000.00'),
      status: 'pending',
      requestedBy: PEOPLE.nusrat,
      requestedAt: '2026-10-31T04:12:00Z',
      ruleName: 'Purchases above ৳2,00,000 need a Partner',
      steps: [
        step(PEOPLE.nusrat, 'Project manager', 'approved', '2026-10-31T04:12:00Z', 'Requested'),
        step(null, 'Procurement', 'approved', '2026-10-31T09:30:00Z', 'Quotes compared (3)'),
        step(null, 'Partner', 'current'),
      ],
      posting: null,
      fileIds: [rid(1304), rid(1305), rid(1306)],
      meta: meta('2026-10-31T04:12:00Z', rid(3)),
    },
  },
  {
    waitingOn: 'other',
    requestedByRole: 'other',
    actedBy: ['partner'],
    request: {
      id: rid(1104),
      reference: 'DRW-2627-00009',
      sourceType: 'partner_transaction',
      sourceId: rid(1204),
      title: 'Profit drawing · Tanvir Ahmed',
      amount: bdt('300000.00'),
      status: 'pending',
      requestedBy: PEOPLE.tanvir,
      requestedAt: '2026-11-01T05:05:00Z',
      ruleName: 'Drawings above ৳1,50,000 need every other partner',
      steps: [
        step(PEOPLE.tanvir, 'Partner', 'approved', '2026-11-01T05:05:00Z', 'Requested'),
        step(PEOPLE.farhana, 'Partner', 'approved', '2026-11-01T08:20:00Z', null),
        step(PEOPLE.sabbir, 'Partner', 'current'),
      ],
      posting: {
        lines: [
          line('3210', 'Current · Tanvir Ahmed', null, '300000.00', '0.00'),
          line('1120', 'City Bank ••4821', null, '0.00', '300000.00'),
        ],
      },
      fileIds: [rid(1307)],
      meta: meta('2026-11-01T05:05:00Z', rid(5)),
    },
  },
  {
    waitingOn: 'pm',
    requestedByRole: 'employee',
    request: {
      id: rid(1105),
      reference: 'LV-2627-00118',
      sourceType: 'leave_request',
      sourceId: rid(1205),
      title: 'Casual leave · 09–10 Nov 2026 (2 days)',
      amount: null,
      status: 'pending',
      requestedBy: PEOPLE.arif,
      requestedAt: '2026-11-02T02:15:00Z',
      ruleName: 'Leave goes to the line manager',
      steps: [
        step(PEOPLE.arif, 'Employee', 'approved', '2026-11-02T02:15:00Z', 'Requested'),
        step(PEOPLE.nusrat, 'Line manager', 'current'),
      ],
      posting: null,
      fileIds: [],
      meta: meta('2026-11-02T02:15:00Z', rid(4)),
    },
  },
  {
    waitingOn: 'pm',
    requestedByRole: 'employee',
    request: {
      id: rid(1106),
      reference: 'CLM-2627-00342',
      sourceType: 'expense_claim',
      sourceId: rid(1206),
      title: 'Client visit to Chattogram · bus, hotel, meals',
      amount: bdt('12850.00'),
      status: 'pending',
      requestedBy: PEOPLE.arif,
      requestedAt: '2026-11-01T13:30:00Z',
      ruleName: 'Claims go to the project manager',
      steps: [
        step(PEOPLE.arif, 'Employee', 'approved', '2026-11-01T13:30:00Z', 'Submitted'),
        step(PEOPLE.nusrat, 'Project manager', 'current'),
      ],
      posting: {
        lines: [
          line('5610', 'Travel', 'PF-2604 · Arif Hossain', '12850.00', '0.00'),
          line('2150', 'Employee payable', 'Arif Hossain', '0.00', '12850.00'),
        ],
      },
      fileIds: [rid(1308), rid(1309)],
      meta: meta('2026-11-01T13:30:00Z', rid(4)),
    },
  },
  {
    waitingOn: 'pm',
    requestedByRole: 'employee',
    request: {
      id: rid(1107),
      reference: 'TS-2627-00211',
      sourceType: 'timesheet',
      sourceId: rid(1207),
      title: 'Arif Hossain · week of 25 Oct · 38.5 h',
      amount: null,
      status: 'pending',
      requestedBy: PEOPLE.arif,
      requestedAt: '2026-10-31T11:00:00Z',
      ruleName: 'Timesheets go to the project manager',
      steps: [
        step(PEOPLE.arif, 'Employee', 'approved', '2026-10-31T11:00:00Z', 'Submitted'),
        step(PEOPLE.nusrat, 'Project manager', 'current'),
      ],
      posting: null,
      fileIds: [],
      meta: meta('2026-10-31T11:00:00Z', rid(4)),
    },
  },
  {
    waitingOn: null,
    requestedByRole: 'finance',
    actedBy: ['partner'],
    request: {
      id: rid(1108),
      reference: 'PAY-2627-00004',
      sourceType: 'payroll_run',
      sourceId: rid(1208),
      title: 'Payroll · October 2026 (24 employees)',
      amount: bdt('1420000.00'),
      status: 'approved',
      requestedBy: PEOPLE.rafiq,
      requestedAt: '2026-10-31T09:00:00Z',
      ruleName: 'Payroll needs a Partner',
      steps: [
        step(PEOPLE.rafiq, 'Finance', 'approved', '2026-10-31T09:00:00Z', 'Submitted'),
        step(PEOPLE.tanvir, 'Partner', 'approved', '2026-10-31T11:40:00Z', null),
      ],
      posting: {
        lines: [
          line('5110', 'Salaries · project staff', 'Split by timesheets', '1040000.00', '0.00'),
          line('6110', 'Salaries · administration', null, '380000.00', '0.00'),
          line('2210', 'Net salary payable', null, '0.00', '1264300.00'),
          line('2230', 'TDS payable · salary', null, '0.00', '98700.00'),
          line('2240', 'Provident fund payable', null, '0.00', '57000.00'),
        ],
      },
      fileIds: [],
      meta: meta('2026-10-31T11:40:00Z', rid(5)),
    },
  },
  {
    waitingOn: null,
    requestedByRole: 'pm',
    actedBy: ['partner'],
    request: {
      id: rid(1109),
      reference: 'QUO-2627-00029',
      sourceType: 'quotation',
      sourceId: rid(1209),
      title: 'Kaashful Retail · loyalty app, revision 2',
      amount: bdt('2150000.00'),
      status: 'returned',
      requestedBy: PEOPLE.nusrat,
      requestedAt: '2026-10-28T06:00:00Z',
      ruleName: 'Discounts above 10% need a Partner',
      steps: [
        step(PEOPLE.nusrat, 'Sales', 'approved', '2026-10-28T06:00:00Z', 'Submitted'),
        step(
          PEOPLE.farhana,
          'Partner',
          'returned',
          '2026-10-28T10:15:00Z',
          'Keep the discount at 10%.',
        ),
      ],
      posting: null,
      fileIds: [],
      meta: meta('2026-10-28T10:15:00Z', rid(2)),
    },
  },
];

/** Error states, one per sample id, so each can be designed and tested (see sample-company.ts). */
export { APPROVAL_ERRORS } from './sample-company.ts';

/** The approvals a role sees, with the actions the server would allow that role. */
export function approvalsFor(
  role: SampleRole,
): readonly (ApprovalRequest & { readonly assignedToMe: boolean })[] {
  return SAMPLE_APPROVALS.filter(
    (sample) =>
      sample.requestedByRole === role ||
      sample.waitingOn === role ||
      (sample.actedBy ?? []).includes(role) ||
      role === 'partner' ||
      role === 'finance',
  ).map((sample) => {
    const turn = sample.waitingOn === role && sample.requestedByRole !== role;
    return {
      ...sample.request,
      assignedToMe: turn,
      allowedActions: turn ? ['approve', 'reject', 'return', 'delegate'] : [],
    };
  });
}

/** A pending approval the viewer requested themself: a partner viewing their own drawing. */
export const OWN_REQUEST_ID = rid(1104);

/* Audit ------------------------------------------------------------------------------------- */

const audit = (
  n: number,
  at: string,
  user: { id: string; name: string } | null,
  action: AuditEntry['action'],
  tableName: string,
  recordId: string | null,
  changes: AuditEntry['changes'],
  ipAddress: string | null = '103.94.2.11',
): AuditEntry => ({
  id: rid(1400 + n),
  at,
  user,
  ipAddress,
  device: 'Chrome on Windows',
  action,
  tableName,
  recordId,
  changes,
  requestId: rid(1500 + n),
});

export const AUDIT_ENTRIES: readonly AuditEntry[] = [
  audit(
    1,
    '2026-11-02T03:10:00Z',
    PEOPLE.rafiq,
    'update',
    'accounting.manual_journal',
    'JV-2627-00021',
    [{ field: 'status', old: 'draft', new: 'pending_approval' }],
  ),
  audit(
    2,
    '2026-11-02T02:15:00Z',
    PEOPLE.arif,
    'insert',
    'hr.leave_request',
    'LV-2627-00118',
    [{ field: 'days', old: null, new: '2' }],
    '103.94.7.41',
  ),
  audit(
    3,
    '2026-11-01T13:30:00Z',
    PEOPLE.arif,
    'insert',
    'accounting.expense_claim',
    'CLM-2627-00342',
    [{ field: 'amount', old: null, new: '12850.00' }],
    '37.111.8.20',
  ),
  audit(
    4,
    '2026-11-01T10:42:00Z',
    PEOPLE.rafiq,
    'update',
    'accounting.vendor_bill',
    'BILL-2627-00187',
    [{ field: 'status', old: 'draft', new: 'pending_approval' }],
  ),
  audit(
    5,
    '2026-11-01T08:20:00Z',
    PEOPLE.farhana,
    'update',
    'core.approval_request',
    'DRW-2627-00009',
    [{ field: 'step', old: '1 of 2', new: '2 of 2' }],
    '103.94.2.33',
  ),
  audit(
    6,
    '2026-10-31T12:02:00Z',
    PEOPLE.rafiq,
    'insert',
    'accounting.journal_entry',
    'JE-2627-00412',
    [{ field: 'source', old: null, new: 'PAY-2627-00004' }],
  ),
  audit(
    7,
    '2026-10-31T11:40:00Z',
    PEOPLE.tanvir,
    'update',
    'payroll.payroll_run',
    'PAY-2627-00004',
    [{ field: 'status', old: 'in_review', new: 'locked' }],
    '103.94.2.10',
  ),
  audit(
    8,
    '2026-10-30T09:12:00Z',
    PEOPLE.nusrat,
    'update',
    'projects.milestone',
    'PF-2602 · M3',
    [
      { field: 'dueDate', old: '2026-10-20', new: '2026-10-28' },
      { field: 'reason', old: null, new: 'Client API delay' },
    ],
    '103.94.5.12',
  ),
  audit(
    9,
    '2026-10-26T06:31:00Z',
    PEOPLE.rafiq,
    'insert',
    'accounting.journal_entry',
    'JE-2627-00408',
    [{ field: 'reversalOf', old: null, new: 'JE-2627-00401' }],
  ),
  audit(
    10,
    '2026-10-01T04:00:00Z',
    PEOPLE.tanvir,
    'update',
    'accounting.fiscal_period',
    '2026-09',
    [{ field: 'status', old: 'closing', new: 'locked' }],
    '103.94.2.10',
  ),
  audit(
    11,
    '2026-11-02T01:58:00Z',
    PEOPLE.farhana,
    'view_restricted',
    'payroll.payslip',
    'PAY-2627-00004',
    [],
    '103.94.2.33',
  ),
  audit(
    12,
    '2026-11-02T01:55:00Z',
    PEOPLE.farhana,
    'login',
    'core.session',
    null,
    [],
    '103.94.2.33',
  ),
];

/* Users, roles and settings ----------------------------------------------------------------- */

export const ROLE_IDS = {
  partner: rid(1601),
  finance: rid(1602),
  pm: rid(1603),
  employee: rid(1604),
  hr: rid(1605),
  auditor: rid(1606),
} as const;

const grant = (
  area: string,
  actions: Role['grants'][number]['actions'],
  scope: Role['grants'][number]['scope'],
) => ({
  area,
  actions,
  scope,
});

export const ROLES: readonly Role[] = [
  {
    id: ROLE_IDS.partner,
    name: 'Partner',
    description: 'Owners: full access and final approvals.',
    system: true,
    grants: [grant('all', ['read', 'create', 'update', 'submit', 'approve', 'delete'], 'all')],
    restrictedFields: ['salary', 'partner-balance', 'labour-cost'],
    allowedActions: ['clone'],
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: ROLE_IDS.finance,
    name: 'Finance',
    description: 'Books, payables, receivables and bank.',
    system: true,
    grants: [
      grant('accounting', ['read', 'create', 'update', 'submit'], 'all'),
      grant('billing', ['read', 'create', 'update', 'submit'], 'all'),
      grant('partners', ['read'], 'all'),
    ],
    restrictedFields: ['partner-balance', 'labour-cost'],
    allowedActions: ['clone'],
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: ROLE_IDS.pm,
    name: 'Project manager',
    description: 'Own projects, team time and leave.',
    system: true,
    grants: [
      grant('projects', ['read', 'create', 'update', 'approve'], 'project'),
      grant('hr.leave', ['read', 'approve'], 'team'),
    ],
    restrictedFields: [],
    allowedActions: ['clone'],
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: ROLE_IDS.employee,
    name: 'Employee',
    description: 'Own tasks, time, claims, leave and payslips.',
    system: true,
    grants: [grant('self', ['read', 'create', 'submit'], 'own')],
    restrictedFields: [],
    allowedActions: ['clone'],
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: ROLE_IDS.auditor,
    name: 'Auditor',
    description: 'Read-only access for the statutory audit, time-boxed.',
    system: false,
    grants: [grant('all', ['read'], 'all')],
    restrictedFields: ['partner-balance'],
    allowedActions: ['update', 'clone', 'delete'],
    meta: meta('2026-09-15T04:00:00Z'),
  },
];

const user = (
  n: number,
  name: string,
  email: string,
  roleIds: readonly string[],
  lastLoginAt: string | null,
  extra: Partial<User> = {},
): User => ({
  id: rid(n),
  name,
  email,
  status: 'active',
  roleIds: [...roleIds],
  departmentId: null,
  twoFactorEnabled: true,
  lastLoginAt,
  accessExpiresAt: null,
  allowedActions: ['assign_roles', 'deactivate', 'force_sign_out'],
  meta: meta('2026-07-01T04:00:00Z'),
  ...extra,
});

export const USERS: readonly User[] = [
  user(5, 'Tanvir Ahmed', 'tanvir@pitchforge.example', [ROLE_IDS.partner], '2026-11-02T03:00:00Z', {
    allowedActions: ['force_sign_out'],
  }),
  user(
    2,
    'Farhana Kabir',
    'farhana@pitchforge.example',
    [ROLE_IDS.partner],
    '2026-11-02T01:55:00Z',
    {
      allowedActions: [],
    },
  ),
  user(
    6,
    'Sabbir Rahman',
    'sabbir@pitchforge.example',
    [ROLE_IDS.partner, ROLE_IDS.pm],
    '2026-11-01T12:10:00Z',
    {
      allowedActions: ['force_sign_out'],
    },
  ),
  user(1, 'Rafiq Islam', 'rafiq@pitchforge.example', [ROLE_IDS.finance], '2026-11-02T03:05:00Z'),
  user(3, 'Nusrat Jahan', 'nusrat@pitchforge.example', [ROLE_IDS.pm], '2026-11-02T02:47:00Z'),
  user(4, 'Arif Hossain', 'arif@pitchforge.example', [ROLE_IDS.employee], '2026-11-02T03:02:00Z', {
    twoFactorEnabled: false,
  }),
  user(8, 'Sadia Akter', 'sadia@pitchforge.example', [ROLE_IDS.employee], null, {
    status: 'invited',
    twoFactorEnabled: false,
    allowedActions: ['assign_roles', 'deactivate'],
  }),
  user(
    9,
    'Chowdhury and Associates',
    'audit@chowdhury.example',
    [ROLE_IDS.auditor],
    '2026-10-20T05:00:00Z',
    {
      accessExpiresAt: '2026-12-31T18:00:00Z',
    },
  ),
];

export const APPROVAL_RULES: readonly ApprovalRule[] = [
  {
    id: rid(1701),
    name: 'Vendor bills above ৳1,00,000',
    sourceType: 'vendor_bill',
    minAmount: bdt('100000.00'),
    maxAmount: null,
    departmentId: null,
    projectId: null,
    approverRoleIds: [ROLE_IDS.partner],
    mode: 'any',
    slaHours: 48,
    active: true,
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(1702),
    name: 'Every manual journal',
    sourceType: 'manual_journal',
    minAmount: null,
    maxAmount: null,
    departmentId: null,
    projectId: null,
    approverRoleIds: [ROLE_IDS.partner],
    mode: 'any',
    slaHours: 24,
    active: true,
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(1703),
    name: 'Partner drawings above ৳1,50,000',
    sourceType: 'partner_transaction',
    minAmount: bdt('150000.00'),
    maxAmount: null,
    departmentId: null,
    projectId: null,
    approverRoleIds: [ROLE_IDS.partner],
    mode: 'all',
    slaHours: 72,
    active: true,
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(1704),
    name: 'Purchases above ৳2,00,000',
    sourceType: 'purchase_order',
    minAmount: bdt('200000.00'),
    maxAmount: null,
    departmentId: null,
    projectId: null,
    approverRoleIds: [ROLE_IDS.partner],
    mode: 'sequence',
    slaHours: 48,
    active: true,
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(1705),
    name: 'Leave and timesheets',
    sourceType: 'leave_request',
    minAmount: null,
    maxAmount: null,
    departmentId: null,
    projectId: null,
    approverRoleIds: [ROLE_IDS.pm],
    mode: 'any',
    slaHours: 24,
    active: true,
    meta: meta('2026-07-01T04:00:00Z'),
  },
];

export const COMPANY: Company = {
  id: rid(1801),
  legalName: 'Pitchforge Partners',
  tin: '000000000000',
  bin: '0000000000000',
  licenceNo: 'TRAD/DNCC/000000/2026',
  logoFileId: null,
  baseCurrency: 'BDT',
  fiscalYearStartMonth: 7,
  meta: meta('2026-07-01T04:00:00Z'),
};

const unit = (
  n: number,
  type: OrgUnit['type'],
  code: string,
  name: string,
  parentId: string | null = null,
): OrgUnit => ({
  id: rid(n),
  type,
  code,
  name,
  parentId,
  active: true,
  meta: meta('2026-07-01T04:00:00Z'),
});

export const ORG_UNITS: readonly OrgUnit[] = [
  unit(1901, 'branch', 'DHK', 'Dhaka head office'),
  unit(1902, 'department', 'ENG', 'Engineering', rid(1901)),
  unit(1903, 'department', 'DEL', 'Delivery', rid(1901)),
  unit(1904, 'department', 'FIN', 'Finance and admin', rid(1901)),
  unit(1905, 'cost_center', 'CC-SALES', 'Sales and tenders', rid(1901)),
];

export const HOLIDAYS: readonly Holiday[] = [
  {
    id: rid(1951),
    branchId: null,
    date: '2026-12-16',
    name: 'Victory Day',
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(1952),
    branchId: null,
    date: '2026-12-25',
    name: 'Christmas Day',
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(1953),
    branchId: null,
    date: '2027-02-21',
    name: 'Language Martyrs’ Day',
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(1954),
    branchId: null,
    date: '2027-03-26',
    name: 'Independence Day',
    meta: meta('2026-07-01T04:00:00Z'),
  },
];

const series = (
  n: number,
  documentType: string,
  prefix: string,
  lastIssued: number,
): NumberSeries => ({
  id: rid(n),
  documentType,
  prefix,
  fiscalYearCode: '2627',
  lastIssued,
  gapFree: true,
});

export const NUMBER_SERIES: readonly NumberSeries[] = [
  series(1961, 'Sales invoice', 'INV', 45),
  series(1962, 'Vendor bill', 'BILL', 187),
  series(1963, 'Journal entry', 'JE', 413),
  series(1964, 'Receipt', 'RCP', 98),
  series(1965, 'Purchase order', 'PO', 61),
];

export const REMINDER_RULES: readonly ReminderRule[] = [
  { id: rid(1971), subject: 'Bank guarantee expiry', daysBefore: [30, 14, 7], active: true },
  { id: rid(1972), subject: 'Tender submission deadline', daysBefore: [7, 3, 1], active: true },
  { id: rid(1973), subject: 'Software and domain renewal', daysBefore: [14, 3], active: true },
  { id: rid(1974), subject: 'Probation end', daysBefore: [14], active: true },
  { id: rid(1975), subject: 'Vendor bill due date', daysBefore: [3, 1], active: false },
];

export const MY_SESSIONS: readonly DeviceSession[] = [
  {
    id: rid(1981),
    device: 'Chrome on Windows',
    ipAddress: '103.94.2.33',
    lastSeenAt: '2026-11-02T03:12:00Z',
    current: true,
  },
  {
    id: rid(1982),
    device: 'Safari on iPhone',
    ipAddress: '37.111.8.20',
    lastSeenAt: '2026-11-01T15:40:00Z',
    current: false,
  },
];

/* Search ------------------------------------------------------------------------------------ */

export const SEARCH_RESULTS: readonly SearchResult[] = [
  {
    recordType: 'vendor_bill',
    recordId: rid(1201),
    title: 'BILL-2627-00187',
    subtitle: 'CloudNest Hosting Ltd · ৳1,84,000',
    link: '/finance',
  },
  {
    recordType: 'project',
    recordId: rid(2001),
    title: 'PF-2601 · Loan Origination Portal',
    subtitle: 'Nodi Microfinance',
    link: '/projects',
  },
  {
    recordType: 'client',
    recordId: rid(2101),
    title: 'Nodi Microfinance',
    subtitle: 'Client · 2 active projects',
    link: '/crm',
  },
  {
    recordType: 'sales_invoice',
    recordId: rid(2201),
    title: 'INV-2627-00045',
    subtitle: 'Nodi Microfinance · paid',
    link: '/billing',
  },
  {
    recordType: 'employee',
    recordId: rid(4),
    title: 'Arif Hossain',
    subtitle: 'Software Engineer · Engineering',
    link: '/hr',
  },
];

/* Dashboards -------------------------------------------------------------------------------- */

const tile = (
  key: string,
  label: string,
  value: { money?: string; count?: number },
  hint: string | null,
  link: string | null,
) => ({
  key,
  label,
  money: value.money === undefined ? null : bdt(value.money),
  count: value.count ?? null,
  hint,
  link,
});

const TILES: Readonly<Record<DashboardKind, Dashboard['tiles']>> = {
  partner: [
    tile(
      'revenue',
      'Revenue · year to date',
      { money: '14240000.00' },
      '18% above the same months last year',
      '/reports',
    ),
    tile(
      'profit',
      'Net profit · year to date',
      { money: '5285000.00' },
      'Margin 37.1%',
      '/reports',
    ),
    tile(
      'cash',
      'Cash and bank',
      { money: '3003250.00' },
      '5 accounts, bKash and Nagad included',
      '/finance',
    ),
    tile('receivables', 'Receivables', { money: '3680000.00' }, '৳6,62,500 overdue', '/billing'),
  ],
  finance: [
    tile('cash', 'Cash and bank', { money: '3003250.00' }, '5 accounts', '/finance'),
    tile('payables', 'Payables due in 7 days', { money: '409000.00' }, '3 bills', '/finance'),
    tile(
      'receivables',
      'Overdue receivables',
      { money: '662500.00' },
      '1 invoice · Shapla Pharma',
      '/billing',
    ),
    tile('unreconciled', 'Bank lines to match', { count: 6 }, 'City Bank, October', '/finance'),
  ],
  pm: [
    tile('projects', 'Active projects', { count: 3 }, 'Contract value ৳90,30,000', '/projects'),
    tile('overdue', 'Overdue milestones', { count: 1 }, 'PF-2602 Android release', '/projects'),
    tile(
      'timesheets',
      'Timesheets to approve',
      { count: 1 },
      '38.5 hours · week of 25 Oct',
      '/approvals',
    ),
    tile('utilisation', 'Team utilisation', { count: 82 }, 'Per cent billable, last 4 weeks', null),
  ],
  sales: [
    tile('pipeline', 'Open pipeline', { money: '11850000.00' }, '7 opportunities', '/crm'),
    tile('weighted', 'Weighted forecast', { money: '5240000.00' }, 'Next 90 days', '/crm'),
    tile('tenders', 'Tenders closing in 7 days', { count: 1 }, 'Port users booking portal', '/crm'),
    tile('quotes', 'Quotations awaiting reply', { count: 2 }, null, '/crm'),
  ],
  hr: [
    tile('headcount', 'Headcount', { count: 24 }, '2 on probation', '/hr'),
    tile('present', 'Present today', { count: 19 }, '2 on leave, 1 in the field', '/hr'),
    tile('leave', 'Leave requests pending', { count: 1 }, null, '/approvals'),
    tile('payroll', 'Next payroll', { count: 30 }, 'November, due 30 Nov', '/hr'),
  ],
  employee: [
    tile('tasks', 'Open tasks', { count: 3 }, '1 critical', '/projects'),
    tile('hours', 'Hours this week', { count: 30 }, 'of 40 · submit by Thursday', '/projects'),
    tile('leave', 'Casual leave left', { count: 7 }, '1 request pending', '/hr'),
    tile('payslip', 'Last payslip · October', { money: '85500.00' }, null, '/hr'),
  ],
};

export function dashboardOf(kind: DashboardKind): Dashboard {
  // eslint-disable-next-line security/detect-object-injection -- key is the DashboardKind union
  return { kind, tiles: TILES[kind], generatedAt: '2026-11-02T03:15:00Z' };
}

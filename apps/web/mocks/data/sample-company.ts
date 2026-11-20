/**
 * The prototype's fictional company. Nothing here is real; the addresses use a reserved
 * domain. Permissions are fixed per sample user: the mock never decides anything.
 */
export type SampleRole = 'partner' | 'finance' | 'pm' | 'employee';

export interface SampleUser {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly permissions: readonly string[];
}

const id = (n: number) => `0190f2a4-7c3b-7d2e-8f00-${String(n).padStart(12, '0')}`;

const ALL_AREAS = [
  'approvals',
  'billing',
  'finance',
  'ledger',
  'partners',
  'projects',
  'crm',
  'hr',
  'payroll',
  'procurement',
  'reports',
  'audit',
  'admin',
];
const read = (areas: readonly string[]) => areas.map((area) => `${area}.read`);

export const SAMPLE_USERS: Readonly<Record<SampleRole, SampleUser>> = {
  partner: {
    userId: id(2),
    name: 'Farhana Kabir',
    email: 'farhana@pitchforge.example',
    permissions: read(ALL_AREAS),
  },
  finance: {
    userId: id(1),
    name: 'Rafiq Islam',
    email: 'rafiq@pitchforge.example',
    permissions: read([
      'approvals',
      'billing',
      'finance',
      'ledger',
      'partners',
      'crm',
      'hr',
      'payroll',
      'procurement',
      'reports',
      'audit',
    ]),
  },
  pm: {
    userId: id(3),
    name: 'Nusrat Jahan',
    email: 'nusrat@pitchforge.example',
    permissions: read(['approvals', 'projects', 'crm', 'hr', 'procurement']),
  },
  employee: {
    userId: id(4),
    name: 'Arif Hossain',
    email: 'arif@pitchforge.example',
    permissions: read(['projects', 'hr', 'procurement']),
  },
};

/** Fixed sign-in outcomes, so every error state can be designed and tested. */
export const ENROLMENT_EMAIL = 'sadia@pitchforge.example';
export const LOCKED_EMAIL = 'locked@pitchforge.example';
export const WRONG_TWO_FACTOR_CODE = '000000';

export const SAMPLE_NOTIFICATIONS = [
  {
    id: id(101),
    title: 'Bill waiting for approval',
    body: 'CloudNest Hosting Ltd · BILL-2627-00187',
    link: '/approvals',
    readAt: null,
    createdAt: '2026-11-02T03:40:00Z',
  },
  {
    id: id(102),
    title: 'Expense claim submitted',
    body: 'Client visit to Chattogram · CLM-2627-00342',
    link: '/approvals',
    readAt: '2026-11-01T14:10:00Z',
    createdAt: '2026-11-01T13:30:00Z',
  },
];

export const SAMPLE_RECOVERY_CODES = Array.from(
  { length: 8 },
  (_, index) => `ABCD-000${String(index)}`,
);

/** One approval per sample error state, so those states are reachable in Phase 1. */
export const APPROVAL_ERRORS = {
  [id(201)]: 'SOD_VIOLATION',
  [id(202)]: 'PERIOD_LOCKED',
  [id(203)]: 'STALE_VERSION',
  [id(204)]: 'FORBIDDEN',
} as const;

export const FIRST_APPROVAL_ERROR_ID = id(201);

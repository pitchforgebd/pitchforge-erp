/**
 * HR sample records from the prototype's fictional company: employees, attendance, leave and
 * offboarding. Statuses, leave balances and lateness are written out as the server would send
 * them; nothing here is calculated.
 */
import type {
  AttendanceRecord,
  AttendanceRegularisation,
  Employee,
  EmployeeEvent,
  LeaveBalance,
  LeaveCalendarEntry,
  LeaveRequest,
  LeaveType,
  Offboarding,
  Shift,
} from '@pitchforge/contracts';

import { PEOPLE, rid } from './core-records.ts';
import type { SampleRole } from './sample-company.ts';

const meta = (at: string, by: string = PEOPLE.farhana.id) => ({
  createdAt: at,
  createdBy: by,
  updatedAt: at,
  updatedBy: by,
  version: 1,
});

/** Staff without a sign-in of their own in the sample company. */
export const STAFF = {
  ...PEOPLE,
  tahmid: { id: rid(9), name: 'Tahmid Karim' },
  rumana: { id: rid(10), name: 'Rumana Sultana' },
  shirin: { id: rid(11), name: 'Shirin Akhter' },
  kamal: { id: rid(12), name: 'Kamal Uddin' },
} as const;

const DEPARTMENTS = { eng: rid(1902), del: rid(1903), fin: rid(1904) } as const;

/** Partners run HR in the sample company; finance reads; a manager sees their team. */
export const runsHr = (role: SampleRole) => role === 'partner';
export const readsAllStaff = (role: SampleRole) => role === 'partner' || role === 'finance';

/** Nusrat Jahan manages these people. */
const NUSRAT_TEAM: ReadonlySet<string> = new Set([
  STAFF.arif.id,
  STAFF.mehedi.id,
  STAFF.sadia.id,
  STAFF.tahmid.id,
  STAFF.rumana.id,
]);

/** The people whose HR records a role may see: everyone, a manager's team, or oneself. */
export function seesPerson(role: SampleRole, personId: string): boolean {
  if (readsAllStaff(role)) return true;
  if (role === 'pm') return personId === STAFF.nusrat.id || NUSRAT_TEAM.has(personId);
  // The sample employee is Arif Hossain.
  return personId === STAFF.arif.id;
}

/* Employees -------------------------------------------------------------------------------- */

type EmployeeSeed = readonly [
  person: { readonly id: string; readonly name: string },
  code: string,
  hasLogin: boolean,
  department: string,
  manager: string | null,
  jobTitle: string,
  grade: string,
  type: Employee['employmentType'],
  joinedOn: string,
  status: Employee['status'],
  extra?: Partial<Employee>,
];

const EMPLOYEE_SEEDS: readonly EmployeeSeed[] = [
  [
    STAFF.rafiq,
    'PF-E003',
    true,
    DEPARTMENTS.fin,
    null,
    'Finance Manager',
    'M2',
    'permanent',
    '2020-09-13',
    'active',
  ],
  [
    STAFF.nusrat,
    'PF-E006',
    true,
    DEPARTMENTS.del,
    null,
    'Project Manager',
    'M2',
    'permanent',
    '2021-06-01',
    'active',
  ],
  [
    STAFF.mehedi,
    'PF-E011',
    true,
    DEPARTMENTS.eng,
    STAFF.nusrat.id,
    'Senior Software Engineer',
    'E3',
    'permanent',
    '2022-03-01',
    'active',
  ],
  [
    STAFF.arif,
    'PF-E014',
    true,
    DEPARTMENTS.eng,
    STAFF.nusrat.id,
    'Software Engineer',
    'E2',
    'permanent',
    '2023-08-15',
    'active',
  ],
  [
    STAFF.sadia,
    'PF-E017',
    true,
    DEPARTMENTS.eng,
    STAFF.nusrat.id,
    'QA Engineer',
    'E2',
    'permanent',
    '2024-01-07',
    'active',
  ],
  [
    STAFF.tahmid,
    'PF-E019',
    false,
    DEPARTMENTS.eng,
    STAFF.nusrat.id,
    'Data Engineer',
    'E2',
    'permanent',
    '2024-05-02',
    'active',
  ],
  [
    STAFF.rumana,
    'PF-E021',
    false,
    DEPARTMENTS.del,
    STAFF.nusrat.id,
    'Support Engineer',
    'E1',
    'permanent',
    '2025-02-10',
    'on_notice',
  ],
  [
    STAFF.shirin,
    'PF-E023',
    false,
    DEPARTMENTS.fin,
    null,
    'HR Executive',
    'E1',
    'probation',
    '2025-07-01',
    'active',
    { probationEndsOn: '2026-12-31' },
  ],
  [
    STAFF.kamal,
    'PF-E009',
    false,
    DEPARTMENTS.del,
    STAFF.nusrat.id,
    'Support Engineer',
    'E1',
    'permanent',
    '2022-01-10',
    'left',
    { leftOn: '2026-08-31' },
  ],
];

/** Last four characters only, as the API sends them. */
const masked = (tail: string) => `••••••••${tail}`;

export const RUMANA_ID = STAFF.rumana.id;

export function employeesFor(role: SampleRole): readonly Employee[] {
  return EMPLOYEE_SEEDS.filter(([person]) => seesPerson(role, person.id)).map(
    ([
      person,
      code,
      hasLogin,
      departmentId,
      managerId,
      jobTitle,
      grade,
      type,
      joinedOn,
      status,
      extra,
    ]) => ({
      id: person.id,
      employeeCode: code,
      userId: hasLogin ? person.id : null,
      name: person.name,
      workEmail: `${person.name.split(' ')[0]?.toLowerCase() ?? 'staff'}@pitchforge.example`,
      departmentId,
      managerId,
      jobTitle,
      grade,
      employmentType: type,
      joinedOn,
      probationEndsOn: null,
      contractEndsOn: null,
      leftOn: null,
      status,
      nid: masked(code.slice(-3).padStart(4, '7')),
      tin: masked(code.slice(-3).padStart(4, '3')),
      bankAccount: masked(code.slice(-3).padStart(4, '5')),
      allowedActions: !runsHr(role)
        ? []
        : status === 'active'
          ? ['update', 'update_protected', 'offboard']
          : status === 'on_notice'
            ? ['update', 'update_protected']
            : [],
      meta: meta(`${joinedOn}T04:00:00Z`),
      ...extra,
    }),
  );
}

const event = (
  n: number,
  employeeId: string,
  kind: EmployeeEvent['kind'],
  effectiveOn: string,
  note: string | null,
): EmployeeEvent => ({
  id: rid(8100 + n),
  employeeId,
  kind,
  effectiveOn,
  note,
  recordedBy: STAFF.farhana,
});

export const EMPLOYEE_EVENTS: readonly EmployeeEvent[] = [
  event(1, STAFF.mehedi.id, 'joined', '2022-03-01', null),
  event(2, STAFF.mehedi.id, 'confirmed', '2022-09-01', 'Probation completed'),
  event(
    3,
    STAFF.mehedi.id,
    'promoted',
    '2024-07-01',
    'Software Engineer to Senior Software Engineer',
  ),
  event(4, STAFF.arif.id, 'joined', '2023-08-15', null),
  event(5, STAFF.arif.id, 'confirmed', '2024-02-15', 'Probation completed'),
  event(6, STAFF.rumana.id, 'joined', '2025-02-10', null),
  event(7, STAFF.rumana.id, 'confirmed', '2025-08-10', 'Probation completed'),
  event(8, STAFF.rumana.id, 'resigned', '2026-10-31', 'Moving to Chattogram; notice served'),
  event(9, STAFF.kamal.id, 'left', '2026-08-31', 'Final settlement paid'),
];

export const OFFBOARDING: Offboarding = {
  employeeId: RUMANA_ID,
  lastWorkingDay: '2026-11-30',
  items: [
    {
      key: 'handover',
      label: 'Handover notes to the support lead',
      done: true,
      doneBy: STAFF.nusrat,
    },
    { key: 'laptop', label: 'Return laptop AST-0136', done: false, doneBy: null },
    { key: 'access', label: 'Remove system and e-mail access', done: false, doneBy: null },
    { key: 'loan', label: 'Salary loan settled from final pay', done: false, doneBy: null },
    { key: 'id_card', label: 'Return ID card and office keys', done: false, doneBy: null },
  ],
  finalSettlementId: rid(8601),
};

/* Attendance ------------------------------------------------------------------------------- */

export const SHIFTS: readonly Shift[] = [
  {
    id: rid(8201),
    name: 'Day shift',
    startsAt: '09:00',
    endsAt: '18:00',
    weekendDays: ['fri', 'sat'],
    lateAfterMinutes: 15,
    earlyLeaveMinutes: 30,
    meta: meta('2026-07-01T04:00:00Z'),
  },
  {
    id: rid(8202),
    name: 'Support evening',
    startsAt: '13:00',
    endsAt: '22:00',
    weekendDays: ['fri'],
    lateAfterMinutes: 10,
    earlyLeaveMinutes: 30,
    meta: meta('2026-07-01T04:00:00Z'),
  },
];

type DaySeed = readonly [
  person: { readonly id: string; readonly name: string },
  date: string,
  checkIn: string | null,
  checkOut: string | null,
  status: AttendanceRecord['status'],
  source?: AttendanceRecord['source'],
];

/** Times are UTC; 03:00Z is 09:00 in Dhaka. */
const DAYS: readonly DaySeed[] = [
  [STAFF.arif, '2026-11-19', '2026-11-19T02:58:00Z', '2026-11-19T12:07:00Z', 'present'],
  [STAFF.arif, '2026-11-18', '2026-11-18T03:21:00Z', '2026-11-18T12:15:00Z', 'late'],
  [STAFF.arif, '2026-11-17', null, null, 'absent'],
  [STAFF.arif, '2026-11-16', '2026-11-16T02:55:00Z', '2026-11-16T11:10:00Z', 'early_leave'],
  [STAFF.mehedi, '2026-11-19', '2026-11-19T02:52:00Z', '2026-11-19T12:30:00Z', 'present'],
  [STAFF.sadia, '2026-11-19', '2026-11-19T03:05:00Z', '2026-11-19T12:02:00Z', 'present'],
  [
    STAFF.tahmid,
    '2026-11-19',
    '2026-11-19T04:10:00Z',
    '2026-11-19T13:00:00Z',
    'present',
    'regularised',
  ],
  [STAFF.rumana, '2026-11-19', '2026-11-19T03:41:00Z', '2026-11-19T12:00:00Z', 'late', 'biometric'],
  [STAFF.nusrat, '2026-11-19', '2026-11-19T02:47:00Z', '2026-11-19T12:20:00Z', 'present'],
  [STAFF.rafiq, '2026-11-19', '2026-11-19T03:05:00Z', '2026-11-19T12:10:00Z', 'present'],
  [STAFF.shirin, '2026-11-19', '2026-11-19T03:36:00Z', '2026-11-19T12:05:00Z', 'late', 'biometric'],
];

export function attendanceFor(role: SampleRole): readonly AttendanceRecord[] {
  return DAYS.filter(([person]) => seesPerson(role, person.id)).map(
    ([employee, date, checkInAt, checkOutAt, status, source = 'web'], index) => ({
      id: rid(8300 + index),
      employee,
      date,
      checkInAt,
      checkOutAt,
      source,
      status,
    }),
  );
}

/** What a check-in today returns: 09:04 in Dhaka, within the 15-minute grace. */
export const CHECKED_IN: Omit<AttendanceRecord, 'employee'> = {
  id: rid(8399),
  date: '2026-11-20',
  checkInAt: '2026-11-20T03:04:00Z',
  checkOutAt: null,
  source: 'web',
  status: 'present',
};

export function regularisationsFor(
  role: SampleRole,
  viewerId: string,
): readonly AttendanceRegularisation[] {
  const rows: readonly AttendanceRegularisation[] = [
    {
      id: rid(8351),
      employee: STAFF.arif,
      date: '2026-11-17',
      checkInAt: '2026-11-17T03:00:00Z',
      checkOutAt: '2026-11-17T12:00:00Z',
      reason: 'Worked at the client site in Motijheel; forgot to check in',
      status: 'draft',
      approvalId: null,
      allowedActions: STAFF.arif.id === viewerId ? ['submit'] : [],
      meta: meta('2026-11-18T05:00:00Z', STAFF.arif.id),
    },
    {
      id: rid(8352),
      employee: STAFF.tahmid,
      date: '2026-11-19',
      checkInAt: '2026-11-19T03:00:00Z',
      checkOutAt: '2026-11-19T13:00:00Z',
      reason: 'Field visit to the data centre before coming to office',
      status: 'approved',
      approvalId: rid(8952),
      allowedActions: [],
      meta: meta('2026-11-19T13:30:00Z', STAFF.tahmid.id),
    },
  ];
  return rows.filter((row) => seesPerson(role, row.employee.id));
}

/* Leave ------------------------------------------------------------------------------------ */

export const LEAVE_TYPES = {
  casual: { id: rid(8401), name: 'Casual leave' },
  sick: { id: rid(8402), name: 'Sick leave' },
  earned: { id: rid(8403), name: 'Earned leave' },
  maternity: { id: rid(8404), name: 'Maternity leave' },
} as const;

const leaveType = (
  type: { readonly id: string; readonly name: string },
  daysPerYear: string,
  carryForwardDays: string,
  encashable: boolean,
): LeaveType => ({
  ...type,
  daysPerYear,
  carryForwardDays,
  encashable,
  validFrom: '2026-07-01',
  validTo: null,
  meta: meta('2026-07-01T04:00:00Z'),
});

export const LEAVE_TYPE_LIST: readonly LeaveType[] = [
  leaveType(LEAVE_TYPES.casual, '10', '0', false),
  leaveType(LEAVE_TYPES.sick, '14', '0', false),
  leaveType(LEAVE_TYPES.earned, '18', '40', true),
  leaveType(LEAVE_TYPES.maternity, '112', '0', false),
];

/** accrued, used, available per casual, sick and earned leave; from the server. */
const BALANCES: readonly (readonly [string, readonly (readonly [string, string, string])[]])[] = [
  [
    STAFF.arif.id,
    [
      ['10', '3', '7'],
      ['14', '2', '12'],
      ['18', '0', '18'],
    ],
  ],
  [
    STAFF.mehedi.id,
    [
      ['10', '4', '6'],
      ['14', '1', '13'],
      ['24', '5', '19'],
    ],
  ],
  [
    STAFF.sadia.id,
    [
      ['10', '2', '8'],
      ['14', '4', '10'],
      ['18', '0', '18'],
    ],
  ],
  [
    STAFF.tahmid.id,
    [
      ['10', '1', '9'],
      ['14', '0', '14'],
      ['18', '3', '15'],
    ],
  ],
  [
    STAFF.rumana.id,
    [
      ['10', '5', '5'],
      ['14', '3', '11'],
      ['12', '3', '9'],
    ],
  ],
  [
    STAFF.nusrat.id,
    [
      ['10', '2', '8'],
      ['14', '0', '14'],
      ['30', '6', '24'],
    ],
  ],
  [
    STAFF.rafiq.id,
    [
      ['10', '1', '9'],
      ['14', '1', '13'],
      ['36', '4', '32'],
    ],
  ],
  [
    STAFF.shirin.id,
    [
      ['10', '0', '10'],
      ['14', '1', '13'],
      ['0', '0', '0'],
    ],
  ],
];

export function leaveBalancesFor(role: SampleRole): readonly LeaveBalance[] {
  const kinds = [LEAVE_TYPES.casual, LEAVE_TYPES.sick, LEAVE_TYPES.earned];
  return BALANCES.filter(([employeeId]) => seesPerson(role, employeeId)).flatMap(
    ([employeeId, rows]) =>
      rows.map(([accrued, used, available], index) => {
        const kind = kinds.at(index) ?? LEAVE_TYPES.casual;
        return {
          employeeId,
          leaveTypeId: kind.id,
          leaveTypeName: kind.name,
          accrued,
          used,
          available,
        };
      }),
  );
}

export const DRAFT_LEAVE_ID = rid(8501);

type LeaveSeed = readonly [
  n: number,
  number: string | null,
  person: { readonly id: string; readonly name: string },
  type: { readonly id: string; readonly name: string },
  from: string,
  to: string,
  days: string,
  reason: string | null,
  status: LeaveRequest['status'],
];

const LEAVES: readonly LeaveSeed[] = [
  [
    1,
    null,
    STAFF.arif,
    LEAVE_TYPES.earned,
    '2026-12-24',
    '2026-12-31',
    '5',
    'Year-end trip to Sylhet',
    'draft',
  ],
  [
    2,
    'LV-2627-00118',
    STAFF.arif,
    LEAVE_TYPES.casual,
    '2026-11-26',
    '2026-11-27',
    '2',
    'Family event',
    'pending_approval',
  ],
  [
    3,
    'LV-2627-00117',
    STAFF.sadia,
    LEAVE_TYPES.sick,
    '2026-11-02',
    '2026-11-03',
    '2',
    'Fever',
    'approved',
  ],
  [
    4,
    'LV-2627-00112',
    STAFF.mehedi,
    LEAVE_TYPES.earned,
    '2026-12-20',
    '2026-12-26',
    '5',
    'Annual trip',
    'approved',
  ],
  [
    5,
    'LV-2627-00119',
    STAFF.tahmid,
    LEAVE_TYPES.casual,
    '2026-11-24',
    '2026-11-24',
    '1',
    'Personal errand',
    'pending_approval',
  ],
  [
    6,
    'LV-2627-00104',
    STAFF.rafiq,
    LEAVE_TYPES.casual,
    '2026-10-06',
    '2026-10-06',
    '1',
    null,
    'approved',
  ],
];

export function leaveRequestsFor(role: SampleRole, viewerId: string): readonly LeaveRequest[] {
  return LEAVES.filter(([, , person]) => seesPerson(role, person.id)).map(
    ([n, number, employee, type, from, to, days, reason, status]) => {
      const own = employee.id === viewerId;
      return {
        id: rid(8500 + n),
        number,
        employee,
        leaveTypeId: type.id,
        leaveTypeName: type.name,
        from,
        to,
        days,
        reason,
        status,
        approvalId: status === 'draft' ? null : rid(8950 + n),
        allowedActions: !own
          ? []
          : status === 'draft'
            ? ['submit', 'cancel']
            : status === 'pending_approval'
              ? ['cancel']
              : [],
        meta: meta(`${from}T04:00:00Z`, employee.id),
      };
    },
  );
}

/** Approved leave only, with no type or reason, so the whole team may see it. */
export const LEAVE_CALENDAR: readonly LeaveCalendarEntry[] = LEAVES.filter(
  ([, , , , , , , , status]) => status === 'approved',
).map(([, , employee, , from, to]) => ({ employee, from, to }));

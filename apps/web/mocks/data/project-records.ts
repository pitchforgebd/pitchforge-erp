/**
 * Project sample records from the prototype's fictional company. Progress, margins, budget use
 * and P&L figures are written out as the server would send them; nothing is calculated here.
 */
import type {
  FeeAgreement,
  Milestone,
  MyWork,
  Project,
  ProjectBudget,
  ProjectOverview,
  ProjectProfitAndLoss,
  Task,
  TaskComment,
  TeamMember,
  Timesheet,
} from '@pitchforge/contracts';

import { PROJECT_IDS } from './accounting-records.ts';
import { CLIENTS } from './billing-records.ts';
import { PEOPLE, bdt, rid } from './core-records.ts';
import type { SampleRole } from './sample-company.ts';

const meta = (at: string, by = PEOPLE.nusrat.id) => ({
  createdAt: at,
  createdBy: by,
  updatedAt: at,
  updatedBy: by,
  version: 1,
});

const extra = {
  mahin: { id: rid(9), name: 'Mahin Chowdhury' },
  tahmid: { id: rid(10), name: 'Tahmid Karim' },
  rumana: { id: rid(11), name: 'Rumana Sultana' },
} as const;

type Code = keyof typeof PROJECT_IDS;

interface ProjectSeed {
  readonly code: Code;
  readonly name: string;
  readonly client: { id: string; name: string };
  readonly type: Project['type'];
  readonly manager: { id: string; name: string };
  readonly value: string;
  readonly startDate: string;
  readonly team: readonly { id: string; name: string }[];
  readonly overview: Omit<ProjectOverview, 'project'>;
}

const SEEDS: readonly ProjectSeed[] = [
  {
    code: 'PF-2601',
    name: 'Loan Origination Portal',
    client: CLIENTS.nodi,
    type: 'fixed_price',
    manager: PEOPLE.nusrat,
    value: '4800000.00',
    startDate: '2026-06-15',
    team: [PEOPLE.nusrat, PEOPLE.arif, PEOPLE.mehedi, PEOPLE.sadia],
    overview: {
      invoiced: bdt('2880000.00'),
      costToDate: bdt('1960000.00'),
      margin: bdt('920000.00'),
      marginPercent: '31.9',
      progressPercent: '60',
      budgetUsedPercent: '57.6',
      budgetAlert: 'none',
    },
  },
  {
    code: 'PF-2602',
    name: 'Field Sales App',
    client: CLIENTS.shapla,
    type: 'fixed_price',
    manager: PEOPLE.nusrat,
    value: '2650000.00',
    startDate: '2026-07-01',
    team: [PEOPLE.nusrat, PEOPLE.mehedi, extra.mahin],
    overview: {
      invoiced: bdt('1325000.00'),
      costToDate: bdt('1410000.00'),
      margin: bdt('-85000.00'),
      marginPercent: '-6.4',
      progressPercent: '50',
      budgetUsedPercent: '78.3',
      budgetAlert: 'warning',
    },
  },
  {
    code: 'PF-2603',
    name: 'Data Platform AMC',
    client: CLIENTS.megh,
    type: 'retainer',
    manager: PEOPLE.sabbir,
    value: '1800000.00',
    startDate: '2026-07-01',
    team: [PEOPLE.sabbir, extra.tahmid],
    overview: {
      invoiced: bdt('600000.00'),
      costToDate: bdt('320000.00'),
      margin: bdt('280000.00'),
      marginPercent: '46.7',
      progressPercent: '25',
      budgetUsedPercent: '35.6',
      budgetAlert: 'none',
    },
  },
  {
    code: 'PF-2604',
    name: 'Store POS Rollout',
    client: CLIENTS.kaashful,
    type: 'time_and_materials',
    manager: PEOPLE.sabbir,
    value: '1240000.00',
    startDate: '2026-07-10',
    team: [PEOPLE.sabbir, PEOPLE.arif, extra.rumana],
    overview: {
      invoiced: bdt('910000.00'),
      costToDate: bdt('830000.00'),
      margin: bdt('80000.00'),
      marginPercent: '8.8',
      progressPercent: '70',
      budgetUsedPercent: '87.4',
      budgetAlert: 'warning',
    },
  },
  {
    code: 'PF-2605',
    name: 'HR Self-Service Portal',
    client: CLIENTS.karnaphuli,
    type: 'fixed_price',
    manager: PEOPLE.nusrat,
    value: '1580000.00',
    startDate: '2026-10-20',
    team: [PEOPLE.nusrat, PEOPLE.sadia],
    overview: {
      invoiced: bdt('0.00'),
      costToDate: bdt('120000.00'),
      margin: bdt('0.00'),
      marginPercent: '0',
      progressPercent: '0',
      budgetUsedPercent: '10.9',
      budgetAlert: 'none',
    },
  },
];

const seedOf = (projectId: string) => SEEDS.find((seed) => PROJECT_IDS[seed.code] === projectId);

/** Projects the viewer works on: a PM their own, an employee those they are staffed on. */
function visibleSeeds(role: SampleRole, userId: string): readonly ProjectSeed[] {
  if (role === 'partner' || role === 'finance') return SEEDS;
  if (role === 'pm') return SEEDS.filter((seed) => seed.manager.id === userId);
  return SEEDS.filter((seed) => seed.team.some((member) => member.id === userId));
}

/** Who may manage a project: a partner, or its own manager. */
export const managesProject = (role: SampleRole, userId: string, projectId: string): boolean =>
  role === 'partner' || (role === 'pm' && seedOf(projectId)?.manager.id === userId);

export function projectsFor(role: SampleRole, userId: string): readonly Project[] {
  return visibleSeeds(role, userId).map((seed) => ({
    id: PROJECT_IDS[seed.code],
    code: seed.code,
    name: seed.name,
    type: seed.type,
    status: 'active',
    clientId: seed.client.id,
    contractId: null,
    manager: seed.manager,
    value: bdt(seed.value),
    startDate: seed.startDate,
    endDate: null,
    allowedActions: managesProject(role, userId, PROJECT_IDS[seed.code])
      ? ['update', 'set_status']
      : [],
    meta: meta(`${seed.startDate}T04:00:00Z`),
  }));
}

export function clientNameOf(projectId: string): string {
  return seedOf(projectId)?.client.name ?? '';
}

export function overviewFor(
  role: SampleRole,
  userId: string,
  projectId: string,
): ProjectOverview | undefined {
  const project = projectsFor(role, userId).find((item) => item.id === projectId);
  const seed = seedOf(projectId);
  if (project === undefined || seed === undefined) return undefined;
  return { project, ...seed.overview };
}

/* Team, budget, P&L ------------------------------------------------------------------------- */

const RATES = new Map<string, string>([
  [PEOPLE.nusrat.id, '3500.00'],
  [PEOPLE.arif.id, '2200.00'],
  [PEOPLE.mehedi.id, '2800.00'],
  [PEOPLE.sadia.id, '1900.00'],
  [PEOPLE.sabbir.id, '4000.00'],
  [extra.mahin.id, '2500.00'],
  [extra.tahmid.id, '2600.00'],
  [extra.rumana.id, '1700.00'],
]);

export function teamOf(projectId: string): readonly TeamMember[] {
  const seed = seedOf(projectId);
  if (seed === undefined) return [];
  return seed.team.map((user, index) => ({
    user,
    role:
      index === 0
        ? 'Project manager'
        : user.id === extra.mahin.id
          ? 'Freelance designer'
          : 'Engineer',
    allocationPercent: index === 0 ? '30' : '80',
    billingRate: bdt(RATES.get(user.id) ?? '0.00'),
  }));
}

export function budgetOf(projectId: string): ProjectBudget | undefined {
  const seed = seedOf(projectId);
  if (seed === undefined) return undefined;
  return {
    projectId,
    version: seed.code === 'PF-2602' ? 2 : 1,
    lines: [
      { category: 'Engineering', amount: bdt('2200000.00'), hours: '1100' },
      { category: 'Design', amount: bdt('480000.00'), hours: '200' },
      { category: 'Cloud and tools', amount: bdt('360000.00'), hours: '0' },
      { category: 'Travel', amount: bdt('60000.00'), hours: '0' },
    ],
    total: bdt('3100000.00'),
    createdAt: `${seed.startDate}T04:00:00Z`,
  };
}

export function profitAndLossOf(projectId: string): ProjectProfitAndLoss | undefined {
  const seed = seedOf(projectId);
  if (seed === undefined) return undefined;
  return {
    projectId,
    from: seed.startDate,
    to: '2026-11-04',
    income: [
      { accountCode: '4110', accountName: 'Project services', amount: seed.overview.invoiced },
    ],
    costs: [
      { accountCode: '5310', accountName: 'Freelancers', amount: bdt('120000.00') },
      { accountCode: '5410', accountName: 'Cloud and hosting', amount: bdt('64000.00') },
      { accountCode: '5610', accountName: 'Travel', amount: bdt('12850.00') },
    ],
    labourCost: bdt('1763150.00'),
    profit: seed.overview.margin,
  };
}

/* Milestones -------------------------------------------------------------------------------- */

type MilestoneSeed = readonly [
  name: string,
  weight: string,
  due: string,
  status: Milestone['status'],
  billing: string,
  overdue?: boolean,
];

const MILESTONES: Readonly<Record<Code, readonly MilestoneSeed[]>> = {
  'PF-2601': [
    ['Discovery and SRS', '10', '2026-07-20', 'invoiced', '1440000.00'],
    ['UI design and clickable prototype', '15', '2026-08-25', 'signed_off', '0.00'],
    ['Core build, sprints 1–4', '35', '2026-10-10', 'invoiced', '1440000.00'],
    ['UAT and client sign-off', '20', '2026-11-12', 'delivered', '0.00'],
    ['Go-live and handover', '20', '2026-12-10', 'planned', '1920000.00'],
  ],
  'PF-2602': [
    ['Requirements and design', '20', '2026-08-10', 'invoiced', '662500.00'],
    ['Backend and admin panel', '30', '2026-09-15', 'invoiced', '662500.00'],
    ['Android release', '30', '2026-10-28', 'in_progress', '662500.00', true],
    ['iOS release and training', '20', '2026-12-15', 'planned', '662500.00'],
  ],
  'PF-2603': [
    ['Q1 service period', '25', '2026-09-30', 'invoiced', '450000.00'],
    ['Q2 service period', '25', '2026-12-31', 'in_progress', '450000.00'],
    ['Q3 service period', '25', '2027-03-31', 'planned', '450000.00'],
    ['Q4 service period', '25', '2027-06-30', 'planned', '450000.00'],
  ],
  'PF-2604': [
    ['Pilot: 5 branches', '30', '2026-08-30', 'signed_off', '0.00'],
    ['Rollout: branches 6–13', '40', '2026-10-15', 'signed_off', '0.00'],
    ['Branch 14 go-live', '15', '2026-11-06', 'in_progress', '0.00'],
    ['Hypercare and handover', '15', '2026-11-30', 'planned', '0.00'],
  ],
  'PF-2605': [
    ['Requirement sign-off', '10', '2026-11-20', 'in_progress', '474000.00'],
    ['Design', '20', '2026-12-20', 'planned', '0.00'],
    ['Build and test', '50', '2027-02-28', 'planned', '474000.00'],
    ['Go-live', '20', '2027-03-31', 'planned', '632000.00'],
  ],
};

export function milestonesFor(
  role: SampleRole,
  userId: string,
  projectId: string,
): readonly Milestone[] {
  const seed = seedOf(projectId);
  if (seed === undefined) return [];
  const manage = managesProject(role, userId, projectId);

  return MILESTONES[seed.code].map(
    ([name, weightPercent, dueDate, status, billing, overdue = false], index) => {
      let allowedActions: Milestone['allowedActions'] = [];
      if (manage && (status === 'planned' || status === 'in_progress')) allowedActions = ['update'];
      if (manage && status === 'delivered') allowedActions = ['update', 'sign_off'];
      return {
        id: rid(6000 + Number(seed.code.slice(-2)) * 10 + index),
        projectId,
        name,
        deliverables: null,
        weightPercent,
        billingAmount: bdt(billing),
        dueDate,
        overdue,
        status,
        signedOffAt:
          status === 'signed_off' || status === 'invoiced' ? `${dueDate}T10:00:00Z` : null,
        allowedActions,
        meta: meta(`${seed.startDate}T04:00:00Z`),
      };
    },
  );
}

/* Tasks ---------------------------------------------------------------------------------------- */

type TaskSeed = readonly [
  n: number,
  code: Code,
  title: string,
  who: { id: string; name: string },
  due: string,
  status: Task['status'],
];

const TASKS: readonly TaskSeed[] = [
  [41, 'PF-2601', 'Prepare UAT scripts for loan approval flow', PEOPLE.arif, '2026-11-05', 'todo'],
  [42, 'PF-2601', 'Load test: 500 concurrent loan officers', PEOPLE.mehedi, '2026-11-08', 'todo'],
  [
    43,
    'PF-2601',
    'Fix rounding in repayment schedule (poisha)',
    PEOPLE.arif,
    '2026-11-03',
    'in_progress',
  ],
  [
    44,
    'PF-2601',
    'Bangla SMS templates for disbursement',
    PEOPLE.sadia,
    '2026-11-06',
    'in_progress',
  ],
  [45, 'PF-2601', 'Role matrix for branch managers', PEOPLE.nusrat, '2026-11-04', 'review'],
  [46, 'PF-2601', 'Deploy staging build 1.4', PEOPLE.mehedi, '2026-10-30', 'done'],
  [
    47,
    'PF-2602',
    'Fix crash on order sync with poor network',
    PEOPLE.mehedi,
    '2026-11-03',
    'in_progress',
  ],
  [48, 'PF-2602', 'Play Store listing and screenshots', PEOPLE.nusrat, '2026-11-04', 'todo'],
  [49, 'PF-2604', 'Branch 14 printer and scanner setup', PEOPLE.arif, '2026-11-05', 'todo'],
];

export const taskId = (n: number) => rid(6400 + n);

export function tasksFor(role: SampleRole, userId: string, projectId: string): readonly Task[] {
  const seed = seedOf(projectId);
  if (seed === undefined || !visibleSeeds(role, userId).includes(seed)) return [];
  const onTeam =
    seed.team.some((member) => member.id === userId) || managesProject(role, userId, projectId);
  return TASKS.filter(([, code]) => code === seed.code).map(
    ([n, , title, who, dueDate, status]) => ({
      id: taskId(n),
      projectId,
      milestoneId: null,
      parentTaskId: null,
      title,
      description: null,
      assignees: [who],
      status,
      dueDate,
      allowedActions: onTeam ? ['update', 'comment'] : [],
      meta: meta('2026-10-20T04:00:00Z'),
    }),
  );
}

export const TASK_COMMENTS = new Map<string, readonly TaskComment[]>([
  [
    taskId(43),
    [
      {
        id: rid(6501),
        taskId: taskId(43),
        author: PEOPLE.nusrat,
        body: 'The client found a ৳0.01 gap on a 36-month schedule. Please use the shared rounding rule.',
        mentions: [PEOPLE.arif],
        createdAt: '2026-11-02T04:10:00Z',
      },
      {
        id: rid(6502),
        taskId: taskId(43),
        author: PEOPLE.arif,
        body: 'On it; the last instalment now absorbs the remainder.',
        mentions: [],
        createdAt: '2026-11-02T05:30:00Z',
      },
    ],
  ],
]);

/* Timesheets and my work --------------------------------------------------------------------- */

const entry = (code: Code, date: string, hours: string, note: string | null = null) => ({
  // eslint-disable-next-line security/detect-object-injection -- key is the project code union
  projectId: PROJECT_IDS[code],
  taskId: null,
  date,
  hours,
  note,
});

export const CURRENT_TIMESHEET_ID = rid(6601);

export function timesheetsFor(role: SampleRole, userId: string): readonly Timesheet[] {
  const all: Timesheet[] = [
    {
      id: CURRENT_TIMESHEET_ID,
      employee: PEOPLE.arif,
      weekStart: '2026-11-01',
      entries: [
        entry('PF-2601', '2026-11-01', '8'),
        entry('PF-2601', '2026-11-02', '7.5'),
        entry('PF-2601', '2026-11-03', '8'),
        entry('PF-2601', '2026-11-04', '7', 'UAT scripts'),
      ],
      totalHours: '30.5',
      status: 'draft',
      approvalId: null,
      allowedActions: userId === PEOPLE.arif.id ? ['update', 'submit'] : [],
      meta: meta('2026-11-04T10:00:00Z', PEOPLE.arif.id),
    },
    {
      id: rid(6602),
      employee: PEOPLE.arif,
      weekStart: '2026-10-25',
      entries: [
        entry('PF-2601', '2026-10-25', '8'),
        entry('PF-2604', '2026-10-26', '8'),
        entry('PF-2601', '2026-10-27', '7.5'),
      ],
      totalHours: '38.5',
      status: 'pending_approval',
      approvalId: rid(1107),
      allowedActions: [],
      meta: meta('2026-10-31T11:00:00Z', PEOPLE.arif.id),
    },
    {
      id: rid(6603),
      employee: PEOPLE.mehedi,
      weekStart: '2026-10-25',
      entries: [entry('PF-2601', '2026-10-25', '8'), entry('PF-2602', '2026-10-26', '8')],
      totalHours: '40',
      status: 'approved',
      approvalId: rid(6691),
      allowedActions: [],
      meta: meta('2026-10-31T11:30:00Z', PEOPLE.mehedi.id),
    },
  ];
  if (role === 'partner' || role === 'finance' || role === 'pm') return all;
  return all.filter((sheet) => sheet.employee.id === userId);
}

export function myWorkFor(role: SampleRole, userId: string): MyWork {
  const tasks = SEEDS.flatMap((seed) => tasksFor(role, userId, PROJECT_IDS[seed.code])).filter(
    (task) => task.status !== 'done' && task.assignees.some((person) => person.id === userId),
  );
  const milestonesDueSoon = visibleSeeds(role, userId)
    .flatMap((seed) => milestonesFor(role, userId, PROJECT_IDS[seed.code]))
    .filter((milestone) => ['2026-11-06', '2026-11-12'].includes(milestone.dueDate));
  return { tasks, milestonesDueSoon, timesheetDue: userId === PEOPLE.arif.id };
}

export const FEE_AGREEMENTS: readonly FeeAgreement[] = [
  {
    id: rid(6701),
    number: 'FEE-2627-00004',
    projectId: PROJECT_IDS['PF-2602'],
    payee: extra.mahin,
    description: 'UI design for the field sales app',
    amount: bdt('220000.00'),
    startDate: '2026-08-01',
    endDate: '2026-12-15',
    status: 'active',
    meta: meta('2026-08-01T04:00:00Z'),
  },
];

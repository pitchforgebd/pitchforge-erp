/**
 * Examples for the W2–W4 modules and projects, in the prototype's fictional company.
 * See examples.ts for how these are used.
 */

const uuid = (n: number) => `0190f2a4-7c3b-7d2e-8f00-${String(n).padStart(12, '0')}`;
const bdt = (amount: string) => ({ amount, currency: 'BDT' });

const T = '2026-11-04T08:30:00Z';
const DAY = '2026-11-04';
const JE_NO = 'JE-2627-00413';

const rafiq = { id: uuid(1), name: 'Rafiq Islam' };
const farhana = { id: uuid(2), name: 'Farhana Kabir' };
const nusrat = { id: uuid(3), name: 'Nusrat Jahan' };
const arif = { id: uuid(4), name: 'Arif Hossain' };
const meta = { createdAt: T, createdBy: uuid(1), updatedAt: T, updatedBy: uuid(1), version: 1 };

/* CRM ------------------------------------------------------------------------------------------ */

const createLead = {
  name: 'Bayside General Hospital',
  contactName: 'Dr. Kamrul Hasan',
  email: null,
  phone: null,
  source: 'Referral',
  need: 'Patient appointment and billing system',
  ownerId: uuid(2),
  nextFollowUp: DAY,
};
const client = {
  id: uuid(301),
  name: 'Nodi Microfinance',
  tin: null,
  bin: null,
  paymentTermsDays: 30,
  creditLimit: bdt('500000.00'),
  active: true,
  allowedActions: ['update'],
  meta,
};
const createClient = {
  name: 'Nodi Microfinance',
  tin: null,
  bin: null,
  paymentTermsDays: 30,
  creditLimit: null,
};
const clientContact = {
  id: uuid(302),
  clientId: uuid(301),
  name: 'Shamima Nasrin',
  role: 'Director',
  email: null,
  phone: null,
  primary: true,
};
const activity = {
  id: uuid(303),
  clientId: uuid(301),
  opportunityId: null,
  kind: 'call',
  subject: 'Discussed the mobile app scope',
  at: T,
  followUpOn: null,
  owner: farhana,
};
const stage = { id: uuid(304), name: 'Proposal', probabilityPercent: '50', closed: false };
const opportunity = {
  id: uuid(305),
  name: 'Microfinance mobile app',
  clientId: uuid(301),
  clientName: 'Nodi Microfinance',
  stageId: uuid(304),
  value: bdt('3100000.00'),
  probabilityPercent: '50',
  owner: farhana,
  expectedCloseDate: '2026-12-15',
  status: 'open',
  lostReason: null,
  competitor: null,
  projectId: null,
  allowedActions: ['update', 'move', 'win', 'lose'],
  meta,
};
const createOpportunity = {
  name: 'Microfinance mobile app',
  clientId: uuid(301),
  stageId: uuid(304),
  value: bdt('3100000.00'),
  ownerId: uuid(2),
  expectedCloseDate: null,
};
const forecastMonth = {
  month: '2026-12',
  total: bdt('3100000.00'),
  weighted: bdt('1550000.00'),
};
const quotationLine = {
  description: 'Mobile app build',
  quantity: '1',
  unitPrice: bdt('3100000.00'),
};
const createQuotation = {
  clientId: uuid(301),
  opportunityId: uuid(305),
  title: 'Microfinance mobile app',
  date: DAY,
  validUntil: '2026-12-04',
  lines: [quotationLine],
  discountPercent: '0',
};
const quotation = {
  ...createQuotation,
  id: uuid(306),
  number: 'QUO-2627-00032',
  revision: 1,
  clientName: 'Nodi Microfinance',
  gross: bdt('3100000.00'),
  discount: bdt('0.00'),
  vat: bdt('0.00'),
  total: bdt('3100000.00'),
  status: 'draft',
  approvalId: null,
  allowedActions: ['update', 'submit'],
  meta,
};
const createContract = {
  clientId: uuid(301),
  title: 'Microfinance mobile app',
  value: bdt('3100000.00'),
  startDate: DAY,
  endDate: null,
  renewalDate: null,
  retentionPercent: '5',
  warrantyEndDate: null,
  terms: null,
  fileIds: [],
};
const contract = {
  ...createContract,
  id: uuid(307),
  number: 'CNT-2627-00004',
  clientName: 'Nodi Microfinance',
  status: 'active',
  allowedActions: ['update'],
  meta,
};
const createTender = {
  title: 'Port users booking portal',
  procuringEntity: 'Chattogram Port Users Forum',
  egpId: null,
  method: 'Open tendering',
  estimatedValue: bdt('8000000.00'),
  submissionDeadline: '2026-12-01T06:00:00Z',
  internalDeadline: '2026-11-28T06:00:00Z',
  teamUserIds: [uuid(2)],
};
const tender = {
  ...createTender,
  id: uuid(308),
  teamUserIds: undefined,
  team: [farhana],
  status: 'preparing',
  rank: null,
  ourPrice: null,
  winningPrice: null,
  contractId: null,
  allowedActions: ['update'],
  meta,
};
const checklistItem = {
  id: uuid(309),
  document: 'Trade licence',
  owner: rafiq,
  dueAt: null,
  done: true,
  fileId: null,
};
const createGuarantee = {
  kind: 'bid_security',
  tenderId: uuid(308),
  contractId: null,
  issuer: 'City Bank',
  reference: 'BG-1234',
  amount: bdt('160000.00'),
  issuedOn: DAY,
  expiresOn: '2027-02-28',
};
const guarantee = {
  ...createGuarantee,
  id: uuid(310),
  status: 'active',
  allowedActions: ['release'],
  meta,
};

/* Billing -------------------------------------------------------------------------------------- */

const invoiceLine = {
  description: 'Milestone 2: UAT sign-off',
  quantity: '1',
  unitPrice: bdt('1440000.00'),
  taxCodeId: null,
};
const createInvoice = {
  kind: 'standard',
  clientId: uuid(301),
  projectId: uuid(30),
  source: 'milestone',
  sourceId: uuid(330),
  issueDate: DAY,
  dueDate: '2026-12-04',
  lines: [invoiceLine],
  adjustAdvanceInvoiceIds: [],
};
const { adjustAdvanceInvoiceIds: _ignored, ...invoiceFields } = createInvoice;
const invoice = {
  ...invoiceFields,
  id: uuid(320),
  number: 'INV-2627-00045',
  clientName: 'Nodi Microfinance',
  net: bdt('1440000.00'),
  vat: bdt('0.00'),
  advanceAdjusted: bdt('0.00'),
  total: bdt('1440000.00'),
  balanceDue: bdt('1440000.00'),
  status: 'posted',
  journalEntryNo: JE_NO,
  allowedActions: ['send_reminder'],
  meta,
};
const allocation = { invoiceId: uuid(320), amount: bdt('1332000.00') };
const createReceipt = {
  clientId: uuid(301),
  date: DAY,
  bankAccountId: uuid(16),
  amount: bdt('1332000.00'),
  ait: bdt('108000.00'),
  vds: bdt('0.00'),
  retention: bdt('0.00'),
  allocations: [allocation],
};
const receipt = {
  ...createReceipt,
  id: uuid(321),
  number: 'RCP-2627-00098',
  clientName: 'Nodi Microfinance',
  status: 'posted',
  journalEntryNo: JE_NO,
  allowedActions: [],
  meta,
};
const createCreditNote = {
  kind: 'credit_note',
  invoiceId: uuid(320),
  date: DAY,
  amount: bdt('10000.00'),
  reason: 'Scope reduced',
};
const creditNote = {
  ...createCreditNote,
  id: uuid(322),
  number: null,
  status: 'draft',
  approvalId: null,
  journalEntryNo: null,
  allowedActions: ['submit'],
  meta,
};

/* Tax ------------------------------------------------------------------------------------------ */

const createCertificate = {
  direction: 'received',
  kind: 'tds',
  partyName: 'Nodi Microfinance',
  period: '2026-10',
  amount: bdt('108000.00'),
  certificateNo: 'WH-0042',
  fileId: null,
};
const createChallan = {
  challanNo: 'CH-0091',
  taxKind: 'vds',
  period: '2026-10',
  amount: bdt('8500.00'),
  paidOn: DAY,
};

/* Projects ------------------------------------------------------------------------------------- */

const createProject = {
  code: 'PF-2601',
  name: 'Microfinance core banking',
  type: 'fixed_price',
  clientId: uuid(301),
  contractId: uuid(307),
  managerId: uuid(3),
  value: bdt('3600000.00'),
  startDate: '2026-07-15',
  endDate: null,
};
const { managerId: _manager, ...projectFields } = createProject;
const project = {
  ...projectFields,
  id: uuid(30),
  status: 'active',
  manager: nusrat,
  allowedActions: ['update', 'set_status'],
  meta,
};
const teamMember = {
  user: arif,
  role: 'Engineer',
  allocationPercent: '80',
  billingRate: bdt('2500.00'),
};
const budgetLine = { category: 'Engineering', amount: bdt('1800000.00'), hours: '1200' };
const createMilestone = {
  name: 'UAT sign-off',
  deliverables: 'Signed UAT report',
  weightPercent: '40',
  billingAmount: bdt('1440000.00'),
  dueDate: '2026-11-12',
};
const milestone = {
  ...createMilestone,
  id: uuid(330),
  projectId: uuid(30),
  overdue: false,
  status: 'in_progress',
  signedOffAt: null,
  allowedActions: ['update', 'sign_off'],
  meta,
};
const createTask = {
  milestoneId: uuid(330),
  parentTaskId: null,
  title: 'Prepare UAT scripts',
  description: null,
  assigneeIds: [uuid(4)],
  dueDate: '2026-11-08',
};
const { assigneeIds: _assignees, ...taskFields } = createTask;
const task = {
  ...taskFields,
  id: uuid(331),
  projectId: uuid(30),
  assignees: [arif],
  status: 'in_progress',
  allowedActions: ['update', 'comment'],
  meta,
};
const timesheetEntry = {
  projectId: uuid(30),
  taskId: uuid(331),
  date: DAY,
  hours: '7.5',
  note: null,
};
const timesheet = {
  id: uuid(332),
  employee: arif,
  weekStart: '2026-11-01',
  entries: [timesheetEntry],
  totalHours: '7.5',
  status: 'draft',
  approvalId: null,
  allowedActions: ['update', 'submit'],
  meta,
};
const pnlLine = { accountCode: '4110', accountName: 'Project revenue', amount: bdt('1440000.00') };
const createFee = {
  projectId: uuid(30),
  payeeContactId: uuid(5),
  description: 'UI design',
  amount: bdt('120000.00'),
  startDate: DAY,
  endDate: null,
};

/* HR ------------------------------------------------------------------------------------------- */

const createEmployee = {
  employeeCode: 'E-0024',
  name: 'Arif Hossain',
  workEmail: 'arif@pitchforge.example',
  departmentId: uuid(4),
  managerId: uuid(3),
  jobTitle: 'Software Engineer',
  grade: 'E2',
  employmentType: 'permanent',
  joinedOn: '2025-02-01',
  probationEndsOn: null,
  contractEndsOn: null,
};
const employee = {
  ...createEmployee,
  id: uuid(340),
  userId: uuid(4),
  leftOn: null,
  status: 'active',
  nid: '••••••1234',
  tin: '••••••5678',
  bankAccount: '••••••9012',
  allowedActions: ['update'],
  meta,
};
const clearance = { key: 'laptop', label: 'Laptop returned', done: false, doneBy: null };
const createShift = {
  name: 'Head office',
  startsAt: '09:00',
  endsAt: '18:00',
  weekendDays: ['fri', 'sat'],
  lateAfterMinutes: 15,
  earlyLeaveMinutes: 15,
};
const attendance = {
  id: uuid(341),
  employee: arif,
  date: DAY,
  checkInAt: '2026-11-04T03:02:00Z',
  checkOutAt: null,
  source: 'web',
  status: 'present',
};
const createRegularisation = {
  date: '2026-11-03',
  checkInAt: '2026-11-03T03:00:00Z',
  checkOutAt: '2026-11-03T12:00:00Z',
  reason: 'Forgot to check in',
};
const createLeaveType = {
  name: 'Casual',
  daysPerYear: '10',
  carryForwardDays: '0',
  encashable: false,
  validFrom: '2026-07-01',
};
const createLeave = {
  leaveTypeId: uuid(342),
  from: '2026-11-09',
  to: '2026-11-10',
  reason: 'Family event in Sylhet',
};
const leaveRequest = {
  ...createLeave,
  id: uuid(343),
  number: 'LV-2627-00118',
  employee: arif,
  leaveTypeName: 'Casual',
  days: '2',
  status: 'pending_approval',
  approvalId: uuid(7),
  allowedActions: ['cancel'],
  meta,
};

/* Payroll -------------------------------------------------------------------------------------- */

const payslipLine = { label: 'Basic', kind: 'earning', amount: bdt('60000.00') };
const salaryComponent = { name: 'House rent', amount: bdt('30000.00') };
const payrollRun = {
  id: uuid(350),
  number: 'PAY-2627-00004',
  kind: 'monthly',
  month: '2026-10',
  headcount: 24,
  gross: bdt('1420000.00'),
  tax: bdt('98700.00'),
  providentFund: bdt('57000.00'),
  net: bdt('1264300.00'),
  status: 'draft',
  approvalId: null,
  journalEntryNo: null,
  allowedActions: ['submit'],
  meta,
};
const createLoan = {
  employeeId: uuid(340),
  kind: 'advance',
  principal: bdt('30000.00'),
  monthlyDeduction: bdt('5000.00'),
};

/* Procurement ---------------------------------------------------------------------------------- */

const createVendor = {
  name: 'TechPoint BD',
  tin: null,
  bin: null,
  withholdingCategory: 'Goods',
  bankAccountNumber: null,
};
const vendor = {
  id: uuid(360),
  name: 'TechPoint BD',
  tin: null,
  bin: null,
  withholdingCategory: 'Goods',
  bankAccount: '••••••4321',
  active: true,
  allowedActions: ['update'],
  meta,
};
const requisitionLine = {
  description: 'Laptop, Core i7, 32 GB',
  quantity: '4',
  estimatedUnitPrice: bdt('149000.00'),
};
const createRequisition = {
  departmentId: uuid(4),
  projectId: null,
  purpose: 'New engineers',
  lines: [requisitionLine],
};
const orderLine = {
  description: 'Laptop, Core i7, 32 GB',
  quantity: '4',
  unitPrice: bdt('149000.00'),
};
const createOrder = { vendorId: uuid(360), requisitionId: null, date: DAY, lines: [orderLine] };
const createReceiptOfGoods = {
  purchaseOrderId: uuid(361),
  receivedOn: DAY,
  lines: [{ description: 'Laptop, Core i7, 32 GB', quantity: '4' }],
};
const createAsset = {
  tag: 'AST-0042',
  name: 'Laptop',
  category: 'Computers',
  purchasedOn: DAY,
  cost: bdt('149000.00'),
  method: 'straight_line',
  annualRate: '0.25',
};
const createLicence = {
  name: 'pitchforge.com.bd',
  kind: 'domain',
  vendorId: null,
  cost: bdt('2500.00'),
  renewsOn: '2027-03-01',
};
const createDeposit = {
  kind: 'deposit',
  party: 'Gulshan Office Space Ltd',
  purpose: 'Office security deposit',
  amount: bdt('450000.00'),
  givenOn: '2026-07-01',
  expiresOn: null,
};

/* Reporting ------------------------------------------------------------------------------------ */

const statementRow = {
  label: 'Project revenue',
  accountId: uuid(11),
  accountCode: '4110',
  amount: bdt('1440000.00'),
  comparative: null,
  isTotal: false,
};
const statementSection = { title: 'Income', rows: [statementRow], total: bdt('1440000.00') };
const trialRow = {
  accountId: uuid(11),
  accountCode: '4110',
  accountName: 'Project revenue',
  debit: bdt('0.00'),
  credit: bdt('1440000.00'),
};
const ledgerRow = {
  date: DAY,
  entryNo: JE_NO,
  description: 'Invoice INV-2627-00045',
  source: { recordType: 'sales_invoice', recordId: uuid(320) },
  debit: bdt('0.00'),
  credit: bdt('1440000.00'),
  balance: bdt('-1440000.00'),
};
const reportColumn = { key: 'partyName', label: 'Payee', kind: 'text' };
const tile = {
  key: 'cash',
  label: 'Cash position',
  money: bdt('2500000.00'),
  count: null,
  hint: null,
  link: '/finance',
};
const createSchedule = {
  report: 'vat_summary',
  format: 'pdf',
  frequency: 'monthly',
  recipientUserIds: [uuid(1)],
};

export const MODULE_EXAMPLES: Readonly<Record<string, unknown>> = {
  Quantity: '7.5',
  YearMonth: '2026-10',

  Lead: {
    ...createLead,
    ownerId: undefined,
    id: uuid(300),
    number: 'LEAD-2627-00014',
    owner: farhana,
    status: 'new',
    allowedActions: ['update', 'convert'],
    meta,
  },
  CreateLead: createLead,
  UpdateLead: { status: 'contacted' },
  DuplicateMatch: {
    recordType: 'client',
    recordId: uuid(301),
    name: 'Nodi Microfinance',
    matchedOn: ['name'],
  },
  ClientAccount: client,
  CreateClientAccount: createClient,
  UpdateClientAccount: { active: false },
  ClientContact: clientContact,
  CreateClientContact: {
    name: 'Shamima Nasrin',
    role: 'Director',
    email: null,
    phone: null,
    primary: true,
  },
  SalesActivity: activity,
  CreateSalesActivity: {
    clientId: uuid(301),
    opportunityId: null,
    kind: 'note',
    subject: 'Sent the proposal',
    followUpOn: null,
  },
  ClientOverview: {
    client,
    contacts: [clientContact],
    recentActivities: [activity],
    openPipelineValue: bdt('3100000.00'),
    receivableBalance: bdt('1440000.00'),
    activeProjects: 1,
    activeContracts: 1,
  },
  PipelineStage: stage,
  ReplacePipelineStages: {
    stages: [
      { id: uuid(304), name: 'Proposal', probabilityPercent: '50' },
      { id: null, name: 'Negotiation', probabilityPercent: '75' },
    ],
  },
  Opportunity: opportunity,
  CreateOpportunity: createOpportunity,
  UpdateOpportunity: { name: 'Microfinance app' },
  MoveOpportunity: { stageId: uuid(304) },
  LoseOpportunity: { reason: 'Price too high', competitor: null },
  WinOpportunity: { projectStartDate: DAY },
  SalesForecastMonth: forecastMonth,
  SalesForecast: { months: [forecastMonth] },
  Quotation: quotation,
  CreateQuotation: createQuotation,
  UpdateQuotation: { title: 'Microfinance app' },
  Contract: contract,
  CreateContract: createContract,
  UpdateContract: { status: 'completed' },
  Tender: tender,
  CreateTender: createTender,
  UpdateTender: { title: 'Port booking portal' },
  TenderOutcome: { result: 'lost', rank: 2, ourPrice: null, winningPrice: null },
  AwardTender: { contractValue: bdt('7800000.00'), startDate: DAY },
  TenderChecklistItem: checklistItem,
  ReplaceTenderChecklist: {
    items: [
      {
        id: null,
        document: 'Trade licence',
        ownerId: null,
        dueAt: null,
        done: false,
        fileId: null,
      },
    ],
  },
  StandardDocument: {
    id: uuid(311),
    name: 'Trade licence',
    fileId: uuid(10),
    expiresOn: '2027-06-30',
    meta,
  },
  CreateStandardDocument: { name: 'Trade licence', fileId: uuid(10), expiresOn: null },
  Guarantee: guarantee,
  CreateGuarantee: createGuarantee,

  SalesInvoice: invoice,
  CreateSalesInvoice: createInvoice,
  UpdateSalesInvoice: { dueDate: '2026-12-10' },
  ReceiptAllocation: allocation,
  Receipt: receipt,
  CreateReceipt: createReceipt,
  CreditNote: creditNote,
  CreateCreditNote: createCreditNote,

  VatReturn: {
    month: '2026-10',
    outputVat: bdt('186000.00'),
    inputVat: bdt('24000.00'),
    vdsDeducted: bdt('0.00'),
    payable: bdt('162000.00'),
  },
  WithholdingCertificate: { ...createCertificate, id: uuid(323), meta },
  CreateWithholdingCertificate: createCertificate,
  Challan: { ...createChallan, id: uuid(324), journalEntryNo: JE_NO, meta },
  CreateChallan: createChallan,

  Project: project,
  CreateProject: createProject,
  UpdateProject: { name: 'Core banking' },
  SetProjectStatus: { status: 'on_hold' },
  ProjectOverview: {
    project,
    invoiced: bdt('1440000.00'),
    costToDate: bdt('980000.00'),
    margin: bdt('460000.00'),
    marginPercent: '31.94',
    progressPercent: '40',
    budgetUsedPercent: '54.44',
    budgetAlert: 'none',
  },
  TeamMember: teamMember,
  ReplaceProjectTeam: {
    members: [{ userId: uuid(4), role: 'Engineer', allocationPercent: '80', billingRate: null }],
  },
  ProjectBudget: {
    projectId: uuid(30),
    version: 2,
    lines: [budgetLine],
    total: bdt('1800000.00'),
    createdAt: T,
  },
  CreateBudgetVersion: { lines: [budgetLine], reason: 'Scope grew' },
  Milestone: milestone,
  CreateMilestone: createMilestone,
  UpdateMilestone: { dueDate: '2026-11-19', dueDateChangeReason: 'Client delay' },
  Task: task,
  CreateTask: createTask,
  UpdateTask: { status: 'done' },
  TaskComment: {
    id: uuid(333),
    taskId: uuid(331),
    author: nusrat,
    body: 'Please share the scripts today',
    mentions: [arif],
    createdAt: T,
  },
  CreateTaskComment: { body: 'Done', mentionedUserIds: [] },
  MyWork: { tasks: [task], milestonesDueSoon: [milestone], timesheetDue: true },
  Timesheet: timesheet,
  CreateTimesheet: { weekStart: '2026-11-01', entries: [timesheetEntry] },
  UpdateTimesheet: { entries: [timesheetEntry] },
  ProjectPnlLine: pnlLine,
  ProjectProfitAndLoss: {
    projectId: uuid(30),
    from: '2026-07-01',
    to: DAY,
    income: [pnlLine],
    costs: [],
    labourCost: bdt('620000.00'),
    profit: bdt('820000.00'),
  },
  FeeAgreement: {
    id: uuid(334),
    number: null,
    projectId: uuid(30),
    payee: { id: uuid(5), name: 'Mahin Chowdhury' },
    description: 'UI design',
    amount: bdt('120000.00'),
    startDate: DAY,
    endDate: null,
    status: 'active',
    meta,
  },
  CreateFeeAgreement: createFee,

  Employee: employee,
  CreateEmployee: createEmployee,
  UpdateEmployee: { jobTitle: 'Senior Engineer' },
  UpdateProtectedDetails: { bankAccountNumber: '0000000001' },
  EmployeeEvent: {
    id: uuid(344),
    employeeId: uuid(340),
    kind: 'confirmed',
    effectiveOn: DAY,
    note: null,
    recordedBy: rafiq,
  },
  CreateEmployeeEvent: { kind: 'confirmed', effectiveOn: DAY, note: null },
  ClearanceItem: clearance,
  Offboarding: {
    employeeId: uuid(340),
    lastWorkingDay: '2026-12-31',
    items: [clearance],
    finalSettlementId: null,
  },
  StartOffboarding: { lastWorkingDay: '2026-12-31', reason: 'Resigned' },
  UpdateClearanceItem: { key: 'laptop', done: true },
  Shift: { ...createShift, id: uuid(345), meta },
  CreateShift: createShift,
  UpdateShift: { lateAfterMinutes: 10 },
  AttendanceRecord: attendance,
  CheckIn: { kind: 'in', location: null },
  AttendanceRegularisation: {
    ...createRegularisation,
    id: uuid(346),
    employee: arif,
    status: 'draft',
    approvalId: null,
    allowedActions: ['submit'],
    meta,
  },
  CreateRegularisation: createRegularisation,
  CloseAttendanceMonth: { month: '2026-10' },
  LeaveType: { ...createLeaveType, id: uuid(342), validTo: null, meta },
  CreateLeaveTypeVersion: createLeaveType,
  LeaveBalance: {
    employeeId: uuid(340),
    leaveTypeId: uuid(342),
    leaveTypeName: 'Casual',
    accrued: '10',
    used: '3',
    available: '7',
  },
  LeaveRequest: leaveRequest,
  CreateLeaveRequest: createLeave,
  LeaveCalendarEntry: { employee: arif, from: '2026-11-09', to: '2026-11-10' },

  SalaryStructure: {
    id: uuid(351),
    employee: arif,
    grade: 'E2',
    basicSalary: bdt('60000.00'),
    allowances: [salaryComponent],
    grossSalary: bdt('90000.00'),
    validFrom: '2026-07-01',
    validTo: null,
    meta,
  },
  CreateSalaryStructureVersion: {
    employeeId: uuid(340),
    grade: null,
    basicSalary: bdt('60000.00'),
    allowances: [salaryComponent],
    validFrom: '2026-07-01',
  },
  PayrollRun: payrollRun,
  CreatePayrollRun: { kind: 'monthly', month: '2026-11' },
  SalarySheetRow: {
    employee: arif,
    daysWorked: '26',
    overtimePay: bdt('0.00'),
    grossPay: bdt('90000.00'),
    taxDeducted: bdt('4500.00'),
    netPay: bdt('85500.00'),
  },
  PayslipLine: payslipLine,
  Payslip: {
    id: uuid(352),
    payrollRunId: uuid(350),
    employee: arif,
    month: '2026-10',
    lines: [payslipLine],
    grossPay: bdt('90000.00'),
    netPay: bdt('85500.00'),
    issuedAt: T,
  },
  TaxDeclaration: {
    id: uuid(353),
    employee: arif,
    fiscalYearCode: '2627',
    projectedAnnualTax: bdt('54000.00'),
    monthlyTds: bdt('4500.00'),
    investments: bdt('100000.00'),
    meta,
  },
  SubmitTaxDeclaration: { fiscalYearCode: '2627', investments: bdt('100000.00') },
  SalaryLoan: {
    id: uuid(354),
    employee: arif,
    kind: 'advance',
    principal: bdt('30000.00'),
    monthlyDeduction: bdt('5000.00'),
    outstanding: bdt('30000.00'),
    status: 'draft',
    approvalId: null,
    allowedActions: ['submit'],
    meta,
  },
  CreateSalaryLoan: createLoan,
  FinalSettlement: {
    id: uuid(355),
    employee: arif,
    lastWorkingDay: '2026-12-31',
    lines: [payslipLine],
    netPay: bdt('60000.00'),
    status: 'draft',
    approvalId: null,
    journalEntryNo: null,
    allowedActions: ['submit'],
    meta,
  },
  CreateFinalSettlement: { employeeId: uuid(340), lastWorkingDay: '2026-12-31' },
  TaxCertificate: {
    id: uuid(356),
    employee: arif,
    fiscalYearCode: '2526',
    fileId: uuid(10),
    issuedAt: T,
  },

  Vendor: vendor,
  CreateVendor: createVendor,
  UpdateVendor: { active: false },
  Requisition: {
    ...createRequisition,
    id: uuid(362),
    number: null,
    requestedBy: nusrat,
    estimatedTotal: bdt('596000.00'),
    status: 'draft',
    approvalId: null,
    allowedActions: ['submit'],
    meta,
  },
  CreateRequisition: createRequisition,
  PurchaseOrder: {
    ...createOrder,
    id: uuid(361),
    number: 'PO-2627-00061',
    amendment: 0,
    vendorName: 'TechPoint BD',
    total: bdt('596000.00'),
    status: 'pending_approval',
    approvalId: uuid(7),
    allowedActions: [],
    meta,
  },
  CreatePurchaseOrder: createOrder,
  UpdatePurchaseOrder: { date: '2026-11-05' },
  GoodsReceipt: {
    ...createReceiptOfGoods,
    id: uuid(363),
    number: 'GRN-2627-00017',
    receivedBy: rafiq,
    meta,
  },
  CreateGoodsReceipt: createReceiptOfGoods,
  Asset: {
    ...createAsset,
    id: uuid(364),
    bookValue: bdt('149000.00'),
    assignedTo: arif,
    status: 'assigned',
    allowedActions: ['update', 'return'],
    meta,
  },
  CreateAsset: createAsset,
  UpdateAsset: { name: 'Laptop 14 inch' },
  AssignAsset: { employeeId: uuid(340) },
  DepreciationRun: {
    id: uuid(365),
    month: '2026-10',
    assets: 42,
    total: bdt('86000.00'),
    status: 'preview',
    journalEntryNo: null,
    allowedActions: ['post'],
    meta,
  },
  CreateDepreciationRun: { month: '2026-10' },
  Licence: { ...createLicence, id: uuid(366), meta },
  CreateLicence: createLicence,
  UpdateLicence: { renewsOn: '2028-03-01' },
  DepositGiven: { ...createDeposit, id: uuid(367), status: 'active', meta },
  CreateDepositGiven: createDeposit,

  StatementRow: statementRow,
  StatementSection: statementSection,
  FinancialStatement: {
    title: 'Profit and loss',
    from: '2026-07-01',
    to: '2026-10-31',
    sections: [statementSection],
    result: bdt('1440000.00'),
    generatedAt: T,
  },
  TrialBalanceRow: trialRow,
  TrialBalance: {
    asOf: DAY,
    rows: [trialRow],
    totalDebit: bdt('0.00'),
    totalCredit: bdt('1440000.00'),
    generatedAt: T,
  },
  LedgerRow: ledgerRow,
  AccountLedger: {
    accountId: uuid(11),
    accountName: 'Project revenue',
    from: '2026-07-01',
    to: DAY,
    opening: bdt('0.00'),
    rows: [ledgerRow],
    closing: bdt('-1440000.00'),
  },
  ReportColumn: reportColumn,
  ReportTable: {
    report: 'payee_payments',
    title: 'Payee payment history',
    from: '2026-07-01',
    to: DAY,
    columns: [reportColumn],
    rows: [{ partyName: 'CloudNest Hosting Ltd', paid: bdt('164000.00') }],
    generatedAt: T,
  },
  DashboardTile: tile,
  Dashboard: { kind: 'finance', tiles: [tile], generatedAt: T },
  ReportSchedule: { ...createSchedule, id: uuid(370), nextRunAt: T },
  CreateReportSchedule: createSchedule,
};

const money = (amount: unknown, currency: unknown = 'BDT') => ({ amount, currency });

/** Cases that test a real rule, beyond a missing or unknown field. */
export const MODULE_INVALID: Readonly<Record<string, readonly unknown[]>> = {
  Quantity: ['-1', '1.2345', 7.5, 'abc'],
  YearMonth: ['2026-13', '2026-1', '10-2026'],
  CreateQuotation: [
    { ...createQuotation, lines: [] },
    { ...createQuotation, discountPercent: '101' },
    { ...createQuotation, lines: [{ ...quotationLine, unitPrice: money(3100000) }] },
  ],
  CreateProject: [{ ...createProject, code: 'lowercase' }],
  CreateTimesheet: [{ weekStart: DAY, entries: [{ ...timesheetEntry, hours: 7.5 }] }],
  CreateReceipt: [{ ...createReceipt, allocations: [] }],
  CreateMilestone: [{ ...createMilestone, weightPercent: '120' }],
  Employee: [
    { ...employee, nid: '1234567890123' },
    { ...employee, bankAccount: '0000000001' },
  ],
  Vendor: [{ ...vendor, bankAccount: '0000000001' }],
  CreatePayrollRun: [{ kind: 'monthly', month: 'October' }],
  CreateSalaryLoan: [{ ...createLoan, principal: bdt('0.00') }],
  CreateReportSchedule: [{ ...createSchedule, recipientUserIds: [] }],
  CreateShift: [{ ...createShift, lateAfterMinutes: 1000 }],
};

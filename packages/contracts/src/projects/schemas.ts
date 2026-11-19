import { z } from 'zod';

import {
  DocumentNo,
  IsoDate,
  Money,
  NonNegativeMoney,
  Percent,
  Quantity,
  Reason,
  Timestamp,
  Uuid,
} from '../shared/primitives.ts';
import { AuditMeta, PersonRef, allowedActions, restricted } from '../shared/record.ts';

const Name = z.string().trim().min(2).max(200);

export const ProjectType = z
  .enum(['fixed_price', 'time_and_materials', 'retainer', 'internal', 'tender'])
  .meta({ id: 'ProjectType' });
export type ProjectType = z.infer<typeof ProjectType>;

export const ProjectStatus = z
  .enum(['planning', 'active', 'on_hold', 'completed', 'closed'])
  .meta({ id: 'ProjectStatus' });
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const Project = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    type: ProjectType,
    status: ProjectStatus,
    clientId: Uuid.nullable(),
    contractId: Uuid.nullable(),
    manager: PersonRef,
    value: NonNegativeMoney,
    startDate: IsoDate,
    endDate: IsoDate.nullable(),
    allowedActions: allowedActions(['update', 'set_status']),
    meta: AuditMeta,
  })
  .meta({ id: 'Project' });
export type Project = z.infer<typeof Project>;

export const CreateProject = z
  .strictObject({
    code: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}-[0-9]{4}$/),
    name: Name,
    type: ProjectType,
    clientId: Uuid.nullable(),
    contractId: Uuid.nullable(),
    managerId: Uuid,
    value: NonNegativeMoney,
    startDate: IsoDate,
    endDate: IsoDate.nullable(),
  })
  .meta({ id: 'CreateProject' });
export type CreateProject = z.infer<typeof CreateProject>;

export const UpdateProject = CreateProject.omit({ code: true })
  .partial()
  .meta({ id: 'UpdateProject' });
export type UpdateProject = z.infer<typeof UpdateProject>;

/** Closing a project locks it (PRJ-03). */
export const SetProjectStatus = z
  .strictObject({ status: ProjectStatus })
  .meta({ id: 'SetProjectStatus' });
export type SetProjectStatus = z.infer<typeof SetProjectStatus>;

/** Value, cost, margin and progress, calculated by the server from the ledger (PRJ-06). */
export const ProjectOverview = z
  .object({
    project: Project,
    invoiced: NonNegativeMoney,
    costToDate: NonNegativeMoney,
    margin: Money,
    marginPercent: z.string(),
    progressPercent: Percent,
    budgetUsedPercent: z.string(),
    /** Set at 80% and 100% of budget (PRJ-29). */
    budgetAlert: z.enum(['none', 'warning', 'exceeded']),
  })
  .meta({ id: 'ProjectOverview' });
export type ProjectOverview = z.infer<typeof ProjectOverview>;

export const TeamMember = z
  .object({
    user: PersonRef,
    role: z.string(),
    allocationPercent: Percent,
    /** Partner and Finance only; PMs see project totals (access control matrix). */
    billingRate: restricted(Money, 'labour-cost'),
  })
  .meta({ id: 'TeamMember' });
export type TeamMember = z.infer<typeof TeamMember>;

export const ReplaceProjectTeam = z
  .strictObject({
    members: z
      .array(
        z.strictObject({
          userId: Uuid,
          role: z.string().trim().min(2).max(80),
          allocationPercent: Percent,
          billingRate: Money.nullable(),
        }),
      )
      .max(100),
  })
  .meta({ id: 'ReplaceProjectTeam' });
export type ReplaceProjectTeam = z.infer<typeof ReplaceProjectTeam>;

const BudgetLineInput = z
  .strictObject({
    category: z.string().trim().min(2).max(80),
    amount: NonNegativeMoney,
    hours: Quantity,
  })
  .meta({ id: 'BudgetLineInput' });

export const ProjectBudget = z
  .object({
    projectId: Uuid,
    version: z.number().int().min(1),
    lines: z.array(BudgetLineInput),
    total: NonNegativeMoney,
    createdAt: Timestamp,
  })
  .meta({ id: 'ProjectBudget' });
export type ProjectBudget = z.infer<typeof ProjectBudget>;

export const CreateBudgetVersion = z
  .strictObject({ lines: z.array(BudgetLineInput).min(1).max(100), reason: Reason })
  .meta({ id: 'CreateBudgetVersion' });
export type CreateBudgetVersion = z.infer<typeof CreateBudgetVersion>;

export const MilestoneStatus = z
  .enum(['planned', 'in_progress', 'delivered', 'signed_off', 'invoiced'])
  .meta({ id: 'MilestoneStatus' });
export type MilestoneStatus = z.infer<typeof MilestoneStatus>;

export const Milestone = z
  .object({
    id: Uuid,
    projectId: Uuid,
    name: z.string(),
    deliverables: z.string().nullable(),
    weightPercent: Percent,
    billingAmount: NonNegativeMoney,
    dueDate: IsoDate,
    /** Derived by the server (PRJ-11). */
    overdue: z.boolean(),
    status: MilestoneStatus,
    signedOffAt: Timestamp.nullable(),
    allowedActions: allowedActions(['update', 'sign_off']),
    meta: AuditMeta,
  })
  .meta({ id: 'Milestone' });
export type Milestone = z.infer<typeof Milestone>;

export const CreateMilestone = z
  .strictObject({
    name: Name,
    deliverables: z.string().trim().max(1000).nullable(),
    weightPercent: Percent,
    billingAmount: NonNegativeMoney,
    dueDate: IsoDate,
  })
  .meta({ id: 'CreateMilestone' });
export type CreateMilestone = z.infer<typeof CreateMilestone>;

export const UpdateMilestone = CreateMilestone.extend({
  /** Required when the due date changes (PRJ-12); the server refuses it otherwise. */
  dueDateChangeReason: Reason,
})
  .partial()
  .meta({ id: 'UpdateMilestone' });
export type UpdateMilestone = z.infer<typeof UpdateMilestone>;

export const TaskStatus = z
  .enum(['todo', 'in_progress', 'review', 'done'])
  .meta({ id: 'TaskStatus' });
export type TaskStatus = z.infer<typeof TaskStatus>;

export const Task = z
  .object({
    id: Uuid,
    projectId: Uuid,
    milestoneId: Uuid.nullable(),
    parentTaskId: Uuid.nullable(),
    title: z.string(),
    description: z.string().nullable(),
    assignees: z.array(PersonRef),
    status: TaskStatus,
    dueDate: IsoDate.nullable(),
    allowedActions: allowedActions(['update', 'comment']),
    meta: AuditMeta,
  })
  .meta({ id: 'Task' });
export type Task = z.infer<typeof Task>;

export const CreateTask = z
  .strictObject({
    milestoneId: Uuid.nullable(),
    parentTaskId: Uuid.nullable(),
    title: Name,
    description: z.string().trim().max(4000).nullable(),
    assigneeIds: z.array(Uuid).max(20),
    dueDate: IsoDate.nullable(),
  })
  .meta({ id: 'CreateTask' });
export type CreateTask = z.infer<typeof CreateTask>;

export const UpdateTask = CreateTask.extend({ status: TaskStatus })
  .partial()
  .meta({ id: 'UpdateTask' });
export type UpdateTask = z.infer<typeof UpdateTask>;

export const TaskComment = z
  .object({
    id: Uuid,
    taskId: Uuid,
    author: PersonRef,
    body: z.string(),
    mentions: z.array(PersonRef),
    createdAt: Timestamp,
  })
  .meta({ id: 'TaskComment' });
export type TaskComment = z.infer<typeof TaskComment>;

export const CreateTaskComment = z
  .strictObject({
    body: z.string().trim().min(1).max(4000),
    mentionedUserIds: z.array(Uuid).max(20),
  })
  .meta({ id: 'CreateTaskComment' });
export type CreateTaskComment = z.infer<typeof CreateTaskComment>;

/** What one person should do next, across projects (PRJ-20). */
export const MyWork = z
  .object({
    tasks: z.array(Task),
    milestonesDueSoon: z.array(Milestone),
    timesheetDue: z.boolean(),
  })
  .meta({ id: 'MyWork' });
export type MyWork = z.infer<typeof MyWork>;

export const TimesheetStatus = z
  .enum(['draft', 'pending_approval', 'approved', 'rejected', 'locked'])
  .meta({ id: 'TimesheetStatus' });
export type TimesheetStatus = z.infer<typeof TimesheetStatus>;

const TimesheetEntryInput = z
  .strictObject({
    projectId: Uuid,
    taskId: Uuid.nullable(),
    date: IsoDate,
    hours: Quantity,
    note: z.string().trim().max(300).nullable(),
  })
  .meta({ id: 'TimesheetEntryInput' });

export const Timesheet = z
  .object({
    id: Uuid,
    employee: PersonRef,
    weekStart: IsoDate,
    entries: z.array(TimesheetEntryInput),
    totalHours: Quantity,
    status: TimesheetStatus,
    approvalId: Uuid.nullable(),
    allowedActions: allowedActions(['update', 'submit']),
    meta: AuditMeta,
  })
  .meta({ id: 'Timesheet' });
export type Timesheet = z.infer<typeof Timesheet>;

export const CreateTimesheet = z
  .strictObject({ weekStart: IsoDate, entries: z.array(TimesheetEntryInput).max(100) })
  .meta({ id: 'CreateTimesheet' });
export type CreateTimesheet = z.infer<typeof CreateTimesheet>;

export const UpdateTimesheet = CreateTimesheet.partial().meta({ id: 'UpdateTimesheet' });
export type UpdateTimesheet = z.infer<typeof UpdateTimesheet>;

export const ProjectPnlLine = z
  .object({ accountCode: z.string(), accountName: z.string(), amount: Money })
  .meta({ id: 'ProjectPnlLine' });
export type ProjectPnlLine = z.infer<typeof ProjectPnlLine>;

/** From the ledger, not from project tables, so it always agrees with the books (PRJ-28). */
export const ProjectProfitAndLoss = z
  .object({
    projectId: Uuid,
    from: IsoDate,
    to: IsoDate,
    income: z.array(ProjectPnlLine),
    costs: z.array(ProjectPnlLine),
    /** Labour cost from approved timesheets; per-person detail is never in this report. */
    labourCost: NonNegativeMoney,
    profit: Money,
  })
  .meta({ id: 'ProjectProfitAndLoss' });
export type ProjectProfitAndLoss = z.infer<typeof ProjectProfitAndLoss>;

/** Engineer and freelancer fee agreements (PRJ-31). */
export const FeeAgreement = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    projectId: Uuid,
    payee: PersonRef,
    description: z.string(),
    amount: restricted(NonNegativeMoney, 'labour-cost'),
    startDate: IsoDate,
    endDate: IsoDate.nullable(),
    status: z.enum(['active', 'completed', 'cancelled']),
    meta: AuditMeta,
  })
  .meta({ id: 'FeeAgreement' });
export type FeeAgreement = z.infer<typeof FeeAgreement>;

export const CreateFeeAgreement = z
  .strictObject({
    projectId: Uuid,
    payeeContactId: Uuid,
    description: z.string().trim().min(3).max(300),
    amount: NonNegativeMoney,
    startDate: IsoDate,
    endDate: IsoDate.nullable(),
  })
  .meta({ id: 'CreateFeeAgreement' });
export type CreateFeeAgreement = z.infer<typeof CreateFeeAgreement>;

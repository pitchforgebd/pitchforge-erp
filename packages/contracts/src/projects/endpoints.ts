import { z } from 'zod';

import { command, createOne, getOne, listOf, updateOne } from '../endpoint-helpers.ts';
import { IdParams, defineEndpoints } from '../endpoint.ts';
import { listQuery, page } from '../shared/pagination.ts';
import { IsoDate, Uuid } from '../shared/primitives.ts';

import {
  CreateBudgetVersion,
  CreateFeeAgreement,
  CreateMilestone,
  CreateProject,
  CreateTask,
  CreateTaskComment,
  CreateTimesheet,
  FeeAgreement,
  Milestone,
  MilestoneStatus,
  MyWork,
  Project,
  ProjectBudget,
  ProjectOverview,
  ProjectProfitAndLoss,
  ProjectStatus,
  ProjectType,
  ReplaceProjectTeam,
  SetProjectStatus,
  Task,
  TaskComment,
  TaskStatus,
  TeamMember,
  Timesheet,
  TimesheetStatus,
  UpdateMilestone,
  UpdateProject,
  UpdateTask,
  UpdateTimesheet,
} from './schemas.ts';

const P = '/api/v1/projects';

export const projectsEndpoints = defineEndpoints('projects', {
  /* Projects ------------------------------------------------------------------------------------ */
  listProjects: listOf(`${P}/projects`, 'Projects within the caller’s scope', ['PRJ-01'], Project, {
    status: ProjectStatus.optional(),
    type: ProjectType.optional(),
    managerId: Uuid.optional(),
  }),
  getProject: getOne(`${P}/projects/{id}`, 'One project', ['PRJ-01', 'PRJ-02'], Project),
  createProject: createOne(
    `${P}/projects`,
    'Add a project',
    ['PRJ-01', 'PRJ-02'],
    CreateProject,
    Project,
  ),
  updateProject: updateOne(
    `${P}/projects/{id}`,
    'Update a project',
    ['PRJ-01'],
    UpdateProject,
    Project,
  ),
  setProjectStatus: {
    ...command(
      `${P}/projects/{id}:set-status`,
      'Change status; Closed locks the project',
      ['PRJ-03'],
      Project,
    ),
    body: SetProjectStatus,
  },
  getProjectOverview: getOne(
    `${P}/projects/{id}/overview`,
    'Value, cost, margin, progress and budget alerts',
    ['PRJ-06', 'PRJ-29'],
    ProjectOverview,
  ),
  getProjectTeam: getOne(
    `${P}/projects/{id}/team`,
    'Team with role and allocation; billing rates need field permission',
    ['PRJ-04'],
    z.object({ items: z.array(TeamMember) }),
  ),
  replaceProjectTeam: {
    method: 'PUT',
    path: `${P}/projects/{id}/team`,
    summary: 'Replace the project team',
    featureIds: ['PRJ-04'],
    params: IdParams,
    versioned: false,
    body: ReplaceProjectTeam,
    response: z.object({ items: z.array(TeamMember) }),
  },
  getProjectBudget: getOne(
    `${P}/projects/{id}/budget`,
    'Current budget by category and hours',
    ['PRJ-05'],
    ProjectBudget,
  ),
  createBudgetVersion: {
    ...createOne(
      `${P}/projects/{id}/budget`,
      'Add a new budget version; earlier versions are kept',
      ['PRJ-05'],
      CreateBudgetVersion,
      ProjectBudget,
    ),
    params: IdParams,
    versioned: false,
  },
  getProjectProfitAndLoss: {
    method: 'GET',
    path: `${P}/projects/{id}/profit-and-loss`,
    summary: 'Project P&L from the ledger',
    featureIds: ['PRJ-25', 'PRJ-28', 'RPT-09'],
    params: IdParams,
    query: z.strictObject({ from: IsoDate.optional(), to: IsoDate.optional() }),
    response: ProjectProfitAndLoss,
  },

  /* Milestones ---------------------------------------------------------------------------------- */
  listMilestones: {
    method: 'GET',
    path: `${P}/projects/{id}/milestones`,
    summary: 'Milestones of a project, with the derived overdue flag',
    featureIds: ['PRJ-09', 'PRJ-11'],
    params: IdParams,
    list: true,
    query: listQuery({ status: MilestoneStatus.optional() }),
    response: page(Milestone),
  },
  createMilestone: {
    ...createOne(
      `${P}/projects/{id}/milestones`,
      'Add a milestone; weights must total 100% before the project starts',
      ['PRJ-09', 'PRJ-10'],
      CreateMilestone,
      Milestone,
    ),
    params: IdParams,
    versioned: false,
    errors: ['WEIGHTS_NOT_100_PERCENT'],
  },
  getMilestone: getOne(`${P}/milestones/{id}`, 'One milestone', ['PRJ-09'], Milestone),
  updateMilestone: {
    ...updateOne(
      `${P}/milestones/{id}`,
      'Update a milestone; a new due date needs a reason',
      ['PRJ-09', 'PRJ-10', 'PRJ-12'],
      UpdateMilestone,
      Milestone,
    ),
    errors: ['WEIGHTS_NOT_100_PERCENT', 'INVALID_STATE'],
  },
  signOffMilestone: command(
    `${P}/milestones/{id}:sign-off`,
    'Record client sign-off; finance gets a draft invoice from the event',
    ['PRJ-13'],
    Milestone,
  ),

  /* Tasks --------------------------------------------------------------------------------------- */
  listTasks: {
    method: 'GET',
    path: `${P}/projects/{id}/tasks`,
    summary: 'Tasks, for the board, list and calendar views',
    featureIds: ['PRJ-15', 'PRJ-17', 'PRJ-18'],
    params: IdParams,
    list: true,
    query: listQuery({
      status: TaskStatus.optional(),
      assigneeId: Uuid.optional(),
      dueFrom: IsoDate.optional(),
      dueTo: IsoDate.optional(),
    }),
    response: page(Task),
  },
  createTask: {
    ...createOne(
      `${P}/projects/{id}/tasks`,
      'Add a task or sub-task, with one or more assignees',
      ['PRJ-15', 'PRJ-16'],
      CreateTask,
      Task,
    ),
    params: IdParams,
    versioned: false,
  },
  getTask: getOne(`${P}/tasks/{id}`, 'One task', ['PRJ-15'], Task),
  updateTask: updateOne(
    `${P}/tasks/{id}`,
    'Update a task, or move it on the board',
    ['PRJ-15', 'PRJ-16', 'PRJ-17'],
    UpdateTask,
    Task,
  ),
  listTaskComments: {
    method: 'GET',
    path: `${P}/tasks/{id}/comments`,
    summary: 'Comments on a task',
    featureIds: ['PRJ-21'],
    params: IdParams,
    list: true,
    query: listQuery({}),
    response: page(TaskComment),
  },
  addTaskComment: {
    ...createOne(
      `${P}/tasks/{id}/comments`,
      'Comment, with @mentions',
      ['PRJ-21'],
      CreateTaskComment,
      TaskComment,
    ),
    params: IdParams,
    versioned: false,
  },
  getMyWork: {
    method: 'GET',
    path: `${P}/my-work`,
    summary: 'The caller’s tasks, milestones and timesheet',
    featureIds: ['PRJ-20'],
    response: MyWork,
  },

  /* Timesheets ---------------------------------------------------------------------------------- */
  listTimesheets: listOf(`${P}/timesheets`, 'Weekly timesheets', ['PRJ-23'], Timesheet, {
    status: TimesheetStatus.optional(),
    employeeId: Uuid.optional(),
    weekStart: IsoDate.optional(),
  }),
  getTimesheet: getOne(`${P}/timesheets/{id}`, 'One timesheet', ['PRJ-23'], Timesheet),
  createTimesheet: createOne(
    `${P}/timesheets`,
    'Start a weekly timesheet',
    ['PRJ-23'],
    CreateTimesheet,
    Timesheet,
  ),
  updateTimesheet: {
    ...updateOne(
      `${P}/timesheets/{id}`,
      'Change a draft timesheet',
      ['PRJ-23'],
      UpdateTimesheet,
      Timesheet,
    ),
    errors: ['INVALID_STATE'],
  },
  submitTimesheet: command(
    `${P}/timesheets/{id}:submit`,
    'Send for approval through core approvals; approval locks it',
    ['PRJ-24'],
    Timesheet,
  ),

  /* Fee agreements ------------------------------------------------------------------------------ */
  listFeeAgreements: listOf(
    `${P}/fee-agreements`,
    'Engineer and freelancer fee agreements',
    ['PRJ-31'],
    FeeAgreement,
    { projectId: Uuid.optional() },
  ),
  createFeeAgreement: createOne(
    `${P}/fee-agreements`,
    'Add a fee agreement',
    ['PRJ-31'],
    CreateFeeAgreement,
    FeeAgreement,
  ),
});

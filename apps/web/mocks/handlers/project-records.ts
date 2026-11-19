import { projectsEndpoints as projects } from '@pitchforge/contracts';
import type { Task, TaskComment } from '@pitchforge/contracts';

import { PROJECT_IDS } from '../data/accounting-records.ts';
import { rid } from '../data/core-records.ts';
import {
  FEE_AGREEMENTS,
  TASK_COMMENTS,
  budgetOf,
  managesProject,
  milestonesFor,
  myWorkFor,
  overviewFor,
  profitAndLossOf,
  projectsFor,
  tasksFor,
  teamOf,
  timesheetsFor,
} from '../data/project-records.ts';
import { mock } from '../define.ts';
import type { MockHandler, MockReply, MockRequest } from '../define.ts';
import { idOf, parentIdOf, serveList, serveOne, viewerOf, withoutRestricted } from '../serve.ts';
import type { Viewer } from '../serve.ts';

/** Money on a project: partners, finance and the project's own manager (access matrix). */
const seesProjectMoney = (viewer: Viewer, projectId: string) =>
  viewer.role === 'partner' ||
  viewer.role === 'finance' ||
  managesProject(viewer.role, viewer.userId, projectId);

const canSee = (viewer: Viewer, projectId: string) =>
  projectsFor(viewer.role, viewer.userId).some((project) => project.id === projectId);

const ALL_PROJECT_IDS = Object.values(PROJECT_IDS);

const allMilestones = (viewer: Viewer) =>
  ALL_PROJECT_IDS.flatMap((projectId) => milestonesFor(viewer.role, viewer.userId, projectId));
const allTasks = (viewer: Viewer) =>
  ALL_PROJECT_IDS.flatMap((projectId) => tasksFor(viewer.role, viewer.userId, projectId));

async function withViewer(
  request: MockRequest,
  reply: (viewer: Viewer) => MockReply | Promise<MockReply>,
): Promise<MockReply> {
  const viewer = viewerOf(request);
  return viewer === undefined ? { problem: 'UNAUTHENTICATED' } : reply(viewer);
}

/** A command on a record the viewer can see and act on. */
function act<T extends { readonly id: string; readonly allowedActions: readonly string[] }>(
  request: MockRequest,
  rows: (viewer: Viewer) => readonly T[],
  action: string,
  outcome: (row: T, body: Record<string, unknown>) => MockReply,
) {
  return withViewer(request, async (viewer) => {
    const row = rows(viewer).find((candidate) => candidate.id === idOf(request));
    if (row === undefined) return { problem: 'NOT_FOUND' };
    if (!row.allowedActions.includes(action)) return { problem: 'FORBIDDEN' };
    const text = await request.request.text();
    return outcome(row, text === '' ? {} : (JSON.parse(text) as Record<string, unknown>));
  });
}

export const projectRecordHandlers: readonly MockHandler[] = [
  serveList(projects.listProjects, (viewer) => projectsFor(viewer.role, viewer.userId)),
  serveOne(projects.getProject, (viewer) => projectsFor(viewer.role, viewer.userId)),
  mock(projects.getProjectOverview, (request) =>
    withViewer(request, (viewer) => {
      const id = parentIdOf(request);
      if (!canSee(viewer, id)) return { problem: 'NOT_FOUND' };
      if (!seesProjectMoney(viewer, id)) return { problem: 'FORBIDDEN' };
      const overview = overviewFor(viewer.role, viewer.userId, id);
      return overview === undefined ? { problem: 'NOT_FOUND' } : { json: overview };
    }),
  ),
  mock(projects.getProjectTeam, (request) =>
    withViewer(request, (viewer) => {
      const id = parentIdOf(request);
      if (!canSee(viewer, id)) return { problem: 'NOT_FOUND' };
      // Billing rates are labour cost: left out for a role without that field permission.
      return {
        json: withoutRestricted(projects.getProjectTeam.response, { items: teamOf(id) }, viewer),
      };
    }),
  ),
  mock(projects.getProjectBudget, (request) =>
    withViewer(request, (viewer) => {
      const id = parentIdOf(request);
      if (!canSee(viewer, id)) return { problem: 'NOT_FOUND' };
      if (!seesProjectMoney(viewer, id)) return { problem: 'FORBIDDEN' };
      const budget = budgetOf(id);
      return budget === undefined ? { problem: 'NOT_FOUND' } : { json: budget };
    }),
  ),
  mock(projects.getProjectProfitAndLoss, (request) =>
    withViewer(request, (viewer) => {
      const id = parentIdOf(request);
      if (!canSee(viewer, id)) return { problem: 'NOT_FOUND' };
      if (!seesProjectMoney(viewer, id)) return { problem: 'FORBIDDEN' };
      const pnl = profitAndLossOf(id);
      return pnl === undefined ? { problem: 'NOT_FOUND' } : { json: pnl };
    }),
  ),

  serveList(projects.listMilestones, (viewer, request) =>
    milestonesFor(viewer.role, viewer.userId, parentIdOf(request)),
  ),
  serveOne(projects.getMilestone, allMilestones),
  mock(projects.updateMilestone, (request) =>
    act(request, allMilestones, 'update', (milestone, body) => ({
      json: { ...milestone, ...body },
    })),
  ),
  mock(projects.signOffMilestone, (request) =>
    act(request, allMilestones, 'sign_off', (milestone) => ({
      json: {
        ...milestone,
        status: 'signed_off',
        signedOffAt: '2026-11-04T06:00:00Z',
        allowedActions: [],
      },
    })),
  ),

  serveList(
    projects.listTasks,
    (viewer, request) => tasksFor(viewer.role, viewer.userId, parentIdOf(request)),
    {
      filters: {
        assigneeId: (row, value) =>
          (row['assignees'] as { id: string }[]).some((person) => person.id === value),
      },
    },
  ),
  serveOne(projects.getTask, allTasks),
  mock(projects.updateTask, (request) =>
    act(request, allTasks, 'update', (task, body) => ({ json: { ...task, ...body } })),
  ),
  mock(projects.createTask, (request) =>
    withViewer(request, async (viewer) => {
      const projectId = parentIdOf(request);
      if (!canSee(viewer, projectId)) return { problem: 'NOT_FOUND' };
      const body = (await request.request.json()) as {
        title: string;
        description: string | null;
        milestoneId: string | null;
        dueDate: string | null;
        assigneeIds: string[];
      };
      const team = new Map(
        tasksFor(viewer.role, viewer.userId, projectId)
          .flatMap((task) => task.assignees)
          .map((person) => [person.id, person]),
      );
      // The new task is the request echoed back; nothing in it is worked out here.
      const task: Task = {
        id: rid(6499),
        projectId,
        milestoneId: body.milestoneId,
        parentTaskId: null,
        title: body.title,
        description: body.description,
        assignees: body.assigneeIds.flatMap((id) => {
          const person = team.get(id);
          return person === undefined ? [] : [person];
        }),
        status: 'todo',
        dueDate: body.dueDate,
        allowedActions: ['update', 'comment'],
        meta: {
          createdAt: '2026-11-04T06:00:00Z',
          createdBy: viewer.userId,
          updatedAt: '2026-11-04T06:00:00Z',
          updatedBy: viewer.userId,
          version: 1,
        },
      };
      return { json: task };
    }),
  ),
  serveList(
    projects.listTaskComments,
    (_viewer, request) => TASK_COMMENTS.get(parentIdOf(request)) ?? [],
  ),
  mock(projects.addTaskComment, (request) =>
    withViewer(request, async (viewer) => {
      const task = allTasks(viewer).find((candidate) => candidate.id === parentIdOf(request));
      if (task === undefined) return { problem: 'NOT_FOUND' };
      if (!task.allowedActions.includes('comment')) return { problem: 'FORBIDDEN' };
      const body = (await request.request.json()) as { body: string };
      // The comment is the request echoed back with its author.
      const comment: TaskComment = {
        id: rid(6599),
        taskId: task.id,
        author: { id: viewer.userId, name: viewer.name },
        body: body.body,
        mentions: [],
        createdAt: '2026-11-04T06:00:00Z',
      };
      return { json: comment };
    }),
  ),
  mock(projects.getMyWork, (request) =>
    withViewer(request, (viewer) => ({ json: myWorkFor(viewer.role, viewer.userId) })),
  ),

  serveList(projects.listTimesheets, (viewer) => timesheetsFor(viewer.role, viewer.userId)),
  serveOne(projects.getTimesheet, (viewer) => timesheetsFor(viewer.role, viewer.userId)),
  mock(projects.submitTimesheet, (request) =>
    act(
      request,
      (viewer) => timesheetsFor(viewer.role, viewer.userId),
      'submit',
      (sheet) => ({
        json: { ...sheet, status: 'pending_approval', approvalId: rid(1114), allowedActions: [] },
      }),
    ),
  ),
  serveList(projects.listFeeAgreements, (viewer) =>
    viewer.role === 'partner' || viewer.role === 'finance' || viewer.role === 'pm'
      ? FEE_AGREEMENTS
      : [],
  ),
];

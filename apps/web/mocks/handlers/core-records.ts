import { coreEndpoints as core, reportingEndpoints as reporting } from '@pitchforge/contracts';
import type { ApprovalRequest, DashboardKind } from '@pitchforge/contracts';

import {
  APPROVAL_ERRORS,
  APPROVAL_RULES,
  AUDIT_ENTRIES,
  COMPANY,
  HOLIDAYS,
  MY_SESSIONS,
  NUMBER_SERIES,
  ORG_UNITS,
  REMINDER_RULES,
  ROLES,
  SEARCH_RESULTS,
  USERS,
  approvalsFor,
  dashboardOf,
} from '../data/core-records.ts';
import { mock } from '../define.ts';
import type { MockHandler, MockReply, MockRequest } from '../define.ts';
import { idOf, serveList, serveOne, serveValue, viewerOf } from '../serve.ts';
import type { Viewer } from '../serve.ts';

/** Set by a step-up; a sensitive command needs it (security architecture §1). */
const STEP_UP_COOKIE = '__Host-pf_stepup';
const STEP_UP_SECONDS = 300;
const WRONG_CODE = '000000';

const errorOf = (id: string) => Object.entries(APPROVAL_ERRORS).find(([key]) => key === id)?.[1];

function findApproval(viewer: Viewer, id: string): ApprovalRequest | undefined {
  return approvalsFor(viewer.role).find((approval) => approval.id === id);
}

type Decision = 'approve' | 'reject' | 'return' | 'delegate';

/** The fixed outcome of a decision: the same record, decided, with nothing left to do. */
const DECIDED: Readonly<Record<Decision, ApprovalRequest['status']>> = {
  approve: 'approved',
  reject: 'rejected',
  return: 'returned',
  delegate: 'pending',
};

function decide(request: MockRequest, action: Decision): MockReply {
  const viewer = viewerOf(request);
  if (viewer === undefined) return { problem: 'UNAUTHENTICATED' };
  const id = idOf(request);
  const fixedError = errorOf(id);
  if (fixedError !== undefined) return { problem: fixedError };

  const approval = findApproval(viewer, id);
  if (approval === undefined) return { problem: 'NOT_FOUND' };
  if (!approval.allowedActions.includes(action)) {
    return { problem: approval.requestedBy.id === viewer.userId ? 'SOD_VIOLATION' : 'FORBIDDEN' };
  }
  if (action === 'approve' && request.cookie(STEP_UP_COOKIE) === undefined) {
    return { problem: 'STEP_UP_REQUIRED' };
  }

  // eslint-disable-next-line security/detect-object-injection -- key is the Decision union
  const decided = { ...approval, status: DECIDED[action], allowedActions: [] };
  if (action !== 'approve') return { json: decided };
  return {
    json: {
      approval: decided,
      journalEntryNo: approval.posting === null ? null : 'JE-2627-00414',
    },
  };
}

/** The dashboard a role opens on. The real API picks it from the user's roles. */
const HOME_DASHBOARD: Readonly<Record<Viewer['role'], DashboardKind>> = {
  partner: 'partner',
  finance: 'finance',
  pm: 'pm',
  employee: 'employee',
};

export const coreRecordHandlers: readonly MockHandler[] = [
  serveList(core.listApprovals, (viewer) => approvalsFor(viewer.role), {
    filters: {
      assignedToMe: (row, value) => String(row['assignedToMe']) === value,
    },
  }),
  serveOne(core.getApproval, (viewer) => approvalsFor(viewer.role)),
  mock(core.approve, (request) => decide(request, 'approve')),
  mock(core.reject, (request) => decide(request, 'reject')),
  mock(core.returnForChanges, (request) => decide(request, 'return')),
  mock(core.delegate, (request) => decide(request, 'delegate')),

  mock(core.stepUp, async (request) => {
    if (viewerOf(request) === undefined) return { problem: 'UNAUTHENTICATED' };
    const body = (await request.request.json()) as { code?: string };
    if (body.code === WRONG_CODE) return { problem: 'INVALID_TWO_FACTOR_CODE' };
    return {
      json: { validUntil: '2026-11-04T09:05:00Z' },
      cookies: [
        `${STEP_UP_COOKIE}=1; Max-Age=${String(STEP_UP_SECONDS)}; Path=/; HttpOnly; Secure; SameSite=Lax`,
      ],
    };
  }),

  serveList(core.listAuditLog, AUDIT_ENTRIES, {
    filters: {
      userId: (row, value) => (row['user'] as { id?: string } | null)?.id === value,
      tableName: (row, value) => String(row['tableName']).startsWith(value),
    },
  }),
  serveList(core.listUsers, USERS),
  serveOne(core.getUser, USERS),
  serveList(core.listRoles, ROLES),
  serveOne(core.getRole, ROLES),
  serveList(core.listApprovalRules, APPROVAL_RULES),
  serveList(core.listOrgUnits, ORG_UNITS),
  serveList(core.listHolidays, HOLIDAYS),
  serveList(core.listNumberSeries, NUMBER_SERIES),
  serveList(core.listReminderRules, REMINDER_RULES),
  serveList(core.listMySessions, MY_SESSIONS),
  serveValue(core.getCompany, () => COMPANY),
  serveList(core.search, SEARCH_RESULTS, {
    filters: {
      q: (row, value) =>
        `${String(row['title'])} ${String(row['subtitle'])}`
          .toLowerCase()
          .includes(value.toLowerCase()),
    },
  }),
  serveValue(reporting.getDashboard, (viewer, request) => {
    const kind = idOf(request) as DashboardKind;
    // Each role may open only its own home dashboard; a partner may open them all.
    return viewer.role === 'partner' || HOME_DASHBOARD[viewer.role] === kind
      ? dashboardOf(kind)
      : undefined;
  }),
];

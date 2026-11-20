import { hrEndpoints as hr } from '@pitchforge/contracts';

import { rid } from '../data/core-records.ts';
import {
  CHECKED_IN,
  EMPLOYEE_EVENTS,
  LEAVE_CALENDAR,
  LEAVE_TYPE_LIST,
  LEAVE_TYPES,
  OFFBOARDING,
  RUMANA_ID,
  SHIFTS,
  STAFF,
  attendanceFor,
  employeesFor,
  leaveBalancesFor,
  leaveRequestsFor,
  regularisationsFor,
  runsHr,
  seesPerson,
} from '../data/hr-records.ts';
import type { MockHandler, MockReply } from '../define.ts';
import {
  actOn,
  bodyOf,
  idOf,
  parentIdOf,
  serveList,
  serveOne,
  serveValue,
  steppedUp,
  withViewerAsync,
} from '../serve.ts';
import type { Viewer } from '../serve.ts';

/** Audit fields of a record created just now. */
const CREATED = {
  createdAt: '2026-11-20T05:00:00Z',
  createdBy: STAFF.farhana.id,
  updatedAt: '2026-11-20T05:00:00Z',
  updatedBy: STAFF.farhana.id,
  version: 1,
};

const employees = (viewer: Viewer) => employeesFor(viewer.role);
const leaves = (viewer: Viewer) => leaveRequestsFor(viewer.role, viewer.userId);
const regularisations = (viewer: Viewer) => regularisationsFor(viewer.role, viewer.userId);

/** HR-only writes: anyone else is refused before the body is read. */
const hrOnly = (viewer: Viewer, reply: () => MockReply | Promise<MockReply>) =>
  runsHr(viewer.role) ? reply() : ({ problem: 'FORBIDDEN' } as const);

/** The sample employee record behind the signed-in user, if they have one. */
const selfOf = (viewer: Viewer) =>
  employeesFor('partner').find((row) => row.userId === viewer.userId);

export const hrRecordHandlers: readonly MockHandler[] = [
  /* Employees */
  serveList(hr.listEmployees, employees, {
    filters: { q: (row, value) => String(row['name']).toLowerCase().includes(value.toLowerCase()) },
  }),
  serveOne(hr.getEmployee, employees),
  withViewerAsync(hr.createEmployee, (viewer, request) =>
    hrOnly(viewer, async () => {
      const body = await bodyOf(request);
      return {
        json: {
          ...body,
          id: rid(13),
          userId: null,
          status: 'active',
          leftOn: null,
          meta: CREATED,
          nid: null,
          tin: null,
          bankAccount: null,
          allowedActions: ['update', 'update_protected', 'offboard'],
        },
      };
    }),
  ),
  withViewerAsync(hr.updateEmployee, (viewer, request) =>
    hrOnly(viewer, async () => {
      const row = employees(viewer).find((candidate) => candidate.id === idOf(request));
      return row === undefined
        ? { problem: 'NOT_FOUND' }
        : { json: { ...row, ...(await bodyOf(request)) } };
    }),
  ),
  actOn(hr.updateProtectedDetails, employees, 'update_protected', (row) => ({ json: row }), {
    stepUp: true,
  }),
  serveValue(hr.listEmployeeEvents, (viewer, request) =>
    seesPerson(viewer.role, parentIdOf(request))
      ? { items: EMPLOYEE_EVENTS.filter((item) => item.employeeId === parentIdOf(request)) }
      : undefined,
  ),
  withViewerAsync(hr.addEmployeeEvent, (viewer, request) =>
    hrOnly(viewer, async () => ({
      json: {
        id: rid(8199),
        employeeId: parentIdOf(request),
        recordedBy: STAFF.farhana,
        ...(await bodyOf(request)),
      },
    })),
  ),
  actOn(hr.startOffboarding, employees, 'offboard', (row, body) => ({
    json: {
      employeeId: row.id,
      lastWorkingDay: body['lastWorkingDay'],
      items: OFFBOARDING.items.map((item) => ({ ...item, done: false, doneBy: null })),
      finalSettlementId: null,
    },
  })),
  serveValue(hr.getOffboarding, (viewer, request) =>
    parentIdOf(request) === RUMANA_ID && (runsHr(viewer.role) || viewer.role === 'pm')
      ? OFFBOARDING
      : undefined,
  ),
  withViewerAsync(hr.updateClearanceItem, (viewer, request) =>
    hrOnly(viewer, async () => {
      if (parentIdOf(request) !== RUMANA_ID) return { problem: 'NOT_FOUND' };
      const body = await bodyOf(request);
      return {
        json: {
          ...OFFBOARDING,
          items: OFFBOARDING.items.map((item) =>
            item.key === body['key']
              ? {
                  ...item,
                  done: body['done'] === true,
                  doneBy: body['done'] === true ? STAFF.farhana : null,
                }
              : item,
          ),
        },
      };
    }),
  ),

  /* Attendance */
  serveList(hr.listShifts, SHIFTS),
  serveList(hr.listAttendance, (viewer) => attendanceFor(viewer.role), {
    filters: {
      from: (row, value) => String(row['date']) >= value,
      to: (row, value) => String(row['date']) <= value,
    },
  }),
  withViewerAsync(hr.checkIn, async (viewer, request) => {
    const self = selfOf(viewer);
    if (self === undefined) return { problem: 'INVALID_STATE' };
    const body = await bodyOf(request);
    return {
      json: {
        ...CHECKED_IN,
        employee: { id: self.id, name: self.name },
        checkOutAt: body['kind'] === 'out' ? '2026-11-20T12:06:00Z' : null,
      },
    };
  }),
  serveList(hr.listRegularisations, regularisations),
  withViewerAsync(hr.createRegularisation, async (viewer, request) => {
    const self = selfOf(viewer);
    if (self === undefined) return { problem: 'FORBIDDEN' };
    return {
      json: {
        id: rid(8359),
        employee: { id: self.id, name: self.name },
        status: 'draft',
        approvalId: null,
        allowedActions: ['submit'],
        meta: CREATED,
        ...(await bodyOf(request)),
      },
    };
  }),
  actOn(hr.submitRegularisation, regularisations, 'submit', (row) => ({
    json: { ...row, status: 'pending_approval', approvalId: rid(8958), allowedActions: [] },
  })),
  withViewerAsync(hr.closeAttendanceMonth, async (viewer, request) => {
    if (!runsHr(viewer.role)) return { problem: 'FORBIDDEN' };
    if (!steppedUp(request)) return { problem: 'STEP_UP_REQUIRED' };
    const body = await bodyOf(request);
    // October is already closed; November is the open month.
    return body['month'] === '2026-11' ? { empty: true } : { problem: 'INVALID_STATE' };
  }),

  /* Leave */
  serveList(hr.listLeaveTypes, LEAVE_TYPE_LIST),
  serveList(hr.listLeaveBalances, (viewer) => leaveBalancesFor(viewer.role)),
  serveList(hr.listLeaveRequests, leaves),
  serveOne(hr.getLeaveRequest, leaves),
  withViewerAsync(hr.createLeaveRequest, async (viewer, request) => {
    const self = selfOf(viewer);
    if (self === undefined) return { problem: 'FORBIDDEN' };
    const body = await bodyOf(request);
    const type = Object.values(LEAVE_TYPES).find((item) => item.id === body['leaveTypeId']);
    if (type === undefined) return { problem: 'VALIDATION' };
    const draft = leaveRequestsFor('employee', STAFF.arif.id)[0];
    return {
      json: {
        ...draft,
        ...body,
        employee: { id: self.id, name: self.name },
        leaveTypeName: type.name,
        // The server counts working days; the sample answers with a fixed count.
        days: '2',
      },
    };
  }),
  actOn(hr.submitLeaveRequest, leaves, 'submit', (row) => ({
    json: {
      ...row,
      number: 'LV-2627-00120',
      status: 'pending_approval',
      allowedActions: ['cancel'],
    },
  })),
  actOn(hr.cancelLeaveRequest, leaves, 'cancel', (row) => ({
    json: { ...row, status: 'cancelled', allowedActions: [] },
  })),
  serveValue(hr.getLeaveCalendar, () => ({ items: LEAVE_CALENDAR })),
];

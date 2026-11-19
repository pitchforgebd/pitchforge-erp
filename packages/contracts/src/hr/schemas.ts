import { z } from 'zod';

import {
  IsoDate,
  Masked,
  Quantity,
  Reason,
  Timestamp,
  Uuid,
  YearMonth,
} from '../shared/primitives.ts';
import { AuditMeta, PersonRef, allowedActions, restricted } from '../shared/record.ts';

const Name = z.string().trim().min(2).max(120);

export const EmploymentType = z
  .enum(['permanent', 'contract', 'probation', 'intern'])
  .meta({ id: 'EmploymentType' });
export type EmploymentType = z.infer<typeof EmploymentType>;

export const EmployeeStatus = z
  .enum(['active', 'on_notice', 'left'])
  .meta({ id: 'EmployeeStatus' });
export type EmployeeStatus = z.infer<typeof EmployeeStatus>;

export const Employee = z
  .object({
    id: Uuid,
    employeeCode: z.string(),
    userId: Uuid.nullable(),
    name: z.string(),
    workEmail: z.email().nullable(),
    departmentId: Uuid,
    managerId: Uuid.nullable(),
    jobTitle: z.string(),
    grade: z.string().nullable(),
    employmentType: EmploymentType,
    joinedOn: IsoDate,
    probationEndsOn: IsoDate.nullable(),
    contractEndsOn: IsoDate.nullable(),
    leftOn: IsoDate.nullable(),
    status: EmployeeStatus,
    /** Masked except the last 4; HR and the employee only. */
    nid: restricted(Masked, 'nid'),
    tin: restricted(Masked.nullable(), 'tin'),
    bankAccount: restricted(Masked.nullable(), 'bank'),
    allowedActions: allowedActions(['update', 'update_protected', 'offboard']),
    meta: AuditMeta,
  })
  .meta({ id: 'Employee' });
export type Employee = z.infer<typeof Employee>;

export const CreateEmployee = z
  .strictObject({
    employeeCode: z.string().trim().min(1).max(20),
    name: Name,
    workEmail: z.email().max(254).nullable(),
    departmentId: Uuid,
    managerId: Uuid.nullable(),
    jobTitle: Name,
    grade: z.string().trim().max(20).nullable(),
    employmentType: EmploymentType,
    joinedOn: IsoDate,
    probationEndsOn: IsoDate.nullable(),
    contractEndsOn: IsoDate.nullable(),
  })
  .meta({ id: 'CreateEmployee' });
export type CreateEmployee = z.infer<typeof CreateEmployee>;

export const UpdateEmployee = CreateEmployee.omit({ employeeCode: true, joinedOn: true })
  .partial()
  .meta({ id: 'UpdateEmployee' });
export type UpdateEmployee = z.infer<typeof UpdateEmployee>;

/** NID, TIN and bank details go in plain over TLS and are encrypted at rest; reads are masked. */
export const UpdateProtectedDetails = z
  .strictObject({
    nid: z.string().trim().min(10).max(17).nullable(),
    tin: z.string().trim().min(10).max(12).nullable(),
    bankAccountNumber: z.string().trim().min(5).max(34).nullable(),
  })
  .partial()
  .meta({ id: 'UpdateProtectedDetails' });
export type UpdateProtectedDetails = z.infer<typeof UpdateProtectedDetails>;

export const EmployeeEventKind = z
  .enum(['joined', 'confirmed', 'promoted', 'transferred', 'resigned', 'terminated', 'left'])
  .meta({ id: 'EmployeeEventKind' });
export type EmployeeEventKind = z.infer<typeof EmployeeEventKind>;

export const EmployeeEvent = z
  .object({
    id: Uuid,
    employeeId: Uuid,
    kind: EmployeeEventKind,
    effectiveOn: IsoDate,
    note: z.string().nullable(),
    recordedBy: PersonRef,
  })
  .meta({ id: 'EmployeeEvent' });
export type EmployeeEvent = z.infer<typeof EmployeeEvent>;

export const CreateEmployeeEvent = z
  .strictObject({
    kind: EmployeeEventKind,
    effectiveOn: IsoDate,
    note: z.string().trim().max(500).nullable(),
  })
  .meta({ id: 'CreateEmployeeEvent' });
export type CreateEmployeeEvent = z.infer<typeof CreateEmployeeEvent>;

export const ClearanceItem = z
  .object({ key: z.string(), label: z.string(), done: z.boolean(), doneBy: PersonRef.nullable() })
  .meta({ id: 'ClearanceItem' });
export type ClearanceItem = z.infer<typeof ClearanceItem>;

/** Assets, access and dues to clear before someone leaves (HR-06). */
export const Offboarding = z
  .object({
    employeeId: Uuid,
    lastWorkingDay: IsoDate,
    items: z.array(ClearanceItem),
    finalSettlementId: Uuid.nullable(),
  })
  .meta({ id: 'Offboarding' });
export type Offboarding = z.infer<typeof Offboarding>;

export const StartOffboarding = z
  .strictObject({ lastWorkingDay: IsoDate, reason: Reason })
  .meta({ id: 'StartOffboarding' });
export type StartOffboarding = z.infer<typeof StartOffboarding>;

export const UpdateClearanceItem = z
  .strictObject({ key: z.string().min(1).max(60), done: z.boolean() })
  .meta({ id: 'UpdateClearanceItem' });
export type UpdateClearanceItem = z.infer<typeof UpdateClearanceItem>;

/* Attendance ---------------------------------------------------------------------------------- */

export const Shift = z
  .object({
    id: Uuid,
    name: z.string(),
    startsAt: z.string().regex(/^[0-2][0-9]:[0-5][0-9]$/),
    endsAt: z.string().regex(/^[0-2][0-9]:[0-5][0-9]$/),
    weekendDays: z.array(z.enum(['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'])),
    /** Minutes after the start before someone counts as late (HR-11). */
    lateAfterMinutes: z.number().int().min(0).max(240),
    earlyLeaveMinutes: z.number().int().min(0).max(240),
    meta: AuditMeta,
  })
  .meta({ id: 'Shift' });
export type Shift = z.infer<typeof Shift>;

export const CreateShift = z
  .strictObject({
    name: Name,
    startsAt: z.string().regex(/^[0-2][0-9]:[0-5][0-9]$/),
    endsAt: z.string().regex(/^[0-2][0-9]:[0-5][0-9]$/),
    weekendDays: z.array(z.enum(['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'])).max(3),
    lateAfterMinutes: z.number().int().min(0).max(240),
    earlyLeaveMinutes: z.number().int().min(0).max(240),
  })
  .meta({ id: 'CreateShift' });
export type CreateShift = z.infer<typeof CreateShift>;

export const UpdateShift = CreateShift.partial().meta({ id: 'UpdateShift' });
export type UpdateShift = z.infer<typeof UpdateShift>;

export const AttendanceRecord = z
  .object({
    id: Uuid,
    employee: PersonRef,
    date: IsoDate,
    checkInAt: Timestamp.nullable(),
    checkOutAt: Timestamp.nullable(),
    source: z.enum(['web', 'biometric', 'regularised']),
    /** Worked out by the server from the shift rules. */
    status: z.enum(['present', 'late', 'early_leave', 'absent', 'leave', 'holiday', 'weekend']),
  })
  .meta({ id: 'AttendanceRecord' });
export type AttendanceRecord = z.infer<typeof AttendanceRecord>;

/** Location is optional, and only ever sent when the user allows it (HR-09). */
export const CheckIn = z
  .strictObject({
    kind: z.enum(['in', 'out']),
    location: z.strictObject({ latitude: z.string(), longitude: z.string() }).nullable(),
  })
  .meta({ id: 'CheckIn' });
export type CheckIn = z.infer<typeof CheckIn>;

export const RegularisationStatus = z
  .enum(['draft', 'pending_approval', 'approved', 'rejected'])
  .meta({ id: 'RegularisationStatus' });
export type RegularisationStatus = z.infer<typeof RegularisationStatus>;

export const AttendanceRegularisation = z
  .object({
    id: Uuid,
    employee: PersonRef,
    date: IsoDate,
    checkInAt: Timestamp.nullable(),
    checkOutAt: Timestamp.nullable(),
    reason: z.string(),
    status: RegularisationStatus,
    approvalId: Uuid.nullable(),
    allowedActions: allowedActions(['submit']),
    meta: AuditMeta,
  })
  .meta({ id: 'AttendanceRegularisation' });
export type AttendanceRegularisation = z.infer<typeof AttendanceRegularisation>;

export const CreateRegularisation = z
  .strictObject({
    date: IsoDate,
    checkInAt: Timestamp.nullable(),
    checkOutAt: Timestamp.nullable(),
    reason: Reason,
  })
  .meta({ id: 'CreateRegularisation' });
export type CreateRegularisation = z.infer<typeof CreateRegularisation>;

export const CloseAttendanceMonth = z
  .strictObject({ month: YearMonth })
  .meta({ id: 'CloseAttendanceMonth' });
export type CloseAttendanceMonth = z.infer<typeof CloseAttendanceMonth>;

/* Leave --------------------------------------------------------------------------------------- */

export const LeaveType = z
  .object({
    id: Uuid,
    name: z.string(),
    daysPerYear: Quantity,
    carryForwardDays: Quantity,
    encashable: z.boolean(),
    validFrom: IsoDate,
    validTo: IsoDate.nullable(),
    meta: AuditMeta,
  })
  .meta({ id: 'LeaveType' });
export type LeaveType = z.infer<typeof LeaveType>;

/** Effective-dated rules, never code (R7). A change adds a version. */
export const CreateLeaveTypeVersion = z
  .strictObject({
    name: Name,
    daysPerYear: Quantity,
    carryForwardDays: Quantity,
    encashable: z.boolean(),
    validFrom: IsoDate,
  })
  .meta({ id: 'CreateLeaveTypeVersion' });
export type CreateLeaveTypeVersion = z.infer<typeof CreateLeaveTypeVersion>;

/** Accrued, used and available days, calculated by the server. */
export const LeaveBalance = z
  .object({
    employeeId: Uuid,
    leaveTypeId: Uuid,
    leaveTypeName: z.string(),
    accrued: Quantity,
    used: Quantity,
    available: Quantity,
  })
  .meta({ id: 'LeaveBalance' });
export type LeaveBalance = z.infer<typeof LeaveBalance>;

export const LeaveRequestStatus = z
  .enum(['draft', 'pending_approval', 'approved', 'rejected', 'cancelled'])
  .meta({ id: 'LeaveRequestStatus' });
export type LeaveRequestStatus = z.infer<typeof LeaveRequestStatus>;

export const LeaveRequest = z
  .object({
    id: Uuid,
    number: z.string().nullable(),
    employee: PersonRef,
    leaveTypeId: Uuid,
    leaveTypeName: z.string(),
    from: IsoDate,
    to: IsoDate,
    days: Quantity,
    reason: z.string().nullable(),
    status: LeaveRequestStatus,
    approvalId: Uuid.nullable(),
    allowedActions: allowedActions(['submit', 'cancel']),
    meta: AuditMeta,
  })
  .meta({ id: 'LeaveRequest' });
export type LeaveRequest = z.infer<typeof LeaveRequest>;

export const CreateLeaveRequest = z
  .strictObject({
    leaveTypeId: Uuid,
    from: IsoDate,
    to: IsoDate,
    reason: z.string().trim().max(300).nullable(),
  })
  .meta({ id: 'CreateLeaveRequest' });
export type CreateLeaveRequest = z.infer<typeof CreateLeaveRequest>;

/** Who is away, with no leave type or reason, so it is safe for a team to see (HR-17). */
export const LeaveCalendarEntry = z
  .object({ employee: PersonRef, from: IsoDate, to: IsoDate })
  .meta({ id: 'LeaveCalendarEntry' });
export type LeaveCalendarEntry = z.infer<typeof LeaveCalendarEntry>;

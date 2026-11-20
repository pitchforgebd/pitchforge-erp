'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import {
  CreateEmployee,
  CreateEmployeeEvent,
  CreateFinalSettlement,
  CreateLeaveTypeVersion,
  CreateRegularisation,
  CreateSalaryLoan,
  CreateSalaryStructureVersion,
  CreateShift,
  EmployeeEventKind,
  EmploymentType,
  UpdateEmployee,
  UpdateProtectedDetails,
  UpdateShift,
  coreEndpoints as core,
  hrEndpoints as hr,
  payrollEndpoints as pay,
} from '@pitchforge/contracts';
import type { Employee, Shift } from '@pitchforge/contracts';

import { browserCall } from '../../lib/api/browser.ts';
import { DialogButton, FormDialog } from '../common/form-dialog.tsx';
import type { FormSpec } from '../common/form-dialog.tsx';
import { useList } from '../common/use-list.ts';

const TODAY = '2026-11-20';
const WEEKDAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

/** Drop the fields left empty, so an edit keeps what is stored instead of clearing it. */
const withoutEmpty = (body: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(body).filter(([, value]) => value !== null));

function useEmployeeOptions() {
  const employees = useList(hr.listEmployees, {});
  return employees.items.map((employee) => ({ value: employee.id, label: employee.name }));
}

/* Employees --------------------------------------------------------------------------------- */

function useEmployeeFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const types = useTranslations('hr.employmentType');
  const units = useList(core.listOrgUnits, { type: 'department' });
  const people = useEmployeeOptions();
  return [
    { name: 'employeeCode', label: t('fields.employeeCode'), kind: 'text', required: true },
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    { name: 'workEmail', label: t('fields.email'), kind: 'text', nullable: true },
    {
      name: 'departmentId',
      label: t('fields.department'),
      kind: 'select',
      required: true,
      options: units.items.map((unit) => ({ value: unit.id, label: unit.name })),
    },
    {
      name: 'managerId',
      label: t('fields.reportsTo'),
      kind: 'select',
      nullable: true,
      options: people,
    },
    { name: 'jobTitle', label: t('fields.jobTitle'), kind: 'text', required: true },
    { name: 'grade', label: t('fields.grade'), kind: 'text', nullable: true },
    {
      name: 'employmentType',
      label: t('fields.employmentType'),
      kind: 'select',
      required: true,
      options: EmploymentType.options.map((value) => ({ value, label: types(value) })),
    },
    { name: 'joinedOn', label: t('fields.joinedOn'), kind: 'date', required: true },
    { name: 'probationEndsOn', label: t('fields.probationEnds'), kind: 'date', nullable: true },
    { name: 'contractEndsOn', label: t('fields.contractEnds'), kind: 'date', nullable: true },
  ];
}

export function NewEmployeeButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useEmployeeFields();
  return (
    <DialogButton label={t('newEmployee')}>
      {(close) => (
        <FormDialog
          title={t('newEmployee')}
          description={t('newEmployeeHint')}
          submitLabel={t('save')}
          schema={CreateEmployee}
          fields={fields}
          initial={{ employmentType: 'probation', joinedOn: TODAY }}
          submit={(body) => browserCall(hr.createEmployee, { body })}
          success={t('saved')}
          invalidate={[hr.listEmployees.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EmployeeActions({ employee }: { readonly employee: Employee }): ReactNode {
  const t = useTranslations('forms');
  const events = useTranslations('hr.events');
  const fields = useEmployeeFields().filter(
    (field) => field.name !== 'employeeCode' && field.name !== 'joinedOn',
  );
  const ifMatch = `"${String(employee.meta.version)}"`;
  return (
    <span className="flex flex-wrap gap-2">
      {employee.allowedActions.includes('update') && (
        <DialogButton
          label={t('edit')}
          ariaLabel={t('editLabel', { name: employee.name })}
          variant="secondary"
        >
          {(close) => (
            <FormDialog
              title={t('editLabel', { name: employee.name })}
              submitLabel={t('save')}
              schema={UpdateEmployee}
              fields={fields}
              initial={{
                name: employee.name,
                workEmail: employee.workEmail ?? '',
                departmentId: employee.departmentId,
                managerId: employee.managerId ?? '',
                jobTitle: employee.jobTitle,
                grade: employee.grade ?? '',
                employmentType: employee.employmentType,
                probationEndsOn: employee.probationEndsOn ?? '',
                contractEndsOn: employee.contractEndsOn ?? '',
              }}
              submit={(body) =>
                browserCall(hr.updateEmployee, { params: { id: employee.id }, body, ifMatch })
              }
              success={t('saved')}
              invalidate={[hr.listEmployees.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
      {employee.allowedActions.includes('update_protected') && (
        <DialogButton label={t('protectedDetails')} variant="secondary">
          {(close) => (
            <FormDialog
              title={t('protectedDetailsOf', { name: employee.name })}
              description={t('protectedHint')}
              submitLabel={t('save')}
              schema={UpdateProtectedDetails}
              fields={[
                { name: 'nid', label: t('fields.nid'), kind: 'text', nullable: true },
                { name: 'tin', label: t('fields.tin'), kind: 'text', nullable: true },
                {
                  name: 'bankAccountNumber',
                  label: t('fields.accountNumber'),
                  kind: 'text',
                  nullable: true,
                },
              ]}
              transform={withoutEmpty}
              note={t('stepUpNote')}
              submit={(body) =>
                browserCall(hr.updateProtectedDetails, {
                  params: { id: employee.id },
                  body,
                  ifMatch,
                })
              }
              success={t('saved')}
              invalidate={[hr.listEmployees.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
      {employee.allowedActions.includes('update') && (
        <DialogButton label={t('addEvent')} variant="secondary">
          {(close) => (
            <FormDialog
              title={t('addEventFor', { name: employee.name })}
              submitLabel={t('save')}
              schema={CreateEmployeeEvent}
              fields={[
                {
                  name: 'kind',
                  label: t('fields.kind'),
                  kind: 'select',
                  required: true,
                  options: EmployeeEventKind.options.map((value) => ({
                    value,
                    label: events(value),
                  })),
                },
                {
                  name: 'effectiveOn',
                  label: t('fields.effectiveOn'),
                  kind: 'date',
                  required: true,
                },
                { name: 'note', label: t('fields.note'), kind: 'textarea', nullable: true },
              ]}
              initial={{ effectiveOn: TODAY }}
              submit={(body) =>
                browserCall(hr.addEmployeeEvent, { params: { id: employee.id }, body })
              }
              success={t('saved')}
              invalidate={[hr.listEmployeeEvents.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
    </span>
  );
}

/* Attendance -------------------------------------------------------------------------------- */

export function NewCorrectionButton(): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('newCorrection')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newCorrection')}
          description={t('newCorrectionHint')}
          submitLabel={t('saveDraft')}
          schema={CreateRegularisation}
          fields={[
            { name: 'date', label: t('fields.date'), kind: 'date', required: true },
            {
              name: 'checkInAt',
              label: t('fields.checkIn'),
              kind: 'datetime',
              nullable: true,
              hint: t('dhakaTime'),
            },
            { name: 'checkOutAt', label: t('fields.checkOut'), kind: 'datetime', nullable: true },
            { name: 'reason', label: t('fields.reason'), kind: 'textarea', required: true },
          ]}
          submit={(body) => browserCall(hr.createRegularisation, { body })}
          success={t('saved')}
          invalidate={[hr.listRegularisations.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

function useShiftFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const days = useTranslations('forms.weekdays');
  return [
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    { name: 'startsAt', label: t('fields.startsAt'), kind: 'text', required: true, hint: 'HH:MM' },
    { name: 'endsAt', label: t('fields.endsAt'), kind: 'text', required: true, hint: 'HH:MM' },
    {
      name: 'weekendDays',
      label: t('fields.weekend'),
      kind: 'lines',
      addLabel: t('addDay'),
      minRows: 0,
      fields: [
        {
          name: 'day',
          label: t('fields.day'),
          kind: 'select',
          options: WEEKDAYS.map((value) => ({ value, label: days(value) })),
        },
      ],
    },
    { name: 'lateAfterMinutes', label: t('fields.lateAfter'), kind: 'integer', required: true },
    { name: 'earlyLeaveMinutes', label: t('fields.earlyLeave'), kind: 'integer', required: true },
  ];
}

const dayList = (body: Record<string, unknown>) => ({
  ...body,
  weekendDays: (body['weekendDays'] as readonly { day: string }[]).map((row) => row.day),
});

export function NewShiftButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useShiftFields();
  return (
    <DialogButton label={t('newShift')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newShift')}
          submitLabel={t('save')}
          schema={CreateShift}
          fields={fields}
          initial={{
            startsAt: '09:00',
            endsAt: '18:00',
            weekendDays: [{ day: 'fri' }, { day: 'sat' }],
            lateAfterMinutes: '15',
            earlyLeaveMinutes: '30',
          }}
          transform={dayList}
          submit={(body) => browserCall(hr.createShift, { body })}
          success={t('saved')}
          invalidate={[hr.listShifts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditShiftButton({ shift }: { readonly shift: Shift }): ReactNode {
  const t = useTranslations('forms');
  const fields = useShiftFields();
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: shift.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: shift.name })}
          submitLabel={t('save')}
          schema={UpdateShift}
          fields={fields}
          initial={{
            name: shift.name,
            startsAt: shift.startsAt,
            endsAt: shift.endsAt,
            weekendDays: shift.weekendDays.map((day) => ({ day })),
            lateAfterMinutes: String(shift.lateAfterMinutes),
            earlyLeaveMinutes: String(shift.earlyLeaveMinutes),
          }}
          transform={dayList}
          submit={(body) =>
            browserCall(hr.updateShift, {
              params: { id: shift.id },
              body,
              ifMatch: `"${String(shift.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[hr.listShifts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewLeaveTypeButton(): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('newLeaveType')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newLeaveType')}
          description={t('versionHint')}
          submitLabel={t('save')}
          schema={CreateLeaveTypeVersion}
          fields={[
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            {
              name: 'daysPerYear',
              label: t('fields.daysPerYear'),
              kind: 'decimal',
              required: true,
            },
            {
              name: 'carryForwardDays',
              label: t('fields.carryForward'),
              kind: 'decimal',
              required: true,
            },
            { name: 'encashable', label: t('fields.encashable'), kind: 'checkbox' },
            { name: 'validFrom', label: t('fields.validFrom'), kind: 'date', required: true },
          ]}
          initial={{ carryForwardDays: '0', validFrom: '2027-01-01' }}
          submit={(body) => browserCall(hr.createLeaveTypeVersion, { body })}
          success={t('saved')}
          invalidate={[hr.listLeaveTypes.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Payroll ----------------------------------------------------------------------------------- */

export function NewSalaryStructureButton(): ReactNode {
  const t = useTranslations('forms');
  const people = useEmployeeOptions();
  return (
    <DialogButton label={t('newStructure')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newStructure')}
          description={t('versionHint')}
          submitLabel={t('save')}
          schema={CreateSalaryStructureVersion}
          fields={[
            {
              name: 'employeeId',
              label: t('fields.employee'),
              kind: 'select',
              nullable: true,
              options: people,
            },
            {
              name: 'grade',
              label: t('fields.grade'),
              kind: 'text',
              nullable: true,
              hint: t('gradeHint'),
            },
            { name: 'basicSalary', label: t('fields.basicSalary'), kind: 'money', required: true },
            {
              name: 'allowances',
              label: t('fields.allowances'),
              kind: 'lines',
              addLabel: t('addAllowance'),
              minRows: 0,
              fields: [
                { name: 'name', label: t('fields.name'), kind: 'text' },
                { name: 'amount', label: t('fields.amount'), kind: 'money' },
              ],
            },
            { name: 'validFrom', label: t('fields.validFrom'), kind: 'date', required: true },
          ]}
          initial={{ validFrom: '2026-12-01', allowances: [] }}
          note={t('stepUpNote')}
          submit={(body) => browserCall(pay.createSalaryStructureVersion, { body })}
          success={t('saved')}
          invalidate={[pay.listSalaryStructures.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewLoanButton(): ReactNode {
  const t = useTranslations('forms');
  const kinds = useTranslations('payroll.loanKinds');
  const people = useEmployeeOptions();
  return (
    <DialogButton label={t('newLoan')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newLoan')}
          submitLabel={t('saveDraft')}
          schema={CreateSalaryLoan}
          fields={[
            {
              name: 'employeeId',
              label: t('fields.employee'),
              kind: 'select',
              required: true,
              options: people,
            },
            {
              name: 'kind',
              label: t('fields.kind'),
              kind: 'select',
              required: true,
              options: (['advance', 'loan'] as const).map((value) => ({
                value,
                label: kinds(value),
              })),
            },
            { name: 'principal', label: t('fields.principal'), kind: 'money', required: true },
            {
              name: 'monthlyDeduction',
              label: t('fields.monthlyDeduction'),
              kind: 'money',
              required: true,
            },
          ]}
          initial={{ kind: 'advance' }}
          submit={(body) => browserCall(pay.createSalaryLoan, { body })}
          success={t('saved')}
          invalidate={[pay.listSalaryLoans.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewSettlementButton(): ReactNode {
  const t = useTranslations('forms');
  const employees = useList(hr.listEmployees, { status: 'on_notice' });
  return (
    <DialogButton label={t('newSettlement')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newSettlement')}
          description={t('newSettlementHint')}
          submitLabel={t('calculate')}
          schema={CreateFinalSettlement}
          fields={[
            {
              name: 'employeeId',
              label: t('fields.employee'),
              kind: 'select',
              required: true,
              options: employees.items.map((employee) => ({
                value: employee.id,
                label: employee.name,
              })),
            },
            {
              name: 'lastWorkingDay',
              label: t('fields.lastWorkingDay'),
              kind: 'date',
              required: true,
            },
          ]}
          note={t('settlementByServer')}
          submit={(body) => browserCall(pay.createFinalSettlement, { body })}
          success={t('settlementReady')}
          invalidate={[pay.listFinalSettlements.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

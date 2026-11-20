'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { hrEndpoints as hr } from '@pitchforge/contracts';
import type { AttendanceRegularisation, Employee, Offboarding } from '@pitchforge/contracts';
import {
  Button,
  Callout,
  Checkbox,
  DateInput,
  DateText,
  Dialog,
  Field,
  Input,
  StatusPill,
  Tag,
  Textarea,
} from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { RecordFiles } from '../common/files.tsx';
import { Card } from '../common/page-header.tsx';
import { Details, RecordTable } from '../common/record-table.tsx';
import { useSession } from '../common/session.tsx';
import { QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';

import {
  EditShiftButton,
  EmployeeActions,
  NewCorrectionButton,
  NewEmployeeButton,
  NewLeaveTypeButton,
  NewShiftButton,
} from './forms.tsx';
import { FlowStatusPill, MonthText } from './status.tsx';

const EMPLOYEE_TONE = new Map<Employee['status'], Tone>([
  ['active', 'good'],
  ['on_notice', 'warn'],
  ['left', 'neutral'],
]);

function ClearanceList({ employeeId }: { readonly employeeId: string }): ReactNode {
  const t = useTranslations('hr');
  const message = useErrorMessage();
  const offboarding = useQuery({
    queryKey: [hr.getOffboarding.id, employeeId],
    queryFn: () => browserCall(hr.getOffboarding, { params: { id: employeeId } }),
  });
  const tick = useCommand(
    ({ key, done }: { key: string; done: boolean }) =>
      browserCall(hr.updateClearanceItem, { params: { id: employeeId }, body: { key, done } }),
    { success: t('clearanceSaved') },
  );
  const shown: Offboarding | undefined = tick.data ?? offboarding.data;
  return (
    <QueryView query={offboarding}>
      {() =>
        shown === undefined ? null : (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              {t('clearance', { date: shown.lastWorkingDay })}
            </p>
            {tick.isError && <Callout tone="crit" title={message(tick.error)} />}
            <ul className="flex flex-col gap-2 text-sm">
              {shown.items.map((item) => (
                <li key={item.key}>
                  <Checkbox
                    label={item.label}
                    checked={item.done}
                    onCheckedChange={(checked) => {
                      tick.mutate({ key: item.key, done: checked === true });
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      }
    </QueryView>
  );
}

function OffboardForm({
  employee,
  onDone,
}: {
  readonly employee: Employee;
  readonly onDone: () => void;
}): ReactNode {
  const t = useTranslations('hr');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const [lastWorkingDay, setLastWorkingDay] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const start = useCommand(
    () =>
      browserCall(hr.startOffboarding, {
        params: { id: employee.id },
        body: { lastWorkingDay: lastWorkingDay ?? '', reason: reason.trim() },
        ifMatch: `"${String(employee.meta.version)}"`,
      }),
    { success: t('offboardingStarted'), invalidate: [hr.listEmployees.id], onSuccess: onDone },
  );
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      {start.isError && <Callout tone="crit" title={message(start.error)} />}
      <Field label={t('lastWorkingDay')} required requiredLabel={common('required')}>
        {(control) => (
          <DateInput
            {...control}
            value={lastWorkingDay}
            onChange={setLastWorkingDay}
            placeholder={t('chooseDate')}
          />
        )}
      </Field>
      <Field label={t('reason')} required requiredLabel={common('required')}>
        {(control) => (
          <Textarea
            {...control}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
          />
        )}
      </Field>
      <div className="flex justify-end">
        <Button
          variant="danger"
          loading={start.isPending}
          disabled={lastWorkingDay === null || reason.trim().length < 3}
          onClick={() => {
            start.mutate(undefined);
          }}
        >
          {t('startOffboarding')}
        </Button>
      </div>
    </div>
  );
}

function EmployeeDialog({
  employee,
  onClose,
}: {
  readonly employee: Employee;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('hr');
  const common = useTranslations('common');
  const type = useTranslations('hr.employmentType');
  const events = useQuery({
    queryKey: [hr.listEmployeeEvents.id, employee.id],
    queryFn: () => browserCall(hr.listEmployeeEvents, { params: { id: employee.id } }),
  });
  const [offboarding, setOffboarding] = useState(false);
  const hidden = <span className="text-muted">{t('hidden')}</span>;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={employee.name}
      description={`${employee.employeeCode} · ${employee.jobTitle}`}
      closeLabel={common('close')}
    >
      <div className="flex flex-col gap-4">
        <EmployeeActions employee={employee} />
        <Details
          items={[
            [t('type'), type(employee.employmentType)],
            [t('joined'), <DateText key="j" value={employee.joinedOn} />],
            [t('grade'), employee.grade ?? '—'],
            [t('email'), employee.workEmail ?? '—'],
            [t('nid'), employee.nid ?? hidden],
            [t('tin'), employee.tin === undefined ? hidden : (employee.tin ?? '—')],
            [
              t('bankAccount'),
              employee.bankAccount === undefined ? hidden : (employee.bankAccount ?? '—'),
            ],
          ]}
        />
        <QueryView query={events}>
          {(data) =>
            data.items.length === 0 ? null : (
              <div>
                <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                  {t('history')}
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {data.items.map((item) => (
                    <li key={item.id} className="flex flex-wrap gap-2">
                      <DateText value={item.effectiveOn} />
                      <Tag>{t(`events.${item.kind}`)}</Tag>
                      {item.note !== null && <span className="text-muted">{item.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
        </QueryView>
        {employee.status === 'on_notice' && <ClearanceList employeeId={employee.id} />}
        {employee.allowedActions.includes('offboard') &&
          (offboarding ? (
            <OffboardForm employee={employee} onDone={onClose} />
          ) : (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setOffboarding(true);
                }}
              >
                {t('startOffboarding')}
              </Button>
            </div>
          ))}
        <RecordFiles
          record={{ recordType: 'employee', recordId: employee.id }}
          canAttach={employee.allowedActions.includes('update')}
        />
      </div>
    </Dialog>
  );
}

export function EmployeesTab(): ReactNode {
  const t = useTranslations('hr');
  // Partners run HR, payroll and purchasing in the sample company.
  const manages = useSession().permissions.includes('admin.read');
  const status = useTranslations('hr.employeeStatus');
  const [q, setQ] = useState('');
  const employees = useList(hr.listEmployees, q.trim() === '' ? {} : { q: q.trim() });
  const [open, setOpen] = useState<Employee | null>(null);
  return (
    <>
      <RecordTable
        label={t('employees')}
        list={employees}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Field label={t('search')}>
              {(control) => (
                <Input
                  {...control}
                  value={q}
                  onChange={(event) => {
                    setQ(event.target.value);
                  }}
                />
              )}
            </Field>
            {manages && <NewEmployeeButton />}
          </div>
        }
        columns={[
          { id: 'code', header: t('code'), cell: (row) => <Tag>{row.employeeCode}</Tag> },
          {
            id: 'name',
            header: t('name'),
            cell: (row) => (
              <button
                type="button"
                className="text-left text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.name}
              </button>
            ),
          },
          { id: 'title', header: t('jobTitle'), cell: (row) => row.jobTitle },
          { id: 'joined', header: t('joined'), cell: (row) => <DateText value={row.joinedOn} /> },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => (
              <StatusPill tone={EMPLOYEE_TONE.get(row.status) ?? 'neutral'}>
                {status(row.status)}
              </StatusPill>
            ),
          },
        ]}
      />
      {open !== null && (
        <EmployeeDialog
          employee={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

export function AttendanceTab(): ReactNode {
  const t = useTranslations('hr');
  // Partners run HR, payroll and purchasing in the sample company.
  const manages = useSession().permissions.includes('admin.read');
  const day = useTranslations('hr.dayStatus');
  const message = useErrorMessage();
  const records = useList(hr.listAttendance, {});
  const regularisations = useList(hr.listRegularisations, {});
  const shifts = useList(hr.listShifts, {});
  const submit = useCommand(
    (row: AttendanceRegularisation) =>
      browserCall(hr.submitRegularisation, {
        params: { id: row.id },
        ifMatch: `"${String(row.meta.version)}"`,
      }),
    { success: t('correctionSubmitted'), invalidate: [hr.listRegularisations.id] },
  );
  const close = useCommand(
    () => browserCall(hr.closeAttendanceMonth, { body: { month: '2026-11' } }),
    { success: t('monthClosed') },
  );
  return (
    <div className="flex flex-col gap-4">
      {(submit.isError || close.isError) && (
        <Callout tone="crit" title={message(submit.error ?? close.error)} />
      )}
      <RecordTable
        label={t('attendance')}
        list={records}
        getRowId={(row) => row.id}
        toolbar={<p className="text-xs text-muted">{t('attendanceHint')}</p>}
        columns={[
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
          { id: 'employee', header: t('employee'), cell: (row) => row.employee.name },
          {
            id: 'in',
            header: t('in'),
            cell: (row) => (row.checkInAt === null ? '—' : <TimeText value={row.checkInAt} />),
          },
          {
            id: 'out',
            header: t('out'),
            cell: (row) => (row.checkOutAt === null ? '—' : <TimeText value={row.checkOutAt} />),
          },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => (
              <StatusPill
                tone={row.status === 'present' ? 'good' : row.status === 'absent' ? 'crit' : 'warn'}
              >
                {day(row.status)}
              </StatusPill>
            ),
          },
        ]}
      />
      <RecordTable
        label={t('corrections')}
        list={regularisations}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">{t('corrections')}</p>
            <NewCorrectionButton />
          </div>
        }
        columns={[
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
          { id: 'employee', header: t('employee'), cell: (row) => row.employee.name },
          { id: 'reason', header: t('reason'), cell: (row) => row.reason },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => <FlowStatusPill status={row.status} />,
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) =>
              row.allowedActions.includes('submit') ? (
                <Button
                  size="sm"
                  aria-label={t('submitCorrectionLabel', { date: row.date })}
                  onClick={() => {
                    submit.mutate(row);
                  }}
                >
                  {t('submit')}
                </Button>
              ) : null,
          },
        ]}
      />
      <Card
        title={t('shifts')}
        description={t('shiftsHint')}
        {...(manages && { actions: <NewShiftButton /> })}
      >
        <ul className="flex flex-col gap-2 text-sm">
          {shifts.items.map((shift) => (
            <li key={shift.id} className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">{shift.name}</span>
              <span className="text-muted">
                {t('shiftLine', {
                  start: shift.startsAt,
                  end: shift.endsAt,
                  late: shift.lateAfterMinutes,
                })}
              </span>
              {manages && <EditShiftButton shift={shift} />}
            </li>
          ))}
        </ul>
      </Card>
      <Card title={t('closeMonth')} description={t('closeMonthHint')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthText month="2026-11" />
          <Button
            variant="secondary"
            loading={close.isPending}
            onClick={() => {
              close.mutate(undefined);
            }}
          >
            {t('closeMonth')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function LeaveAdminTab(): ReactNode {
  const t = useTranslations('hr');
  // Partners run HR, payroll and purchasing in the sample company.
  const manages = useSession().permissions.includes('admin.read');
  const balances = useList(hr.listLeaveBalances, {});
  const people = useList(hr.listEmployees, {});
  const nameOf = new Map(people.items.map((person) => [person.id, person.name]));
  const types = useList(hr.listLeaveTypes, {});
  const calendar = useQuery({
    queryKey: [hr.getLeaveCalendar.id, '2026-11-01', '2026-12-31'],
    queryFn: () =>
      browserCall(hr.getLeaveCalendar, { query: { from: '2026-11-01', to: '2026-12-31' } }),
  });
  return (
    <div className="flex flex-col gap-4">
      <Card title={t('whoIsAway')} description={t('whoIsAwayHint')}>
        <QueryView query={calendar}>
          {(data) =>
            data.items.length === 0 ? (
              <p className="text-sm text-muted">{t('nobodyAway')}</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {data.items.map((entry) => (
                  <li key={`${entry.employee.id}-${entry.from}`} className="flex flex-wrap gap-2">
                    <span className="font-medium">{entry.employee.name}</span>
                    <span className="text-muted">
                      <DateText value={entry.from} /> – <DateText value={entry.to} />
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryView>
      </Card>
      <RecordTable
        label={t('balances')}
        list={balances}
        getRowId={(row) => `${row.employeeId}-${row.leaveTypeId}`}
        toolbar={<p className="text-sm font-semibold">{t('balances')}</p>}
        columns={[
          {
            id: 'employee',
            header: t('employee'),
            cell: (row) => nameOf.get(row.employeeId) ?? '—',
          },
          { id: 'type', header: t('leaveType'), cell: (row) => row.leaveTypeName },
          { id: 'accrued', header: t('accrued'), align: 'right', cell: (row) => row.accrued },
          { id: 'used', header: t('used'), align: 'right', cell: (row) => row.used },
          { id: 'available', header: t('available'), align: 'right', cell: (row) => row.available },
        ]}
      />
      <RecordTable
        label={t('leaveTypes')}
        list={types}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">{t('leaveTypes')}</p>
            {manages && <NewLeaveTypeButton />}
          </div>
        }
        columns={[
          { id: 'name', header: t('leaveType'), cell: (row) => row.name },
          { id: 'days', header: t('daysPerYear'), align: 'right', cell: (row) => row.daysPerYear },
          {
            id: 'carry',
            header: t('carryForward'),
            align: 'right',
            cell: (row) => row.carryForwardDays,
          },
          {
            id: 'encash',
            header: t('encashable'),
            cell: (row) => (row.encashable ? t('yes') : t('no')),
          },
          { id: 'from', header: t('validFrom'), cell: (row) => <DateText value={row.validFrom} /> },
        ]}
      />
    </div>
  );
}

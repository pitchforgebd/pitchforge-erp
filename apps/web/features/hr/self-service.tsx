'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { hrEndpoints as hr, payrollEndpoints as pay } from '@pitchforge/contracts';
import type { LeaveRequest, Payslip } from '@pitchforge/contracts';
import {
  Button,
  Callout,
  DateInput,
  DateText,
  Dialog,
  Field,
  Input,
  KpiTile,
  Money,
  Select,
  Textarea,
} from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { currentFiscalYear } from '../common/dates.ts';
import { useErrorMessage } from '../common/errors.ts';
import { PdfButton } from '../common/files.tsx';
import { moneyFromInput } from '../common/money-input.ts';
import { Card } from '../common/page-header.tsx';
import { Details, RecordTable } from '../common/record-table.tsx';
import { useSession } from '../common/session.tsx';
import { QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';
import { ClaimsTab } from '../finance/bank.tsx';

import { LeaveStatusPill, MonthText } from './status.tsx';

function CheckInCard(): ReactNode {
  const t = useTranslations('hr');
  const message = useErrorMessage();
  const check = useCommand(
    (kind: 'in' | 'out') => browserCall(hr.checkIn, { body: { kind, location: null } }),
    { success: t('checkedIn'), invalidate: [hr.listAttendance.id] },
  );
  return (
    <Card title={t('today')} description={t('checkInHint')}>
      <div className="flex flex-col gap-3">
        {check.isError && <Callout tone="crit" title={message(check.error)} />}
        {check.data !== undefined && (
          <p className="text-sm">
            {t('checkedInAt')} <TimeText value={check.data.checkInAt ?? ''} />
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            loading={check.isPending}
            onClick={() => {
              check.mutate('in');
            }}
          >
            {t('checkIn')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              check.mutate('out');
            }}
          >
            {t('checkOut')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function LeaveDialog({ onClose }: { readonly onClose: () => void }): ReactNode {
  const t = useTranslations('hr');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const types = useList(hr.listLeaveTypes, {});
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const create = useCommand(
    () =>
      browserCall(hr.createLeaveRequest, {
        body: {
          leaveTypeId,
          from: from ?? '',
          to: to ?? '',
          reason: reason.trim() === '' ? null : reason.trim(),
        },
      }),
    { success: t('leaveDrafted'), invalidate: [hr.listLeaveRequests.id], onSuccess: onClose },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('newLeave')}
      description={t('newLeaveHint')}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            loading={create.isPending}
            disabled={leaveTypeId === '' || from === null || to === null}
            onClick={() => {
              create.mutate(undefined);
            }}
          >
            {t('saveDraft')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {create.isError && <Callout tone="crit" title={message(create.error)} />}
        <Field label={t('leaveType')} required requiredLabel={common('required')}>
          {(control) => (
            <Select
              {...control}
              value={leaveTypeId}
              placeholder={t('choose')}
              options={types.items.map((type) => ({ value: type.id, label: type.name }))}
              onChange={(event) => {
                setLeaveTypeId(event.target.value);
              }}
            />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('from')} required requiredLabel={common('required')}>
            {(control) => (
              <DateInput
                {...control}
                value={from}
                onChange={setFrom}
                placeholder={t('chooseDate')}
              />
            )}
          </Field>
          <Field label={t('to')} required requiredLabel={common('required')}>
            {(control) => (
              <DateInput {...control} value={to} onChange={setTo} placeholder={t('chooseDate')} />
            )}
          </Field>
        </div>
        <Field label={t('reason')}>
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
        <p className="text-xs text-muted">{t('daysByServer')}</p>
      </div>
    </Dialog>
  );
}

/** Leave requests with submit and cancel, for one person or a whole team. */
export function LeaveRequestsTable({ label }: { readonly label: string }): ReactNode {
  const t = useTranslations('hr');
  const message = useErrorMessage();
  const requests = useList(hr.listLeaveRequests, {});
  const submit = useCommand(
    (request: LeaveRequest) =>
      browserCall(hr.submitLeaveRequest, {
        params: { id: request.id },
        ifMatch: `"${String(request.meta.version)}"`,
      }),
    { success: t('leaveSubmitted'), invalidate: [hr.listLeaveRequests.id] },
  );
  const cancel = useCommand(
    (request: LeaveRequest) =>
      browserCall(hr.cancelLeaveRequest, {
        params: { id: request.id },
        ifMatch: `"${String(request.meta.version)}"`,
      }),
    { success: t('leaveCancelled'), invalidate: [hr.listLeaveRequests.id] },
  );
  return (
    <div className="flex flex-col gap-3">
      {(submit.isError || cancel.isError) && (
        <Callout tone="crit" title={message(submit.error ?? cancel.error)} />
      )}
      <RecordTable
        label={label}
        list={requests}
        getRowId={(row) => row.id}
        columns={[
          { id: 'number', header: t('request'), cell: (row) => row.number ?? t('draft') },
          { id: 'employee', header: t('employee'), cell: (row) => row.employee.name },
          { id: 'type', header: t('leaveType'), cell: (row) => row.leaveTypeName },
          {
            id: 'dates',
            header: t('dates'),
            cell: (row) => (
              <span>
                <DateText value={row.from} /> – <DateText value={row.to} />
              </span>
            ),
          },
          { id: 'days', header: t('days'), align: 'right', cell: (row) => row.days },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => <LeaveStatusPill status={row.status} />,
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) => (
              <span className="flex justify-end gap-2">
                {row.allowedActions.includes('submit') && (
                  <Button
                    size="sm"
                    aria-label={t('submitLabel', { dates: `${row.from} – ${row.to}` })}
                    onClick={() => {
                      submit.mutate(row);
                    }}
                  >
                    {t('submit')}
                  </Button>
                )}
                {row.allowedActions.includes('cancel') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={t('cancelLabel', { dates: `${row.from} – ${row.to}` })}
                    onClick={() => {
                      cancel.mutate(row);
                    }}
                  >
                    {t('cancel')}
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

function PayslipDialog({
  payslip,
  onClose,
}: {
  readonly payslip: Payslip;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('hr');
  const common = useTranslations('common');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('payslipOf', { name: payslip.employee.name })}
      description={payslip.month}
      closeLabel={common('close')}
    >
      {payslip.lines === undefined ? (
        <Callout tone="info" title={t('payHidden')} />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1 text-sm">
            {payslip.lines.map((line) => (
              <li key={`${line.kind}-${line.label}`} className="flex justify-between gap-3">
                <span className={line.kind === 'deduction' ? 'text-muted' : ''}>
                  {line.kind === 'deduction' ? `− ${line.label}` : line.label}
                </span>
                <Money value={line.amount} />
              </li>
            ))}
          </ul>
          <Details
            items={[
              [
                t('gross'),
                payslip.grossPay === undefined ? '—' : <Money key="g" value={payslip.grossPay} />,
              ],
              [
                t('net'),
                payslip.netPay === undefined ? '—' : <Money key="n" value={payslip.netPay} />,
              ],
            ]}
          />
          <span>
            <PdfButton
              template="payslip"
              record={{ recordType: 'payslip', recordId: payslip.id }}
            />
          </span>
        </div>
      )}
    </Dialog>
  );
}

/** Payslips: an employee's own, or everyone's for payroll. */
export function PayslipsTable(): ReactNode {
  const t = useTranslations('hr');
  const payslips = useList(pay.listPayslips, {});
  const [open, setOpen] = useState<Payslip | null>(null);
  return (
    <>
      <RecordTable
        label={t('payslips')}
        list={payslips}
        getRowId={(row) => row.id}
        columns={[
          { id: 'month', header: t('month'), cell: (row) => <MonthText month={row.month} /> },
          { id: 'employee', header: t('employee'), cell: (row) => row.employee.name },
          {
            id: 'net',
            header: t('net'),
            align: 'right',
            cell: (row) =>
              row.netPay === undefined ? (
                <span className="text-muted">{t('hidden')}</span>
              ) : (
                <Money value={row.netPay} />
              ),
          },
          {
            id: 'open',
            header: '',
            align: 'right',
            cell: (row) => (
              <Button
                size="sm"
                variant="secondary"
                aria-label={t('openPayslip', { name: row.employee.name, month: row.month })}
                onClick={() => {
                  setOpen(row);
                }}
              >
                {t('open')}
              </Button>
            ),
          },
        ]}
      />
      {open !== null && (
        <PayslipDialog
          payslip={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

function TaxDeclarationCard(): ReactNode {
  // The current fiscal year (July–June), as the server names it: "2627".
  const fiscalYear = currentFiscalYear().code;
  const t = useTranslations('hr');
  const message = useErrorMessage();
  const declaration = useQuery({
    queryKey: [pay.getMyTaxDeclaration.id, fiscalYear],
    queryFn: () => browserCall(pay.getMyTaxDeclaration, { query: { fiscalYearCode: fiscalYear } }),
  });
  const [investments, setInvestments] = useState('');
  const declare = useCommand(
    () =>
      browserCall(pay.submitTaxDeclaration, {
        body: {
          fiscalYearCode: fiscalYear,
          investments: moneyFromInput(investments) ?? { amount: '', currency: 'BDT' },
        },
      }),
    { success: t('declared') },
  );
  const shown = declare.data ?? declaration.data;
  return (
    <Card title={t('taxDeclaration')} description={t('taxDeclarationHint')}>
      <QueryView query={declaration}>
        {() =>
          shown === undefined ? null : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiTile
                  label={t('projectedTax')}
                  value={
                    shown.projectedAnnualTax === undefined ? (
                      '—'
                    ) : (
                      <Money value={shown.projectedAnnualTax} />
                    )
                  }
                />
                <KpiTile
                  label={t('monthlyTds')}
                  value={shown.monthlyTds === undefined ? '—' : <Money value={shown.monthlyTds} />}
                />
                <KpiTile
                  label={t('investments')}
                  value={
                    shown.investments === undefined ? '—' : <Money value={shown.investments} />
                  }
                />
              </div>
              {declare.isError && <Callout tone="crit" title={message(declare.error)} />}
              <div className="flex flex-wrap items-end gap-3">
                <Field label={t('declareInvestments')}>
                  {(control) => (
                    <Input
                      {...control}
                      inputMode="decimal"
                      value={investments}
                      onChange={(event) => {
                        setInvestments(event.target.value);
                      }}
                    />
                  )}
                </Field>
                <Button
                  loading={declare.isPending}
                  disabled={moneyFromInput(investments) === null}
                  onClick={() => {
                    declare.mutate(undefined);
                  }}
                >
                  {t('declare')}
                </Button>
              </div>
              <p className="text-xs text-muted">{t('tdsByServer')}</p>
            </div>
          )
        }
      </QueryView>
    </Card>
  );
}

export function SelfServiceTab(): ReactNode {
  const t = useTranslations('hr');
  const session = useSession();
  const balances = useList(hr.listLeaveBalances, { employeeId: session.userId });
  const [drafting, setDrafting] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <CheckInCard />
      <Card title={t('myLeave')} description={t('myLeaveHint')}>
        <div className="flex flex-col gap-4">
          {balances.items.length === 0 ? (
            <p className="text-sm text-muted">{t('noBalances')}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {balances.items.map((balance) => (
                <KpiTile
                  key={balance.leaveTypeId}
                  label={balance.leaveTypeName}
                  value={t('daysLeft', { days: balance.available })}
                  hint={t('usedOf', { used: balance.used, accrued: balance.accrued })}
                />
              ))}
            </div>
          )}
          <div>
            <Button
              onClick={() => {
                setDrafting(true);
              }}
            >
              {t('newLeave')}
            </Button>
          </div>
        </div>
      </Card>
      <LeaveRequestsTable label={t('myRequests')} />
      <ClaimsTab />
      <PayslipsTable />
      <TaxDeclarationCard />
      {drafting && (
        <LeaveDialog
          onClose={() => {
            setDrafting(false);
          }}
        />
      )}
    </div>
  );
}

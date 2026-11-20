'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { payrollEndpoints as pay } from '@pitchforge/contracts';
import type { FinalSettlement, PayrollRun, SalaryLoan } from '@pitchforge/contracts';
import {
  Button,
  Callout,
  DataTable,
  DateText,
  Dialog,
  Field,
  KpiTile,
  Money,
  Select,
  Steps,
} from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { Details, RecordTable } from '../common/record-table.tsx';
import { QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';

import { FlowStatusPill, MonthText } from './status.tsx';

const MONTHS = ['2026-11', '2026-12'] as const;

/** Step 1 of the run wizard: what to run. The server checks attendance and calculates. */
function StartRunDialog({ onClose }: { readonly onClose: () => void }): ReactNode {
  const t = useTranslations('payroll');
  const common = useTranslations('common');
  const stepState = useTranslations('approvals.stepState');
  const message = useErrorMessage();
  const [kind, setKind] = useState<'monthly' | 'festival_bonus'>('festival_bonus');
  const [month, setMonth] = useState<string>(MONTHS[0]);
  const start = useCommand(() => browserCall(pay.startPayrollRun, { body: { kind, month } }), {
    invalidate: [pay.listPayrollRuns.id],
  });
  const started = start.data;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('startRun')}
      description={t('startRunHint')}
      closeLabel={common('close')}
      footer={
        started === undefined ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              {common('cancel')}
            </Button>
            <Button
              loading={start.isPending}
              onClick={() => {
                start.mutate(undefined);
              }}
            >
              {t('calculate')}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>{common('close')}</Button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <Steps
          label={t('wizardSteps')}
          stateLabels={{
            done: stepState('done'),
            current: stepState('current'),
            waiting: stepState('waiting'),
            rejected: stepState('rejected'),
          }}
          steps={[
            {
              id: 'choose',
              label: t('stepChoose'),
              state: started === undefined ? 'current' : 'done',
            },
            {
              id: 'calculate',
              label: t('stepCalculate'),
              state: started === undefined ? 'waiting' : 'current',
            },
            { id: 'review', label: t('stepReview'), state: 'waiting' },
            { id: 'approve', label: t('stepApprove'), state: 'waiting' },
          ]}
        />
        {start.isError && <Callout tone="crit" title={message(start.error)} />}
        {started === undefined ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('kind')} required requiredLabel={common('required')}>
              {(control) => (
                <Select
                  {...control}
                  value={kind}
                  options={[
                    { value: 'monthly', label: t('kinds.monthly') },
                    { value: 'festival_bonus', label: t('kinds.festival_bonus') },
                  ]}
                  onChange={(event) => {
                    setKind(event.target.value === 'monthly' ? 'monthly' : 'festival_bonus');
                  }}
                />
              )}
            </Field>
            <Field label={t('month')} required requiredLabel={common('required')}>
              {(control) => (
                <Select
                  {...control}
                  value={month}
                  options={MONTHS.map((value) => ({ value, label: value }))}
                  onChange={(event) => {
                    setMonth(event.target.value);
                  }}
                />
              )}
            </Field>
          </div>
        ) : (
          <Callout tone="info" title={t('calculating')}>
            {t('calculatingHint')}
          </Callout>
        )}
      </div>
    </Dialog>
  );
}

function RunDialog({
  run,
  onClose,
}: {
  readonly run: PayrollRun;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('payroll');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const sheet = useQuery({
    queryKey: [pay.getSalarySheet.id, run.id],
    queryFn: () => browserCall(pay.getSalarySheet, { params: { id: run.id } }),
  });
  const ifMatch = `"${String(run.meta.version)}"`;
  const submit = useCommand(
    () => browserCall(pay.submitPayrollRun, { params: { id: run.id }, ifMatch }),
    {
      success: t('runSubmitted'),
      invalidate: [pay.listPayrollRuns.id],
      onSuccess: onClose,
    },
  );
  const lock = useCommand(
    () => browserCall(pay.lockPayrollRun, { params: { id: run.id }, ifMatch }),
    {
      success: t('runLocked'),
      invalidate: [pay.listPayrollRuns.id],
      onSuccess: onClose,
    },
  );
  const bankFile = useCommand(() => browserCall(pay.exportBankFile, { params: { id: run.id } }), {
    success: t('bankFileQueued'),
  });
  const failed = submit.error ?? lock.error ?? bankFile.error;
  const hidden = <span className="text-muted">{t('hidden')}</span>;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={run.number ?? t('newRun')}
      description={t(`kinds.${run.kind}`)}
      closeLabel={common('close')}
      footer={
        <>
          {run.allowedActions.includes('export_bank_file') && (
            <Button
              variant="secondary"
              loading={bankFile.isPending}
              onClick={() => {
                bankFile.mutate(undefined);
              }}
            >
              {t('bankFile')}
            </Button>
          )}
          {run.allowedActions.includes('submit') && (
            <Button
              loading={submit.isPending}
              onClick={() => {
                submit.mutate(undefined);
              }}
            >
              {t('submit')}
            </Button>
          )}
          {run.allowedActions.includes('lock') && (
            <Button
              loading={lock.isPending}
              onClick={() => {
                lock.mutate(undefined);
              }}
            >
              {t('lockAndPost')}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {failed !== null && <Callout tone="crit" title={message(failed)} />}
        <div className="grid gap-3 sm:grid-cols-4">
          <KpiTile label={t('gross')} value={<Money value={run.gross} />} />
          <KpiTile label={t('tax')} value={<Money value={run.tax} />} />
          <KpiTile label={t('providentFund')} value={<Money value={run.providentFund} />} />
          <KpiTile label={t('net')} value={<Money value={run.net} />} />
        </div>
        {run.journalEntryNo !== null && (
          <p className="text-sm">{t('postedAs', { number: run.journalEntryNo })}</p>
        )}
        <QueryView query={sheet}>
          {(data) => (
            <DataTable
              label={t('salarySheet')}
              rows={data.items}
              getRowId={(row) => row.employee.id}
              loadingState={null}
              errorState={null}
              emptyState={null}
              columns={[
                { id: 'employee', header: t('employee'), cell: (row) => row.employee.name },
                {
                  id: 'days',
                  header: t('daysWorked'),
                  align: 'right',
                  cell: (row) => row.daysWorked,
                },
                {
                  id: 'overtime',
                  header: t('overtime'),
                  align: 'right',
                  cell: (row) =>
                    row.overtimePay === undefined ? hidden : <Money value={row.overtimePay} />,
                },
                {
                  id: 'gross',
                  header: t('gross'),
                  align: 'right',
                  cell: (row) =>
                    row.grossPay === undefined ? hidden : <Money value={row.grossPay} />,
                },
                {
                  id: 'tax',
                  header: t('tax'),
                  align: 'right',
                  cell: (row) =>
                    row.taxDeducted === undefined ? hidden : <Money value={row.taxDeducted} />,
                },
                {
                  id: 'net',
                  header: t('net'),
                  align: 'right',
                  cell: (row) => (row.netPay === undefined ? hidden : <Money value={row.netPay} />),
                },
              ]}
            />
          )}
        </QueryView>
        <p className="text-xs text-muted">{t('sheetByServer')}</p>
      </div>
    </Dialog>
  );
}

export function PayrollRunsTab(): ReactNode {
  const t = useTranslations('payroll');
  const runs = useList(pay.listPayrollRuns, {});
  const structures = useList(pay.listSalaryStructures, {});
  const [open, setOpen] = useState<PayrollRun | null>(null);
  const [starting, setStarting] = useState(false);
  const canStart = runs.items.some((run) => run.allowedActions.length > 0);
  return (
    <div className="flex flex-col gap-4">
      <RecordTable
        label={t('runs')}
        list={runs}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{t('runsHint')}</p>
            {canStart && (
              <Button
                onClick={() => {
                  setStarting(true);
                }}
              >
                {t('startRun')}
              </Button>
            )}
          </div>
        }
        columns={[
          {
            id: 'number',
            header: t('run'),
            cell: (row) => (
              <button
                type="button"
                className="text-left font-mono text-[13px] text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.number ?? t('newRun')}
              </button>
            ),
          },
          { id: 'month', header: t('month'), cell: (row) => <MonthText month={row.month} /> },
          { id: 'heads', header: t('headcount'), align: 'right', cell: (row) => row.headcount },
          {
            id: 'gross',
            header: t('gross'),
            align: 'right',
            cell: (row) => <Money value={row.gross} />,
          },
          { id: 'net', header: t('net'), align: 'right', cell: (row) => <Money value={row.net} /> },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => <FlowStatusPill status={row.status} />,
          },
        ]}
      />
      <RecordTable
        label={t('structures')}
        list={structures}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('structures')}</p>}
        columns={[
          {
            id: 'employee',
            header: t('employee'),
            cell: (row) => row.employee?.name ?? row.grade ?? '—',
          },
          { id: 'grade', header: t('grade'), cell: (row) => row.grade ?? '—' },
          {
            id: 'basic',
            header: t('basic'),
            align: 'right',
            cell: (row) =>
              row.basicSalary === undefined ? (
                <span className="text-muted">{t('hidden')}</span>
              ) : (
                <Money value={row.basicSalary} />
              ),
          },
          {
            id: 'gross',
            header: t('gross'),
            align: 'right',
            cell: (row) =>
              row.grossSalary === undefined ? (
                <span className="text-muted">{t('hidden')}</span>
              ) : (
                <Money value={row.grossSalary} />
              ),
          },
          { id: 'from', header: t('validFrom'), cell: (row) => <DateText value={row.validFrom} /> },
        ]}
      />
      {open !== null && (
        <RunDialog
          run={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
      {starting && (
        <StartRunDialog
          onClose={() => {
            setStarting(false);
          }}
        />
      )}
    </div>
  );
}

function SettlementDialog({
  settlement,
  onClose,
}: {
  readonly settlement: FinalSettlement;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('payroll');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const submit = useCommand(
    () =>
      browserCall(pay.submitFinalSettlement, {
        params: { id: settlement.id },
        ifMatch: `"${String(settlement.meta.version)}"`,
      }),
    {
      success: t('settlementSubmitted'),
      invalidate: [pay.listFinalSettlements.id],
      onSuccess: onClose,
    },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('settlementOf', { name: settlement.employee.name })}
      description={t('lastDay', { date: settlement.lastWorkingDay })}
      closeLabel={common('close')}
      footer={
        settlement.allowedActions.includes('submit') ? (
          <Button
            loading={submit.isPending}
            onClick={() => {
              submit.mutate(undefined);
            }}
          >
            {t('submit')}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {submit.isError && <Callout tone="crit" title={message(submit.error)} />}
        {settlement.lines === undefined ? (
          <Callout tone="info" title={t('payHidden')} />
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {settlement.lines.map((line) => (
              <li key={line.label} className="flex justify-between gap-3">
                <span className={line.kind === 'deduction' ? 'text-muted' : ''}>
                  {line.kind === 'deduction' ? `− ${line.label}` : line.label}
                </span>
                <Money value={line.amount} />
              </li>
            ))}
          </ul>
        )}
        <Details
          items={[
            [
              t('net'),
              settlement.netPay === undefined ? '—' : <Money key="n" value={settlement.netPay} />,
            ],
            [t('status'), <FlowStatusPill key="s" status={settlement.status} />],
            [t('journal'), settlement.journalEntryNo ?? '—'],
          ]}
        />
        <p className="text-xs text-muted">{t('settlementByServer')}</p>
      </div>
    </Dialog>
  );
}

export function LoansAndSettlementsTab(): ReactNode {
  const t = useTranslations('payroll');
  const kinds = useTranslations('payroll.loanKinds');
  const message = useErrorMessage();
  const loans = useList(pay.listSalaryLoans, {});
  const settlements = useList(pay.listFinalSettlements, {});
  const certificates = useList(pay.listTaxCertificates, {});
  const [open, setOpen] = useState<FinalSettlement | null>(null);
  const submitLoan = useCommand(
    (loan: SalaryLoan) =>
      browserCall(pay.submitSalaryLoan, {
        params: { id: loan.id },
        ifMatch: `"${String(loan.meta.version)}"`,
      }),
    { success: t('loanSubmitted'), invalidate: [pay.listSalaryLoans.id] },
  );
  const money = (value: { amount: string; currency: string } | undefined) =>
    value === undefined ? (
      <span className="text-muted">{t('hidden')}</span>
    ) : (
      <Money value={value} />
    );
  return (
    <div className="flex flex-col gap-4">
      {submitLoan.isError && <Callout tone="crit" title={message(submitLoan.error)} />}
      <RecordTable
        label={t('loans')}
        list={loans}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('loans')}</p>}
        columns={[
          { id: 'employee', header: t('employee'), cell: (row) => row.employee.name },
          { id: 'kind', header: t('kind'), cell: (row) => kinds(row.kind) },
          {
            id: 'principal',
            header: t('principal'),
            align: 'right',
            cell: (row) => money(row.principal),
          },
          {
            id: 'monthly',
            header: t('monthly'),
            align: 'right',
            cell: (row) => money(row.monthlyDeduction),
          },
          {
            id: 'outstanding',
            header: t('outstanding'),
            align: 'right',
            cell: (row) => money(row.outstanding),
          },
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
                  aria-label={t('submitLoanLabel', { name: row.employee.name })}
                  onClick={() => {
                    submitLoan.mutate(row);
                  }}
                >
                  {t('submit')}
                </Button>
              ) : null,
          },
        ]}
      />
      <RecordTable
        label={t('settlements')}
        list={settlements}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('settlements')}</p>}
        columns={[
          {
            id: 'employee',
            header: t('employee'),
            cell: (row) => (
              <button
                type="button"
                className="text-left text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.employee.name}
              </button>
            ),
          },
          {
            id: 'last',
            header: t('lastWorkingDay'),
            cell: (row) => <DateText value={row.lastWorkingDay} />,
          },
          { id: 'net', header: t('net'), align: 'right', cell: (row) => money(row.netPay) },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => <FlowStatusPill status={row.status} />,
          },
        ]}
      />
      <RecordTable
        label={t('certificates')}
        list={certificates}
        getRowId={(row) => row.id}
        toolbar={<p className="text-xs text-muted">{t('certificatesHint')}</p>}
        columns={[
          { id: 'employee', header: t('employee'), cell: (row) => row.employee.name },
          {
            id: 'year',
            header: t('fiscalYearLabel'),
            cell: (row) => t('fiscalYear', { code: row.fiscalYearCode }),
          },
        ]}
      />
      {open !== null && (
        <SettlementDialog
          settlement={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}

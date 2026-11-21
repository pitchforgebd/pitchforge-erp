'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  ReportId,
  coreEndpoints as core,
  reportingEndpoints as reporting,
} from '@pitchforge/contracts';
import type { FinancialStatement, ReportTable } from '@pitchforge/contracts';
import {
  Button,
  Callout,
  Checkbox,
  DataTable,
  DateText,
  Dialog,
  Field,
  Money,
  Select,
  Tabs,
} from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { currentFiscalYear, lastClosedMonthEnd, monthStart, yearBefore } from '../common/dates.ts';
import { useErrorMessage } from '../common/errors.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { RecordTable } from '../common/record-table.tsx';
import { useCanRead, useSession } from '../common/session.tsx';
import { ForbiddenState, QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';

/** The year so far: the current fiscal year up to the last closed month. */
const yearSoFar = () => ({ from: currentFiscalYear().start, to: lastClosedMonthEnd() });

function LedgerDialog({
  accountId,
  label,
  onClose,
}: {
  readonly accountId: string;
  readonly label: string;
  readonly onClose: () => void;
}): ReactNode {
  const { to } = yearSoFar();
  const t = useTranslations('reports');
  const common = useTranslations('common');
  const ledger = useQuery({
    queryKey: [reporting.getAccountLedger.id, accountId],
    queryFn: () =>
      browserCall(reporting.getAccountLedger, { query: { accountId, from: monthStart(to), to } }),
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={label}
      description={t('ledgerFor', { from: monthStart(to), to })}
      closeLabel={common('close')}
    >
      <QueryView query={ledger}>
        {(data) => (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {t('opening')} <Money value={data.opening} />
            </p>
            {data.rows.length === 0 ? (
              <p className="text-muted">{t('noLines')}</p>
            ) : (
              <DataTable
                label={t('ledgerLines')}
                rows={data.rows}
                getRowId={(row) => `${row.entryNo}-${row.description}`}
                loadingState={null}
                errorState={null}
                emptyState={null}
                columns={[
                  { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
                  {
                    id: 'entry',
                    header: t('entry'),
                    cell: (row) => <span className="font-mono text-[13px]">{row.entryNo}</span>,
                  },
                  { id: 'description', header: t('description'), cell: (row) => row.description },
                  {
                    id: 'debit',
                    header: t('debit'),
                    align: 'right',
                    cell: (row) => <Money value={row.debit} />,
                  },
                  {
                    id: 'credit',
                    header: t('credit'),
                    align: 'right',
                    cell: (row) => <Money value={row.credit} />,
                  },
                  {
                    id: 'balance',
                    header: t('balance'),
                    align: 'right',
                    cell: (row) => <Money value={row.balance} />,
                  },
                ]}
              />
            )}
            <p>
              {t('closing')} <Money value={data.closing} />
            </p>
          </div>
        )}
      </QueryView>
    </Dialog>
  );
}

function Statement({
  statement,
  resultLabel,
}: {
  readonly statement: FinancialStatement;
  readonly resultLabel: string;
}): ReactNode {
  const t = useTranslations('reports');
  const [open, setOpen] = useState<{ id: string; label: string } | null>(null);
  const compared = statement.sections.some((section) =>
    section.rows.some((row) => row.comparative !== null),
  );
  return (
    <Card
      title={statement.title}
      description={
        statement.from === null
          ? t('asAt', { date: statement.to })
          : t('period', { from: statement.from, to: statement.to })
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        {statement.sections.map((section) => (
          <section key={section.title} aria-label={section.title}>
            <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
              {section.title}
            </h3>
            <ul className="flex flex-col gap-1">
              {section.rows.map((row) => (
                <li key={row.label} className="flex flex-wrap justify-between gap-3">
                  {row.accountId === null ? (
                    <span>{row.label}</span>
                  ) : (
                    <button
                      type="button"
                      className="text-left text-accent underline-offset-2 hover:underline"
                      onClick={() => {
                        setOpen({ id: row.accountId ?? '', label: row.label });
                      }}
                    >
                      {row.label}
                    </button>
                  )}
                  <span className="flex gap-4">
                    {compared && (
                      <span className="text-muted">
                        {row.comparative === null ? '—' : <Money value={row.comparative} />}
                      </span>
                    )}
                    <Money value={row.amount} />
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-line pt-1 font-semibold">
                <span>{t('totalOf', { title: section.title })}</span>
                <Money value={section.total} />
              </li>
            </ul>
          </section>
        ))}
        <p className="flex justify-between gap-3 rounded-control bg-surface-2 p-2 font-semibold">
          <span>{resultLabel}</span>
          <Money value={statement.result} />
        </p>
        <p className="text-xs text-muted">
          {t('generated')} <TimeText value={statement.generatedAt} />
        </p>
      </div>
      {open !== null && (
        <LedgerDialog
          accountId={open.id}
          label={open.label}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </Card>
  );
}

function StatementsTab(): ReactNode {
  const { from, to } = yearSoFar();
  const t = useTranslations('reports');
  const [compare, setCompare] = useState(false);
  const pl = useQuery({
    queryKey: [reporting.getProfitAndLoss.id, compare],
    queryFn: () =>
      browserCall(reporting.getProfitAndLoss, {
        query: compare
          ? { from, to, compareFrom: yearBefore(from), compareTo: yearBefore(to) }
          : { from, to },
      }),
  });
  const bs = useQuery({
    queryKey: [reporting.getBalanceSheet.id],
    queryFn: () => browserCall(reporting.getBalanceSheet, { query: { asOf: to } }),
  });
  const cf = useQuery({
    queryKey: [reporting.getCashFlow.id],
    queryFn: () => browserCall(reporting.getCashFlow, { query: { from, to } }),
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">{t('statementsHint')}</p>
        <Checkbox
          label={t('compare')}
          checked={compare}
          onCheckedChange={(checked) => {
            setCompare(checked === true);
          }}
        />
      </div>
      <QueryView query={pl}>
        {(data) => <Statement statement={data} resultLabel={t('profit')} />}
      </QueryView>
      <QueryView query={bs}>
        {(data) => <Statement statement={data} resultLabel={t('difference')} />}
      </QueryView>
      <QueryView query={cf}>
        {(data) => <Statement statement={data} resultLabel={t('netChange')} />}
      </QueryView>
    </div>
  );
}

function TrialBalanceTab(): ReactNode {
  const { to } = yearSoFar();
  const t = useTranslations('reports');
  const tb = useQuery({
    queryKey: [reporting.getTrialBalance.id],
    queryFn: () => browserCall(reporting.getTrialBalance, { query: { asOf: to } }),
  });
  const [open, setOpen] = useState<{ id: string; label: string } | null>(null);
  return (
    <QueryView query={tb}>
      {(data) => (
        <Card title={t('trialBalance')} description={t('asAt', { date: data.asOf })}>
          <DataTable
            label={t('trialBalance')}
            rows={data.rows}
            getRowId={(row) => row.accountId}
            loadingState={null}
            errorState={null}
            emptyState={null}
            columns={[
              {
                id: 'code',
                header: t('code'),
                cell: (row) => <span className="font-mono text-[13px]">{row.accountCode}</span>,
              },
              {
                id: 'name',
                header: t('account'),
                cell: (row) => (
                  <button
                    type="button"
                    className="text-left text-accent underline-offset-2 hover:underline"
                    onClick={() => {
                      setOpen({ id: row.accountId, label: row.accountName });
                    }}
                  >
                    {row.accountName}
                  </button>
                ),
              },
              {
                id: 'debit',
                header: t('debit'),
                align: 'right',
                cell: (row) => <Money value={row.debit} />,
              },
              {
                id: 'credit',
                header: t('credit'),
                align: 'right',
                cell: (row) => <Money value={row.credit} />,
              },
            ]}
          />
          <p className="mt-3 flex justify-end gap-6 text-sm font-semibold">
            <span>
              {t('debit')} <Money value={data.totalDebit} />
            </span>
            <span>
              {t('credit')} <Money value={data.totalCredit} />
            </span>
          </p>
          {open !== null && (
            <LedgerDialog
              accountId={open.id}
              label={open.label}
              onClose={() => {
                setOpen(null);
              }}
            />
          )}
        </Card>
      )}
    </QueryView>
  );
}

type ReportValue = ReportTable['rows'][number][string] | undefined;

function ReportCell({
  value,
  kind,
}: {
  readonly value: ReportValue;
  readonly kind: string;
}): ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value !== 'string') return <Money value={value} />;
  return kind === 'date' ? <DateText value={value} /> : value;
}

function ReportsTab(): ReactNode {
  const t = useTranslations('reports');
  const names = useTranslations('reports.names');
  const message = useErrorMessage();
  const [report, setReport] = useState<ReportId>('budget_vs_actual');
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');
  const table = useQuery({
    queryKey: [reporting.getReport.id, report],
    queryFn: () => browserCall(reporting.getReport, { params: { report }, query: {} }),
  });
  const exportReport = useCommand(
    () =>
      browserCall(core.startExport, {
        body: { listId: `reporting.${report}`, format, filters: {} },
      }),
    { success: t('exportQueued') },
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('report')}>
          {(control) => (
            <Select
              {...control}
              value={report}
              options={ReportId.options.map((value) => ({ value, label: names(value) }))}
              onChange={(event) => {
                setReport(ReportId.parse(event.target.value));
              }}
            />
          )}
        </Field>
        <Field label={t('format')}>
          {(control) => (
            <Select
              {...control}
              value={format}
              options={[
                { value: 'xlsx', label: 'Excel' },
                { value: 'csv', label: 'CSV' },
                { value: 'pdf', label: 'PDF' },
              ]}
              onChange={(event) => {
                const value = event.target.value;
                setFormat(value === 'csv' || value === 'pdf' ? value : 'xlsx');
              }}
            />
          )}
        </Field>
        <Button
          variant="secondary"
          loading={exportReport.isPending}
          onClick={() => {
            exportReport.mutate(undefined);
          }}
        >
          {t('export')}
        </Button>
      </div>
      {exportReport.isError && <Callout tone="crit" title={message(exportReport.error)} />}
      <QueryView query={table}>
        {(data) => (
          <Card title={data.title} description={t('columnsByServer')}>
            <DataTable
              label={data.title}
              rows={data.rows.map((cells, index) => ({
                index: String(index),
                cells: new Map(Object.entries(cells)),
              }))}
              getRowId={(row) => row.index}
              loadingState={null}
              errorState={null}
              emptyState={null}
              columns={data.columns.map((column) => ({
                id: column.key,
                header: column.label,
                align:
                  column.kind === 'money' || column.kind === 'number'
                    ? ('right' as const)
                    : ('left' as const),
                cell: (row: { readonly cells: ReadonlyMap<string, ReportValue> }) => (
                  <ReportCell value={row.cells.get(column.key)} kind={column.kind} />
                ),
              }))}
            />
          </Card>
        )}
      </QueryView>
    </div>
  );
}

function SchedulesTab(): ReactNode {
  const t = useTranslations('reports');
  const names = useTranslations('reports.names');
  const frequencies = useTranslations('reports.frequency');
  const message = useErrorMessage();
  const session = useSession();
  const schedules = useList(reporting.listReportSchedules, {});
  const users = useList(core.listUsers, {});
  const nameOf = new Map([
    ...users.items.map((user) => [user.id, user.name] as const),
    [session.userId, session.name] as const,
  ]);
  const [report, setReport] = useState<ReportId>('vat_summary');
  const create = useCommand(
    () =>
      browserCall(reporting.createReportSchedule, {
        body: {
          report,
          format: 'pdf',
          frequency: 'monthly',
          // The person scheduling receives it; each email follows their own permissions.
          recipientUserIds: [session.userId],
        },
      }),
    { success: t('scheduled'), invalidate: [reporting.listReportSchedules.id] },
  );
  return (
    <div className="flex flex-col gap-4">
      <RecordTable
        label={t('schedules')}
        list={schedules}
        getRowId={(row) => row.id}
        toolbar={<p className="text-xs text-muted">{t('schedulesHint')}</p>}
        columns={[
          { id: 'report', header: t('report'), cell: (row) => names(row.report) },
          { id: 'format', header: t('format'), cell: (row) => row.format.toUpperCase() },
          {
            id: 'frequency',
            header: t('frequencyLabel'),
            cell: (row) => frequencies(row.frequency),
          },
          {
            id: 'to',
            header: t('recipients'),
            cell: (row) =>
              row.recipientUserIds.map((id) => nameOf.get(id) ?? t('aUser')).join(', '),
          },
          { id: 'next', header: t('nextRun'), cell: (row) => <TimeText value={row.nextRunAt} /> },
        ]}
      />
      <Card title={t('newSchedule')} description={t('newScheduleHint')}>
        <div className="flex flex-col gap-3">
          {create.isError && <Callout tone="crit" title={message(create.error)} />}
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t('report')}>
              {(control) => (
                <Select
                  {...control}
                  value={report}
                  options={ReportId.options.map((value) => ({ value, label: names(value) }))}
                  onChange={(event) => {
                    setReport(ReportId.parse(event.target.value));
                  }}
                />
              )}
            </Field>
            <Button
              loading={create.isPending}
              onClick={() => {
                create.mutate(undefined);
              }}
            >
              {t('scheduleMonthly')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function ReportsPage(): ReactNode {
  const t = useTranslations('reports');
  const allowed = useCanRead('reports');
  if (!allowed) return <ForbiddenState />;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs
        label={t('title')}
        items={[
          { value: 'statements', label: t('statements'), content: <StatementsTab /> },
          { value: 'trial-balance', label: t('trialBalance'), content: <TrialBalanceTab /> },
          { value: 'reports', label: t('reportsTab'), content: <ReportsTab /> },
          { value: 'schedules', label: t('schedules'), content: <SchedulesTab /> },
        ]}
      />
    </>
  );
}

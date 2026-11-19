'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { accountingEndpoints as accounting } from '@pitchforge/contracts';
import type { Payee, PaymentRun } from '@pitchforge/contracts';
import { todayInDhaka } from '@pitchforge/shared-kernel';
import {
  Button,
  Callout,
  Checkbox,
  DataTable,
  DateText,
  Dialog,
  EmptyState,
  Field,
  Money,
  Select,
  StatusPill,
  Tag,
} from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { Card } from '../common/page-header.tsx';
import { Details, RecordTable } from '../common/record-table.tsx';
import { LoadingState, QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';

import { AgeingTable } from './party-tables.tsx';

const RUN_TONE: Readonly<Record<PaymentRun['status'], Tone>> = {
  draft: 'neutral',
  pending_approval: 'info',
  paid: 'good',
  rejected: 'crit',
};

function RunStatus({ status }: { readonly status: PaymentRun['status'] }): ReactNode {
  const t = useTranslations('finance.runStatus');
  // eslint-disable-next-line security/detect-object-injection -- key is the run status union
  return <StatusPill tone={RUN_TONE[status]}>{t(status)}</StatusPill>;
}

function RunDialog({
  run,
  onClose,
}: {
  readonly run: PaymentRun;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('finance');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const submit = useCommand(
    () =>
      browserCall(accounting.submitPaymentRun, {
        params: { id: run.id },
        ifMatch: `"${String(run.meta.version)}"`,
      }),
    { success: t('runSubmitted'), invalidate: [accounting.listPaymentRuns.id], onSuccess: onClose },
  );
  const advice = useCommand(
    () => browserCall(accounting.exportBankAdvice, { params: { id: run.id } }),
    {
      success: t('adviceReady'),
    },
  );
  const error = submit.error ?? advice.error;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={run.number ?? t('draftRun')}
      closeLabel={common('close')}
      footer={
        <>
          {run.allowedActions.includes('export_advice') && (
            <Button
              variant="secondary"
              loading={advice.isPending}
              onClick={() => {
                advice.mutate(undefined);
              }}
            >
              {t('exportAdvice')}
            </Button>
          )}
          {run.allowedActions.includes('submit') && (
            <Button
              loading={submit.isPending}
              onClick={() => {
                submit.mutate(undefined);
              }}
            >
              {t('submitForApproval')}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error !== null && <Callout tone="crit" title={message(error)} />}
        <Callout tone="info" title={t('runSod')} />
        <Details
          items={[
            [t('status'), <RunStatus key="s" status={run.status} />],
            [t('paymentDate'), <DateText key="d" value={run.paymentDate} />],
            [t('preparedBy'), run.preparedBy.name],
            [t('totalPaid'), <Money key="t" value={run.totalNetPaid} />],
            [t('journal'), run.journalEntryNo ?? '—'],
          ]}
        />
        <DataTable
          label={t('runLines')}
          rows={run.lines}
          getRowId={(row) => row.billId}
          loadingState={null}
          errorState={null}
          emptyState={null}
          columns={[
            { id: 'bill', header: t('bill'), cell: (row) => <Tag>{row.billNumber}</Tag> },
            { id: 'payee', header: t('payee'), cell: (row) => row.payeeName },
            {
              id: 'amount',
              header: t('gross'),
              align: 'right',
              cell: (row) => <Money value={row.amount} />,
            },
            {
              id: 'tds',
              header: t('tds'),
              align: 'right',
              cell: (row) => <Money value={row.tds} />,
            },
            {
              id: 'vds',
              header: t('vds'),
              align: 'right',
              cell: (row) => <Money value={row.vds} />,
            },
            {
              id: 'net',
              header: t('netPaid'),
              align: 'right',
              cell: (row) => <Money value={row.netPaid} />,
            },
          ]}
        />
        <p className="text-xs text-muted">{t('withholdingByServer')}</p>
      </div>
    </Dialog>
  );
}

function NewRunDialog({ onClose }: { readonly onClose: () => void }): ReactNode {
  const t = useTranslations('finance');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const bills = useList(accounting.listVendorBills, { status: 'ready_to_pay' });
  const banks = useList(accounting.listBankAccounts, {});
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bankAccountId, setBankAccountId] = useState('');

  const create = useCommand(
    () =>
      browserCall(accounting.createPaymentRun, {
        body: {
          paymentDate: todayInDhaka(),
          bankAccountId,
          // Each bill is paid its balance as the server reported it; nothing is summed here.
          lines: bills.items
            .filter((bill) => selected.has(bill.id))
            .map((bill) => ({ billId: bill.id, amount: bill.balanceDue })),
        },
      }),
    { success: t('runCreated'), invalidate: [accounting.listPaymentRuns.id], onSuccess: onClose },
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('newRun')}
      description={t('newRunDescription')}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            loading={create.isPending}
            disabled={selected.size === 0 || bankAccountId === ''}
            onClick={() => {
              create.mutate(undefined);
            }}
          >
            {t('createRun')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {create.isError && <Callout tone="crit" title={message(create.error)} />}
        <Field label={t('payFrom')} required requiredLabel={common('required')}>
          {(control) => (
            <Select
              {...control}
              value={bankAccountId}
              placeholder={t('chooseBank')}
              options={banks.items.map((bank) => ({ value: bank.id, label: bank.name }))}
              onChange={(event) => {
                setBankAccountId(event.target.value);
              }}
            />
          )}
        </Field>
        {bills.status === 'loading' ? (
          <LoadingState />
        ) : bills.items.length === 0 ? (
          <EmptyState title={t('nothingToPay')} />
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[13px] font-medium">{t('billsToPay')}</legend>
            {bills.items.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between gap-3">
                <Checkbox
                  checked={selected.has(bill.id)}
                  label={`${bill.number ?? ''} · ${bill.vendorName}`}
                  onCheckedChange={(checked) => {
                    setSelected((current) => {
                      const next = new Set(current);
                      if (checked === true) next.add(bill.id);
                      else next.delete(bill.id);
                      return next;
                    });
                  }}
                />
                <Money value={bill.balanceDue} className="text-sm" />
              </div>
            ))}
          </fieldset>
        )}
      </div>
    </Dialog>
  );
}

export function RunsTab(): ReactNode {
  const t = useTranslations('finance');
  const runs = useList(accounting.listPaymentRuns, {});
  const [open, setOpen] = useState<PaymentRun | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <RecordTable
        label={t('runs')}
        list={runs}
        getRowId={(row) => row.id}
        toolbar={
          <>
            <p className="text-xs text-muted">{t('runsHint')}</p>
            <Button
              size="sm"
              onClick={() => {
                setCreating(true);
              }}
            >
              {t('newRun')}
            </Button>
          </>
        }
        columns={[
          {
            id: 'number',
            header: t('run'),
            cell: (row) => (
              <button
                type="button"
                className="font-mono text-[13px] text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.number ?? t('draftRun')}
              </button>
            ),
          },
          {
            id: 'date',
            header: t('paymentDate'),
            cell: (row) => <DateText value={row.paymentDate} />,
          },
          { id: 'bills', header: t('bills'), align: 'right', cell: (row) => row.lines.length },
          {
            id: 'total',
            header: t('totalPaid'),
            align: 'right',
            cell: (row) => <Money value={row.totalNetPaid} />,
          },
          { id: 'status', header: t('status'), cell: (row) => <RunStatus status={row.status} /> },
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
      {creating && (
        <NewRunDialog
          onClose={() => {
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function PayeeDialog({
  payee,
  onClose,
}: {
  readonly payee: Payee;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('finance');
  const common = useTranslations('common');
  const payments = useQuery({
    queryKey: [accounting.listPayeePayments.id, payee.id],
    queryFn: () =>
      browserCall(accounting.listPayeePayments, { params: { id: payee.id }, query: {} }),
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={payee.name}
      description={t('payeeDescription')}
      closeLabel={common('close')}
    >
      <QueryView
        query={payments}
        isEmpty={(data) => data.items.length === 0}
        empty={{ title: t('noPayments') }}
      >
        {(data) => (
          <DataTable
            label={t('payments')}
            rows={data.items}
            getRowId={(row) => row.reference}
            loadingState={null}
            errorState={null}
            emptyState={null}
            columns={[
              { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
              { id: 'ref', header: t('payment'), cell: (row) => <Tag>{row.reference}</Tag> },
              { id: 'doc', header: t('bill'), cell: (row) => row.documentNo ?? '—' },
              {
                id: 'gross',
                header: t('gross'),
                align: 'right',
                cell: (row) => <Money value={row.gross} />,
              },
              {
                id: 'tds',
                header: t('tds'),
                align: 'right',
                cell: (row) => <Money value={row.tds} />,
              },
              {
                id: 'net',
                header: t('netPaid'),
                align: 'right',
                cell: (row) => <Money value={row.netPaid} />,
              },
            ]}
          />
        )}
      </QueryView>
    </Dialog>
  );
}

export function PayeesTab(): ReactNode {
  const t = useTranslations('finance');
  const kinds = useTranslations('finance.payeeKinds');
  const payees = useList(accounting.listPayees, {});
  const [open, setOpen] = useState<Payee | null>(null);
  return (
    <>
      <RecordTable
        label={t('payees')}
        list={payees}
        getRowId={(row) => row.id}
        columns={[
          {
            id: 'name',
            header: t('payee'),
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
          { id: 'kind', header: t('kind'), cell: (row) => kinds(row.kind) },
          {
            id: 'paid',
            header: t('paidThisYear'),
            align: 'right',
            cell: (row) => <Money value={row.paidThisFiscalYear} />,
          },
          {
            id: 'withheld',
            header: t('withheldThisYear'),
            align: 'right',
            cell: (row) => <Money value={row.withheldThisFiscalYear} />,
          },
          {
            id: 'outstanding',
            header: t('outstanding'),
            align: 'right',
            cell: (row) => <Money value={row.outstanding} />,
          },
        ]}
      />
      {open !== null && (
        <PayeeDialog
          payee={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

export function AgeingTab(): ReactNode {
  const t = useTranslations('finance');
  const ageing = useQuery({
    queryKey: [accounting.getPayablesAgeing.id],
    queryFn: () => browserCall(accounting.getPayablesAgeing, { query: {} }),
  });
  return (
    <Card title={t('ageing')} description={t('ageingDescription')}>
      <QueryView query={ageing}>
        {(data) => <AgeingTable report={data} partyLabel={t('vendor')} />}
      </QueryView>
    </Card>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  CreateReceipt,
  accountingEndpoints as accounting,
  billingEndpoints as billing,
} from '@pitchforge/contracts';
import type { CreditNote, Receipt, SalesInvoice } from '@pitchforge/contracts';
import { addDays, todayInDhaka } from '@pitchforge/shared-kernel';
import {
  Button,
  Callout,
  DataTable,
  DateText,
  Dialog,
  Field,
  Input,
  Money,
  Select,
  StatusPill,
  Tabs,
  Tag,
} from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { errorFor, fieldErrors } from '../common/form-errors.ts';
import { moneyFromInput } from '../common/money-input.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { Details, RecordTable } from '../common/record-table.tsx';
import { useCanRead } from '../common/session.tsx';
import { ForbiddenState, QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';
import { AgeingTable, StatementTable } from '../finance/party-tables.tsx';

const INVOICE_TONE: Readonly<Record<SalesInvoice['status'], Tone>> = {
  draft: 'neutral',
  posted: 'info',
  partially_paid: 'warn',
  paid: 'good',
  credited: 'neutral',
};

function InvoiceStatus({ status }: { readonly status: SalesInvoice['status'] }): ReactNode {
  const t = useTranslations('billing.invoiceStatus');
  // eslint-disable-next-line security/detect-object-injection -- key is the invoice status union
  return <StatusPill tone={INVOICE_TONE[status]}>{t(status)}</StatusPill>;
}

function InvoiceDialog({
  invoice,
  onClose,
}: {
  readonly invoice: SalesInvoice;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('billing');
  const common = useTranslations('common');
  const sources = useTranslations('billing.sources');
  const message = useErrorMessage();
  const invalidate = [billing.listInvoices.id];
  const post = useCommand(
    () =>
      browserCall(billing.postInvoice, {
        params: { id: invoice.id },
        ifMatch: `"${String(invoice.meta.version)}"`,
      }),
    {
      success: (result) => t('posted', { number: result.number ?? '' }),
      invalidate,
      onSuccess: onClose,
    },
  );
  const remind = useCommand(
    () => browserCall(billing.sendInvoiceReminder, { params: { id: invoice.id } }),
    {
      success: t('reminderSent'),
    },
  );
  const error = post.error ?? remind.error;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={invoice.number ?? t('draftInvoice')}
      description={invoice.clientName}
      closeLabel={common('close')}
      footer={
        <>
          {invoice.allowedActions.includes('send_reminder') && (
            <Button
              variant="secondary"
              loading={remind.isPending}
              onClick={() => {
                remind.mutate(undefined);
              }}
            >
              {t('sendReminder')}
            </Button>
          )}
          {invoice.allowedActions.includes('post') && (
            <Button
              loading={post.isPending}
              onClick={() => {
                post.mutate(undefined);
              }}
            >
              {t('postAndSend')}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error !== null && <Callout tone="crit" title={message(error)} />}
        <Details
          items={[
            [t('status'), <InvoiceStatus key="s" status={invoice.status} />],
            [t('source'), sources(invoice.source)],
            [t('issued'), <DateText key="i" value={invoice.issueDate} />],
            [t('due'), <DateText key="d" value={invoice.dueDate} />],
            [t('net'), <Money key="n" value={invoice.net} />],
            [t('vat'), <Money key="v" value={invoice.vat} />],
            [t('advanceAdjusted'), <Money key="a" value={invoice.advanceAdjusted} />],
            [t('total'), <Money key="t" value={invoice.total} />],
            [t('balanceDue'), <Money key="b" value={invoice.balanceDue} />],
            [t('journal'), invoice.journalEntryNo ?? '—'],
          ]}
        />
        <DataTable
          label={t('lines')}
          rows={invoice.lines}
          getRowId={(row) => row.description}
          loadingState={null}
          errorState={null}
          emptyState={null}
          columns={[
            { id: 'description', header: t('description'), cell: (row) => row.description },
            { id: 'quantity', header: t('quantity'), align: 'right', cell: (row) => row.quantity },
            {
              id: 'price',
              header: t('unitPrice'),
              align: 'right',
              cell: (row) => <Money value={row.unitPrice} />,
            },
          ]}
        />
        <p className="text-xs text-muted">{t('totalsByServer')}</p>
      </div>
    </Dialog>
  );
}

function InvoicesTab(): ReactNode {
  const t = useTranslations('billing');
  const invoices = useList(billing.listInvoices, {});
  const [open, setOpen] = useState<SalesInvoice | null>(null);
  return (
    <>
      <RecordTable
        label={t('invoices')}
        list={invoices}
        getRowId={(row) => row.id}
        toolbar={<p className="text-xs text-muted">{t('invoicesHint')}</p>}
        columns={[
          {
            id: 'number',
            header: t('invoice'),
            cell: (row) => (
              <button
                type="button"
                className="text-left font-mono text-[13px] text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.number ?? t('draftInvoice')}
              </button>
            ),
          },
          { id: 'client', header: t('client'), cell: (row) => row.clientName },
          {
            id: 'description',
            header: t('description'),
            cell: (row) => row.lines[0]?.description ?? '—',
          },
          {
            id: 'total',
            header: t('total'),
            align: 'right',
            cell: (row) => <Money value={row.total} />,
          },
          {
            id: 'open',
            header: t('balanceDue'),
            align: 'right',
            cell: (row) => <Money value={row.balanceDue} />,
          },
          { id: 'due', header: t('due'), cell: (row) => <DateText value={row.dueDate} /> },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => <InvoiceStatus status={row.status} />,
          },
        ]}
      />
      {open !== null && (
        <InvoiceDialog
          invoice={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

function ReceiptDialog({
  receipt,
  onClose,
}: {
  readonly receipt: Receipt;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('billing');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const invoices = useList(billing.listInvoices, {});
  const numberOf = new Map(invoices.items.map((invoice) => [invoice.id, invoice.number]));
  const post = useCommand(
    () =>
      browserCall(billing.postReceipt, {
        params: { id: receipt.id },
        ifMatch: `"${String(receipt.meta.version)}"`,
      }),
    {
      success: (result) => t('receiptPosted', { number: result.number ?? '' }),
      invalidate: [billing.listReceipts.id, billing.listInvoices.id],
      onSuccess: onClose,
    },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={receipt.number ?? t('draftReceipt')}
      description={receipt.clientName}
      closeLabel={common('close')}
      footer={
        receipt.allowedActions.includes('post') ? (
          <Button
            loading={post.isPending}
            onClick={() => {
              post.mutate(undefined);
            }}
          >
            {t('postReceipt')}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {post.isError && <Callout tone="crit" title={message(post.error)} />}
        <Details
          items={[
            [t('date'), <DateText key="d" value={receipt.date} />],
            [t('received'), <Money key="r" value={receipt.amount} />],
            [t('ait'), <Money key="a" value={receipt.ait} />],
            [t('vds'), <Money key="v" value={receipt.vds} />],
            [t('retention'), <Money key="t" value={receipt.retention} />],
            [t('journal'), receipt.journalEntryNo ?? '—'],
          ]}
        />
        <Callout tone="info" title={t('deductionsNote')} />
        <DataTable
          label={t('allocations')}
          rows={receipt.allocations}
          getRowId={(row) => row.invoiceId}
          loadingState={null}
          errorState={null}
          emptyState={null}
          columns={[
            {
              id: 'invoice',
              header: t('invoice'),
              cell: (row) => <Tag>{numberOf.get(row.invoiceId) ?? '…'}</Tag>,
            },
            {
              id: 'amount',
              header: t('settled'),
              align: 'right',
              cell: (row) => <Money value={row.amount} />,
            },
          ]}
        />
      </div>
    </Dialog>
  );
}

function NewReceiptDialog({ onClose }: { readonly onClose: () => void }): ReactNode {
  const t = useTranslations('billing');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const invoices = useList(billing.listInvoices, {});
  const banks = useList(accounting.listBankAccounts, {});
  const [invoiceId, setInvoiceId] = useState('');
  const [bankAccountId, setBank] = useState('');
  const [amount, setAmount] = useState('');
  const [ait, setAit] = useState('0');
  const [vds, setVds] = useState('0');
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const open = invoices.items.filter(
    (invoice) => invoice.number !== null && invoice.balanceDue.amount !== '0.00',
  );
  const invoice = open.find((candidate) => candidate.id === invoiceId);
  const create = useCommand((body: CreateReceipt) => browserCall(billing.createReceipt, { body }), {
    success: t('receiptSaved'),
    invalidate: [billing.listReceipts.id],
    onSuccess: onClose,
  });
  const asMoney = (text: string) => moneyFromInput(text) ?? { amount: text, currency: 'BDT' };
  const submit = () => {
    const result = CreateReceipt.safeParse({
      clientId: invoice?.clientId ?? '',
      date: todayInDhaka(),
      bankAccountId,
      amount: asMoney(amount),
      ait: asMoney(ait),
      vds: asMoney(vds),
      retention: { amount: '0.00', currency: 'BDT' },
      // The invoice is settled by its balance as the server reported it; the server checks that
      // the money received and the deductions add up to it.
      allocations:
        invoice === undefined ? [] : [{ invoiceId: invoice.id, amount: invoice.balanceDue }],
    });
    setErrors(fieldErrors(result));
    if (result.success) create.mutate(result.data);
  };
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t('newReceipt')}
      description={t('newReceiptDescription')}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button loading={create.isPending} onClick={submit}>
            {t('saveDraft')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {create.isError && <Callout tone="crit" title={message(create.error)} />}
        <Field
          label={t('invoice')}
          required
          requiredLabel={common('required')}
          {...errorFor(errors, 'clientId')}
        >
          {(control) => (
            <Select
              {...control}
              value={invoiceId}
              placeholder={t('chooseInvoice')}
              options={open.map((candidate) => ({
                value: candidate.id,
                label: `${candidate.number ?? ''} · ${candidate.clientName}`,
              }))}
              onChange={(event) => {
                setInvoiceId(event.target.value);
              }}
            />
          )}
        </Field>
        {invoice !== undefined && (
          <p className="text-sm text-muted">
            {t('openBalance')} <Money value={invoice.balanceDue} />
          </p>
        )}
        <Field
          label={t('intoAccount')}
          required
          requiredLabel={common('required')}
          {...errorFor(errors, 'bankAccountId')}
        >
          {(control) => (
            <Select
              {...control}
              value={bankAccountId}
              placeholder={t('chooseAccount')}
              options={banks.items.map((bank) => ({ value: bank.id, label: bank.name }))}
              onChange={(event) => {
                setBank(event.target.value);
              }}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={t('received')}
            required
            requiredLabel={common('required')}
            {...errorFor(errors, 'amount')}
          >
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                }}
              />
            )}
          </Field>
          <Field label={t('ait')} {...errorFor(errors, 'ait')}>
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                value={ait}
                onChange={(event) => {
                  setAit(event.target.value);
                }}
              />
            )}
          </Field>
          <Field label={t('vds')} {...errorFor(errors, 'vds')}>
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                value={vds}
                onChange={(event) => {
                  setVds(event.target.value);
                }}
              />
            )}
          </Field>
        </div>
        <p className="text-xs text-muted">{t('deductionsNote')}</p>
      </div>
    </Dialog>
  );
}

function ReceiptsTab(): ReactNode {
  const t = useTranslations('billing');
  const receipts = useList(billing.listReceipts, {});
  const [open, setOpen] = useState<Receipt | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <RecordTable
        label={t('receipts')}
        list={receipts}
        getRowId={(row) => row.id}
        toolbar={
          <>
            <p className="text-xs text-muted">{t('receiptsHint')}</p>
            <Button
              size="sm"
              onClick={() => {
                setCreating(true);
              }}
            >
              {t('newReceipt')}
            </Button>
          </>
        }
        columns={[
          {
            id: 'number',
            header: t('receipt'),
            cell: (row) => (
              <button
                type="button"
                className="text-left font-mono text-[13px] text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.number ?? t('draftReceipt')}
              </button>
            ),
          },
          { id: 'client', header: t('client'), cell: (row) => row.clientName },
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
          {
            id: 'amount',
            header: t('received'),
            align: 'right',
            cell: (row) => <Money value={row.amount} />,
          },
          { id: 'ait', header: t('ait'), align: 'right', cell: (row) => <Money value={row.ait} /> },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => (
              <StatusPill tone={row.status === 'posted' ? 'good' : 'neutral'}>
                {row.status === 'posted' ? t('receiptPostedStatus') : t('draft')}
              </StatusPill>
            ),
          },
        ]}
      />
      {creating && (
        <NewReceiptDialog
          onClose={() => {
            setCreating(false);
          }}
        />
      )}
      {open !== null && (
        <ReceiptDialog
          receipt={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

const NOTE_TONE: Readonly<Record<CreditNote['status'], Tone>> = {
  draft: 'neutral',
  pending_approval: 'info',
  posted: 'good',
  rejected: 'crit',
};

function CreditNotesTab(): ReactNode {
  const t = useTranslations('billing');
  const status = useTranslations('billing.noteStatus');
  const notes = useList(billing.listCreditNotes, {});
  const invoices = useList(billing.listInvoices, {});
  const numberOf = new Map(invoices.items.map((invoice) => [invoice.id, invoice.number]));
  const message = useErrorMessage();
  const submit = useCommand(
    (note: CreditNote) =>
      browserCall(billing.submitCreditNote, {
        params: { id: note.id },
        ifMatch: `"${String(note.meta.version)}"`,
      }),
    { success: t('noteSubmitted'), invalidate: [billing.listCreditNotes.id] },
  );
  return (
    <div className="flex flex-col gap-3">
      {submit.isError && <Callout tone="crit" title={message(submit.error)} />}
      <RecordTable
        label={t('creditNotes')}
        list={notes}
        getRowId={(row) => row.id}
        toolbar={<p className="text-xs text-muted">{t('creditNotesHint')}</p>}
        columns={[
          { id: 'number', header: t('note'), cell: (row) => <Tag>{row.number ?? t('draft')}</Tag> },
          {
            id: 'kind',
            header: t('kind'),
            cell: (row) => (row.kind === 'credit_note' ? t('creditNote') : t('writeOff')),
          },
          {
            id: 'invoice',
            header: t('invoice'),
            cell: (row) => numberOf.get(row.invoiceId) ?? '…',
          },
          { id: 'reason', header: t('reason'), cell: (row) => row.reason },
          {
            id: 'amount',
            header: t('amount'),
            align: 'right',
            cell: (row) => <Money value={row.amount} />,
          },
          {
            id: 'status',
            header: t('status'),

            cell: (row) => (
              <StatusPill tone={NOTE_TONE[row.status]}>{status(row.status)}</StatusPill>
            ),
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) =>
              row.allowedActions.includes('submit') ? (
                <Button
                  size="sm"
                  loading={submit.isPending}
                  onClick={() => {
                    submit.mutate(row);
                  }}
                >
                  {t('submitForApproval')}
                </Button>
              ) : null,
          },
        ]}
      />
    </div>
  );
}

function StatementDialog({
  party,
  onClose,
}: {
  readonly party: { id: string; name: string };
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('billing');
  const common = useTranslations('common');
  const statement = useQuery({
    queryKey: [billing.getClientStatement.id, party.id],
    queryFn: () =>
      browserCall(billing.getClientStatement, {
        params: { id: party.id },
        query: { from: addDays(todayInDhaka(), -90), to: todayInDhaka() },
      }),
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('statementOf', { name: party.name })}
      closeLabel={common('close')}
    >
      <QueryView query={statement}>{(data) => <StatementTable statement={data} />}</QueryView>
    </Dialog>
  );
}

function AgeingTab(): ReactNode {
  const t = useTranslations('billing');
  const [party, setParty] = useState<{ id: string; name: string } | null>(null);
  const ageing = useQuery({
    queryKey: [billing.getReceivablesAgeing.id],
    queryFn: () => browserCall(billing.getReceivablesAgeing, { query: {} }),
  });
  return (
    <Card title={t('ageing')} description={t('ageingDescription')}>
      <QueryView query={ageing}>
        {(data) => (
          <AgeingTable
            report={data}
            partyLabel={t('client')}
            onParty={(id, name) => {
              setParty({ id, name });
            }}
          />
        )}
      </QueryView>
      {party !== null && (
        <StatementDialog
          party={party}
          onClose={() => {
            setParty(null);
          }}
        />
      )}
    </Card>
  );
}

export function BillingPage(): ReactNode {
  const t = useTranslations('billing');
  const allowed = useCanRead('billing');
  if (!allowed) return <ForbiddenState />;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs
        label={t('title')}
        items={[
          { value: 'invoices', label: t('invoices'), content: <InvoicesTab /> },
          { value: 'receipts', label: t('receipts'), content: <ReceiptsTab /> },
          { value: 'notes', label: t('creditNotes'), content: <CreditNotesTab /> },
          { value: 'ageing', label: t('ageing'), content: <AgeingTab /> },
        ]}
      />
    </>
  );
}

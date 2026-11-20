'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';

import { CreateVendorBill, accountingEndpoints as accounting } from '@pitchforge/contracts';
import type { VendorBill } from '@pitchforge/contracts';
import { addDays, todayInDhaka } from '@pitchforge/shared-kernel';
import type { BusinessDate } from '@pitchforge/shared-kernel';
import {
  Button,
  Callout,
  DateInput,
  DateText,
  Dialog,
  Field,
  Input,
  Money,
  Select,
  StatusPill,
  Tag,
} from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { errorFor, fieldErrors } from '../common/form-errors.ts';
import { moneyFromInput } from '../common/money-input.ts';
import { Details, RecordTable } from '../common/record-table.tsx';
import { QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';

import { EditBillButton } from './forms.tsx';
import { PostingLines } from './posting-lines.tsx';

const BILL_TONE: Readonly<Record<VendorBill['status'], Tone>> = {
  draft: 'neutral',
  pending_approval: 'info',
  ready_to_pay: 'warn',
  partially_paid: 'warn',
  paid: 'good',
  rejected: 'crit',
};

export function BillStatus({ status }: { readonly status: VendorBill['status'] }): ReactNode {
  const t = useTranslations('finance.billStatus');
  // eslint-disable-next-line security/detect-object-injection -- key is the bill status union
  return <StatusPill tone={BILL_TONE[status]}>{t(status)}</StatusPill>;
}

function BillDialog({
  bill,
  onClose,
}: {
  readonly bill: VendorBill;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('finance');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const preview = useQuery({
    queryKey: [accounting.getVendorBillPostingPreview.id, bill.id],
    queryFn: () => browserCall(accounting.getVendorBillPostingPreview, { params: { id: bill.id } }),
    enabled: bill.status === 'draft' || bill.status === 'pending_approval',
  });
  const submit = useCommand(
    () =>
      browserCall(accounting.submitVendorBill, {
        params: { id: bill.id },
        ifMatch: `"${String(bill.meta.version)}"`,
      }),
    {
      success: t('billSubmitted'),
      invalidate: [accounting.listVendorBills.id],
      onSuccess: onClose,
    },
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={bill.number ?? t('draftBill')}
      description={`${bill.vendorName} · ${bill.description}`}
      closeLabel={common('close')}
      footer={
        <>
          <EditBillButton bill={bill} />
          {bill.status === 'pending_approval' && (
            <Button asChild variant="secondary">
              <Link href="/approvals">{t('openApproval')}</Link>
            </Button>
          )}
          {bill.allowedActions.includes('submit') && (
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
        {submit.isError && <Callout tone="crit" title={message(submit.error)} />}
        <Details
          items={[
            [t('status'), <BillStatus key="s" status={bill.status} />],
            [t('account'), <Tag key="a">{bill.accountCode}</Tag>],
            [t('billDate'), <DateText key="b" value={bill.billDate} />],
            [t('dueDate'), <DateText key="d" value={bill.dueDate} />],
            [t('net'), <Money key="n" value={bill.net} />],
            [t('vat'), <Money key="v" value={bill.vat} />],
            [t('gross'), <Money key="g" value={bill.gross} />],
            [t('balanceDue'), <Money key="bd" value={bill.balanceDue} />],
            [t('journal'), bill.journalEntryNo ?? '—'],
          ]}
        />
        {preview.isFetched && (
          <QueryView query={preview}>
            {(data) => (
              <PostingLines
                title={t('postingPreview')}
                lines={data.lines}
                note={t('postingNote')}
              />
            )}
          </QueryView>
        )}
      </div>
    </Dialog>
  );
}

interface BillForm {
  vendorId: string;
  accountCode: string;
  description: string;
  billDate: BusinessDate | null;
  dueDate: BusinessDate | null;
  net: string;
  vat: string;
}

function NewBillDialog({ onClose }: { readonly onClose: () => void }): ReactNode {
  const t = useTranslations('finance');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const today = todayInDhaka();
  const payees = useList(accounting.listPayees, {});
  const accounts = useList(accounting.listAccounts, { limit: 200 });
  const [form, setForm] = useState<BillForm>({
    vendorId: '',
    accountCode: '',
    description: '',
    billDate: today,
    dueDate: addDays(today, 14),
    net: '',
    vat: '0',
  });
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const set = <K extends keyof BillForm>(key: K, value: BillForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const create = useCommand(
    (body: CreateVendorBill) => browserCall(accounting.createVendorBill, { body }),
    { success: t('billCreated'), invalidate: [accounting.listVendorBills.id], onSuccess: onClose },
  );

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const body = {
      vendorId: form.vendorId,
      projectId: null,
      accountCode: form.accountCode,
      description: form.description.trim(),
      billDate: form.billDate ?? '',
      dueDate: form.dueDate ?? '',
      net: moneyFromInput(form.net) ?? { amount: form.net, currency: 'BDT' },
      vat: moneyFromInput(form.vat) ?? { amount: form.vat, currency: 'BDT' },
      fileIds: [],
    };
    const result = CreateVendorBill.safeParse(body);
    setErrors(fieldErrors(result));
    if (result.success) create.mutate(result.data);
  };

  // Postable accounts only: headings and engine-only control accounts are left out of the list.
  const accountOptions = accounts.items
    .filter(
      (account) => !account.isControl && (account.type === 'expense' || account.type === 'asset'),
    )
    .filter((account) => !accounts.items.some((other) => other.parentId === account.id))
    .map((account) => ({ value: account.code, label: `${account.code} · ${account.name}` }));

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('newBill')}
      description={t('newBillDescription')}
      closeLabel={common('close')}
    >
      <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
        {create.isError && <Callout tone="crit" title={message(create.error)} />}
        <Field
          label={t('vendor')}
          required
          requiredLabel={common('required')}
          {...errorFor(errors, 'vendorId')}
        >
          {(control) => (
            <Select
              {...control}
              value={form.vendorId}
              placeholder={t('chooseVendor')}
              options={payees.items.map((payee) => ({ value: payee.id, label: payee.name }))}
              onChange={(event) => {
                set('vendorId', event.target.value);
              }}
            />
          )}
        </Field>
        <Field
          label={t('account')}
          required
          requiredLabel={common('required')}
          {...errorFor(errors, 'accountCode')}
        >
          {(control) => (
            <Select
              {...control}
              value={form.accountCode}
              placeholder={t('chooseAccount')}
              options={accountOptions}
              onChange={(event) => {
                set('accountCode', event.target.value);
              }}
            />
          )}
        </Field>
        <Field
          label={t('description')}
          required
          requiredLabel={common('required')}
          {...errorFor(errors, 'description')}
        >
          {(control) => (
            <Input
              {...control}
              value={form.description}
              onChange={(event) => {
                set('description', event.target.value);
              }}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('billDate')}
            required
            requiredLabel={common('required')}
            {...errorFor(errors, 'billDate')}
          >
            {(control) => (
              <DateInput
                {...control}
                value={form.billDate}
                placeholder={t('chooseDate')}
                onChange={(value) => {
                  set('billDate', value as BusinessDate | null);
                }}
              />
            )}
          </Field>
          <Field
            label={t('dueDate')}
            required
            requiredLabel={common('required')}
            {...errorFor(errors, 'dueDate')}
          >
            {(control) => (
              <DateInput
                {...control}
                value={form.dueDate}
                placeholder={t('chooseDate')}
                onChange={(value) => {
                  set('dueDate', value as BusinessDate | null);
                }}
              />
            )}
          </Field>
          <Field
            label={t('net')}
            hint={t('amountHint')}
            required
            requiredLabel={common('required')}
            {...errorFor(errors, 'net')}
          >
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                value={form.net}
                onChange={(event) => {
                  set('net', event.target.value);
                }}
              />
            )}
          </Field>
          <Field label={t('vat')} {...errorFor(errors, 'vat')}>
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                value={form.vat}
                onChange={(event) => {
                  set('vat', event.target.value);
                }}
              />
            )}
          </Field>
        </div>
        <p className="text-xs text-muted">{t('grossByServer')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button type="submit" loading={create.isPending}>
            {t('saveDraft')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function BillsTab(): ReactNode {
  const t = useTranslations('finance');
  const bills = useList(accounting.listVendorBills, {});
  const [open, setOpen] = useState<VendorBill | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <RecordTable
        label={t('bills')}
        list={bills}
        getRowId={(row) => row.id}
        empty={t('noBills')}
        toolbar={
          <>
            <p className="text-xs text-muted">{t('billsHint')}</p>
            <Button
              size="sm"
              onClick={() => {
                setCreating(true);
              }}
            >
              {t('newBill')}
            </Button>
          </>
        }
        columns={[
          {
            id: 'number',
            header: t('bill'),
            cell: (row) => (
              <button
                type="button"
                className="text-left font-mono text-[13px] text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.number ?? t('draftBill')}
              </button>
            ),
          },
          { id: 'vendor', header: t('vendor'), cell: (row) => row.vendorName },
          {
            id: 'description',
            header: t('description'),
            cell: (row) => (
              <span className="flex flex-col">
                {row.description}
                <span className="font-mono text-xs text-muted">{row.accountCode}</span>
              </span>
            ),
          },
          {
            id: 'gross',
            header: t('gross'),
            align: 'right',
            cell: (row) => <Money value={row.gross} />,
          },
          { id: 'due', header: t('dueDate'), cell: (row) => <DateText value={row.dueDate} /> },
          { id: 'status', header: t('status'), cell: (row) => <BillStatus status={row.status} /> },
        ]}
      />
      {open !== null && (
        <BillDialog
          bill={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
      {creating && (
        <NewBillDialog
          onClose={() => {
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

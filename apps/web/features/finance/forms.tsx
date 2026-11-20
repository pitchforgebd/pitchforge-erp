'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  accountingEndpoints as accounting,
  BankAccountKind,
  ChequeStatus,
  CreateBankAccount,
  CreateChallan,
  CreateCheque,
  CreateEmployeeAdvance,
  CreateExpenseClaim,
  CreateWithholdingCertificate,
  PayDocument,
  SetChequeStatus,
  SettleAdvance,
  UpdateBankAccount,
  UpdatePaymentRun,
  UpdateVendorBill,
} from '@pitchforge/contracts';
import type {
  BankAccount,
  Cheque,
  EmployeeAdvance,
  ExpenseClaim,
  PaymentRun,
  VendorBill,
} from '@pitchforge/contracts';
import { Button, Callout, Dialog, Field, Select } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { FilePicker, uploadFile, useUploadError } from '../common/files.tsx';
import { DialogButton, FormDialog } from '../common/form-dialog.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';

/** "1,25,000" as people type it, from the API's "125000.00". Only the format changes. */
export const typed = (money: { readonly amount: string }) => money.amount.replace(/\.00$/, '');

const TODAY = '2026-11-20';

function useBankOptions() {
  const banks = useList(accounting.listBankAccounts, {});
  return banks.items.map((bank) => ({ value: bank.id, label: bank.name }));
}

function useExpenseAccountOptions() {
  const accounts = useList(accounting.listAccounts, { limit: 200 });
  return accounts.items
    .filter((account) => account.type === 'expense' && !account.isControl)
    .map((account) => ({ value: account.code, label: `${account.code} · ${account.name}` }));
}

/* Bank accounts ----------------------------------------------------------------------------- */

export function NewBankAccountButton(): ReactNode {
  const t = useTranslations('forms');
  const kinds = useTranslations('finance.bankKinds');
  const accounts = useList(accounting.listAccounts, { limit: 200 });
  const cashAccounts = accounts.items
    .filter((account) => account.code.startsWith('11') && account.code !== '1100')
    .map((account) => ({ value: account.code, label: `${account.code} · ${account.name}` }));
  return (
    <DialogButton label={t('newBankAccount')}>
      {(close) => (
        <FormDialog
          title={t('newBankAccount')}
          submitLabel={t('save')}
          schema={CreateBankAccount}
          fields={[
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            {
              name: 'kind',
              label: t('fields.kind'),
              kind: 'select',
              required: true,
              options: BankAccountKind.options.map((value) => ({ value, label: kinds(value) })),
            },
            { name: 'institution', label: t('fields.institution'), kind: 'text', nullable: true },
            {
              name: 'accountNumber',
              label: t('fields.accountNumber'),
              kind: 'text',
              nullable: true,
            },
            {
              name: 'ledgerAccountCode',
              label: t('fields.ledgerAccount'),
              kind: 'select',
              required: true,
              options: cashAccounts,
            },
          ]}
          fixed={{ currency: 'BDT' }}
          note={t('stepUpNote')}
          submit={(body) => browserCall(accounting.createBankAccount, { body })}
          success={t('saved')}
          invalidate={[accounting.listBankAccounts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditBankAccountButton({ bank }: { readonly bank: BankAccount }): ReactNode {
  const t = useTranslations('forms');
  if (!bank.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: bank.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: bank.name })}
          submitLabel={t('save')}
          schema={UpdateBankAccount}
          fields={[
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            { name: 'institution', label: t('fields.institution'), kind: 'text', nullable: true },
            { name: 'active', label: t('fields.active'), kind: 'checkbox' },
          ]}
          initial={{ name: bank.name, institution: bank.institution ?? '', active: bank.active }}
          note={t('stepUpNote')}
          submit={(body) =>
            browserCall(accounting.updateBankAccount, {
              params: { id: bank.id },
              body,
              ifMatch: `"${String(bank.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[accounting.listBankAccounts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Cheques ----------------------------------------------------------------------------------- */

export function NewChequeButton(): ReactNode {
  const t = useTranslations('forms');
  const banks = useBankOptions();
  return (
    <DialogButton label={t('newCheque')}>
      {(close) => (
        <FormDialog
          title={t('newCheque')}
          submitLabel={t('save')}
          schema={CreateCheque}
          fields={[
            { name: 'chequeNo', label: t('fields.chequeNo'), kind: 'text', required: true },
            {
              name: 'direction',
              label: t('fields.direction'),
              kind: 'select',
              required: true,
              options: [
                { value: 'issued', label: t('directions.issued') },
                { value: 'received', label: t('directions.received') },
              ],
            },
            {
              name: 'bankAccountId',
              label: t('fields.bankAccount'),
              kind: 'select',
              required: true,
              options: banks,
            },
            { name: 'partyName', label: t('fields.party'), kind: 'text', required: true },
            { name: 'amount', label: t('fields.amount'), kind: 'money', required: true },
            { name: 'chequeDate', label: t('fields.chequeDate'), kind: 'date', required: true },
          ]}
          submit={(body) => browserCall(accounting.createCheque, { body })}
          success={t('saved')}
          invalidate={[accounting.listCheques.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function ChequeStatusButton({ cheque }: { readonly cheque: Cheque }): ReactNode {
  const t = useTranslations('forms');
  const status = useTranslations('finance.chequeStatus');
  if (!cheque.allowedActions.includes('set_status')) return null;
  return (
    <DialogButton
      label={t('setStatus')}
      ariaLabel={t('setStatusLabel', { number: cheque.chequeNo })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('setStatusLabel', { number: cheque.chequeNo })}
          submitLabel={t('save')}
          schema={SetChequeStatus}
          fields={[
            {
              name: 'status',
              label: t('fields.status'),
              kind: 'select',
              required: true,
              options: ChequeStatus.options.map((value) => ({ value, label: status(value) })),
            },
          ]}
          initial={{ status: cheque.status }}
          submit={(body) =>
            browserCall(accounting.setChequeStatus, {
              params: { id: cheque.id },
              body,
              ifMatch: `"${String(cheque.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[accounting.listCheques.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Claims and advances ----------------------------------------------------------------------- */

export function NewClaimButton(): ReactNode {
  const t = useTranslations('forms');
  const accounts = useExpenseAccountOptions();
  return (
    <DialogButton label={t('newClaim')}>
      {(close) => (
        <FormDialog
          title={t('newClaim')}
          description={t('newClaimHint')}
          submitLabel={t('saveDraft')}
          schema={CreateExpenseClaim}
          fields={[
            { name: 'description', label: t('fields.description'), kind: 'text', required: true },
            {
              name: 'accountCode',
              label: t('fields.expenseKind'),
              kind: 'select',
              required: true,
              options: accounts,
            },
            { name: 'expenseDate', label: t('fields.date'), kind: 'date', required: true },
            { name: 'amount', label: t('fields.amount'), kind: 'money', required: true },
          ]}
          fixed={{ projectId: null, fileIds: [] }}
          note={t('receiptsLater')}
          submit={(body) => browserCall(accounting.createExpenseClaim, { body })}
          success={t('claimSaved')}
          invalidate={[accounting.listExpenseClaims.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function SubmitClaimButton({ claim }: { readonly claim: ExpenseClaim }): ReactNode {
  const t = useTranslations('forms');
  const message = useErrorMessage();
  const submit = useCommand(
    () =>
      browserCall(accounting.submitExpenseClaim, {
        params: { id: claim.id },
        ifMatch: `"${String(claim.meta.version)}"`,
      }),
    { success: t('claimSubmitted'), invalidate: [accounting.listExpenseClaims.id] },
  );
  if (!claim.allowedActions.includes('submit')) return null;
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        loading={submit.isPending}
        aria-label={t('submitClaimLabel', { description: claim.description })}
        onClick={() => {
          submit.mutate(undefined);
        }}
      >
        {t('submit')}
      </Button>
      {submit.isError && <Callout tone="crit" title={message(submit.error)} />}
    </span>
  );
}

function usePayFields() {
  const t = useTranslations('forms');
  const banks = useBankOptions();
  return [
    {
      name: 'bankAccountId',
      label: t('fields.payFrom'),
      kind: 'select' as const,
      required: true,
      options: banks,
    },
    { name: 'paymentDate', label: t('fields.paymentDate'), kind: 'date' as const, required: true },
  ];
}

export function PayClaimButton({ claim }: { readonly claim: ExpenseClaim }): ReactNode {
  const t = useTranslations('forms');
  const fields = usePayFields();
  if (!claim.allowedActions.includes('pay')) return null;
  return (
    <DialogButton
      label={t('pay')}
      ariaLabel={t('payLabel', { name: claim.employee.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('payLabel', { name: claim.employee.name })}
          description={claim.description}
          submitLabel={t('pay')}
          schema={PayDocument}
          fields={fields}
          initial={{ paymentDate: TODAY }}
          note={t('postedByServer')}
          submit={(body) =>
            browserCall(accounting.payExpenseClaim, {
              params: { id: claim.id },
              body,
              ifMatch: `"${String(claim.meta.version)}"`,
            })
          }
          success={t('paid')}
          invalidate={[accounting.listExpenseClaims.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewAdvanceButton(): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('newAdvance')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newAdvance')}
          submitLabel={t('saveDraft')}
          schema={CreateEmployeeAdvance}
          fields={[
            { name: 'purpose', label: t('fields.purpose'), kind: 'text', required: true },
            { name: 'amount', label: t('fields.amount'), kind: 'money', required: true },
          ]}
          submit={(body) => browserCall(accounting.createEmployeeAdvance, { body })}
          success={t('advanceSaved')}
          invalidate={[accounting.listEmployeeAdvances.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function AdvanceActions({ advance }: { readonly advance: EmployeeAdvance }): ReactNode {
  const t = useTranslations('forms');
  const pay = usePayFields();
  const banks = useBankOptions();
  const claims = useList(accounting.listExpenseClaims, {});
  const ownClaims = claims.items
    .filter((claim) => claim.employee.id === advance.employee.id && claim.status === 'approved')
    .map((claim) => ({
      value: claim.id,
      label: `${claim.number ?? t('draft')} · ${claim.description}`,
    }));
  const ifMatch = `"${String(advance.meta.version)}"`;
  return (
    <span className="flex justify-end gap-2">
      {advance.allowedActions.includes('pay') && (
        <DialogButton
          label={t('pay')}
          ariaLabel={t('payLabel', { name: advance.employee.name })}
          size="sm"
        >
          {(close) => (
            <FormDialog
              title={t('payLabel', { name: advance.employee.name })}
              description={advance.purpose}
              submitLabel={t('pay')}
              schema={PayDocument}
              fields={pay}
              initial={{ paymentDate: TODAY }}
              submit={(body) =>
                browserCall(accounting.payEmployeeAdvance, {
                  params: { id: advance.id },
                  body,
                  ifMatch,
                })
              }
              success={t('paid')}
              invalidate={[accounting.listEmployeeAdvances.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
      {advance.allowedActions.includes('settle') && (
        <DialogButton
          label={t('settle')}
          ariaLabel={t('settleLabel', { name: advance.employee.name })}
          size="sm"
          variant="secondary"
        >
          {(close) => (
            <FormDialog
              title={t('settleLabel', { name: advance.employee.name })}
              description={advance.purpose}
              submitLabel={t('settle')}
              schema={SettleAdvance}
              fields={[
                {
                  name: 'expenseClaimIds',
                  label: t('fields.claims'),
                  kind: 'lines',
                  addLabel: t('addClaim'),
                  minRows: 0,
                  fields: [
                    { name: 'id', label: t('fields.claim'), kind: 'select', options: ownClaims },
                  ],
                },
                {
                  name: 'returnedAmount',
                  label: t('fields.returned'),
                  kind: 'money',
                  required: true,
                },
                {
                  name: 'bankAccountId',
                  label: t('fields.returnedTo'),
                  kind: 'select',
                  nullable: true,
                  options: banks,
                },
              ]}
              initial={{ returnedAmount: '0' }}
              transform={(body) => ({
                ...body,
                expenseClaimIds: (body['expenseClaimIds'] as readonly { id: string }[]).map(
                  (row) => row.id,
                ),
              })}
              note={t('postedByServer')}
              submit={(body) =>
                browserCall(accounting.settleEmployeeAdvance, {
                  params: { id: advance.id },
                  body,
                  ifMatch,
                })
              }
              success={t('settled')}
              invalidate={[accounting.listEmployeeAdvances.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
    </span>
  );
}

/* Tax --------------------------------------------------------------------------------------- */

export function NewChallanButton(): ReactNode {
  const t = useTranslations('forms');
  const kinds = useTranslations('tax.challanKinds');
  return (
    <DialogButton label={t('newChallan')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newChallan')}
          submitLabel={t('save')}
          schema={CreateChallan}
          fields={[
            { name: 'challanNo', label: t('fields.challanNo'), kind: 'text', required: true },
            {
              name: 'taxKind',
              label: t('fields.taxKind'),
              kind: 'select',
              required: true,
              options: (['vat', 'tds', 'vds', 'salary_tds'] as const).map((value) => ({
                value,
                label: kinds(value),
              })),
            },
            { name: 'period', label: t('fields.period'), kind: 'month', required: true },
            { name: 'amount', label: t('fields.amount'), kind: 'money', required: true },
            { name: 'paidOn', label: t('fields.paidOn'), kind: 'date', required: true },
          ]}
          submit={(body) => browserCall(accounting.createChallan, { body })}
          success={t('saved')}
          invalidate={[accounting.listChallans.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewCertificateButton(): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('newCertificate')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newCertificate')}
          submitLabel={t('save')}
          schema={CreateWithholdingCertificate}
          fields={[
            {
              name: 'direction',
              label: t('fields.direction'),
              kind: 'select',
              required: true,
              options: [
                { value: 'issued', label: t('directions.issued') },
                { value: 'received', label: t('directions.received') },
              ],
            },
            {
              name: 'kind',
              label: t('fields.taxKind'),
              kind: 'select',
              required: true,
              options: [
                { value: 'tds', label: 'TDS' },
                { value: 'vds', label: 'VDS' },
              ],
            },
            { name: 'partyName', label: t('fields.party'), kind: 'text', required: true },
            { name: 'period', label: t('fields.period'), kind: 'month', required: true },
            { name: 'amount', label: t('fields.amount'), kind: 'money', required: true },
            {
              name: 'certificateNo',
              label: t('fields.certificateNo'),
              kind: 'text',
              required: true,
            },
          ]}
          fixed={{ fileId: null }}
          submit={(body) => browserCall(accounting.createWithholdingCertificate, { body })}
          success={t('saved')}
          invalidate={[accounting.listWithholdingCertificates.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Bills and payment runs -------------------------------------------------------------------- */

export function EditBillButton({ bill }: { readonly bill: VendorBill }): ReactNode {
  const t = useTranslations('forms');
  const accounts = useExpenseAccountOptions();
  if (!bill.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: bill.number ?? bill.description })}
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: bill.number ?? bill.description })}
          submitLabel={t('save')}
          schema={UpdateVendorBill}
          fields={[
            { name: 'description', label: t('fields.description'), kind: 'text', required: true },
            {
              name: 'accountCode',
              label: t('fields.expenseKind'),
              kind: 'select',
              required: true,
              options: accounts,
            },
            { name: 'billDate', label: t('fields.billDate'), kind: 'date', required: true },
            { name: 'dueDate', label: t('fields.dueDate'), kind: 'date', required: true },
            { name: 'net', label: t('fields.net'), kind: 'money', required: true },
            { name: 'vat', label: t('fields.vat'), kind: 'money', required: true },
          ]}
          initial={{
            description: bill.description,
            accountCode: bill.accountCode,
            billDate: bill.billDate,
            dueDate: bill.dueDate,
            net: typed(bill.net),
            vat: typed(bill.vat),
          }}
          note={t('postedByServer')}
          submit={(body) =>
            browserCall(accounting.updateVendorBill, {
              params: { id: bill.id },
              body,
              ifMatch: `"${String(bill.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[accounting.listVendorBills.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditRunButton({ run }: { readonly run: PaymentRun }): ReactNode {
  const t = useTranslations('forms');
  const banks = useBankOptions();
  if (!run.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: run.number ?? t('draft') })}
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: run.number ?? t('draft') })}
          submitLabel={t('save')}
          schema={UpdatePaymentRun}
          fields={[
            { name: 'paymentDate', label: t('fields.paymentDate'), kind: 'date', required: true },
            {
              name: 'bankAccountId',
              label: t('fields.payFrom'),
              kind: 'select',
              required: true,
              options: banks,
            },
          ]}
          initial={{ paymentDate: run.paymentDate, bankAccountId: run.bankAccountId }}
          submit={(body) =>
            browserCall(accounting.updatePaymentRun, {
              params: { id: run.id },
              body,
              ifMatch: `"${String(run.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[accounting.listPaymentRuns.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Bank statement import --------------------------------------------------------------------- */

export function ImportStatementButton(): ReactNode {
  const t = useTranslations('forms');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('importStatement')}
      </Button>
      {open && (
        <ImportStatementDialog
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function ImportStatementDialog({ onClose }: { readonly onClose: () => void }): ReactNode {
  const t = useTranslations('forms');
  const common = useTranslations('common');
  const uploadError = useUploadError();
  const banks = useBankOptions();
  const [bankAccountId, setBank] = useState('');
  const [picked, setPicked] = useState<File | null>(null);
  const run = useCommand(
    async (file: File) => {
      const stored = await uploadFile(file, null);
      return browserCall(accounting.importBankStatement, {
        body: { bankAccountId, fileId: stored.id },
      });
    },
    {
      success: t('statementImported'),
      invalidate: [accounting.listStatementLines.id],
      onSuccess: onClose,
    },
  );
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t('importStatement')}
      description={t('importStatementHint')}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            loading={run.isPending}
            disabled={picked === null || bankAccountId === ''}
            onClick={() => {
              if (picked !== null) run.mutate(picked);
            }}
          >
            {t('import')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {run.isError && <Callout tone="crit" title={uploadError(run.error)} />}
        <Field label={t('fields.bankAccount')} required requiredLabel={common('required')}>
          {(control) => (
            <Select
              {...control}
              value={bankAccountId}
              placeholder={t('choose')}
              options={banks}
              onChange={(event) => {
                setBank(event.target.value);
              }}
            />
          )}
        </Field>
        <FilePicker
          label={t('fields.statementFile')}
          accept="text/csv,.csv,.xlsx"
          onPick={setPicked}
        />
      </div>
    </Dialog>
  );
}

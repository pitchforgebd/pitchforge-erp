'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import {
  CreateCreditNote,
  CreateSalesInvoice,
  UpdateSalesInvoice,
  accountingEndpoints as accounting,
  billingEndpoints as billing,
  crmEndpoints as crm,
  projectsEndpoints as projects,
} from '@pitchforge/contracts';
import type { SalesInvoice } from '@pitchforge/contracts';

import { browserCall } from '../../lib/api/browser.ts';
import { inDays, today } from '../common/dates.ts';
import { DialogButton, FormDialog } from '../common/form-dialog.tsx';
import type { FormSpec } from '../common/form-dialog.tsx';
import { useList } from '../common/use-list.ts';
import { typed } from '../finance/forms.tsx';

function useInvoiceFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const clients = useList(crm.listClients, {});
  const projectList = useList(projects.listProjects, {});
  const taxCodes = useList(accounting.listTaxCodes, {});
  return [
    {
      name: 'kind',
      label: t('fields.invoiceKind'),
      kind: 'select',
      required: true,
      options: [
        { value: 'standard', label: t('invoiceKinds.standard') },
        { value: 'advance', label: t('invoiceKinds.advance') },
      ],
    },
    {
      name: 'clientId',
      label: t('fields.client'),
      kind: 'select',
      required: true,
      options: clients.items.map((client) => ({ value: client.id, label: client.name })),
    },
    {
      name: 'projectId',
      label: t('fields.project'),
      kind: 'select',
      nullable: true,
      options: projectList.items.map((project) => ({
        value: project.id,
        label: `${project.code} · ${project.name}`,
      })),
    },
    { name: 'issueDate', label: t('fields.issueDate'), kind: 'date', required: true },
    { name: 'dueDate', label: t('fields.dueDate'), kind: 'date', required: true },
    {
      name: 'lines',
      label: t('fields.lines'),
      kind: 'lines',
      addLabel: t('addLine'),
      fields: [
        { name: 'description', label: t('fields.description'), kind: 'text' },
        { name: 'quantity', label: t('fields.quantity'), kind: 'decimal' },
        { name: 'unitPrice', label: t('fields.unitPrice'), kind: 'money' },
        {
          name: 'taxCodeId',
          label: t('fields.vat'),
          kind: 'select',
          nullable: true,
          options: taxCodes.items.map((code) => ({
            value: code.id,
            label: `${code.code} · ${code.name}`,
          })),
        },
      ],
    },
  ];
}

export function NewInvoiceButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useInvoiceFields();
  return (
    <DialogButton label={t('newInvoice')}>
      {(close) => (
        <FormDialog
          title={t('newInvoice')}
          description={t('newInvoiceHint')}
          submitLabel={t('saveDraft')}
          schema={CreateSalesInvoice}
          fields={fields}
          initial={{ kind: 'standard', issueDate: today(), dueDate: inDays(30) }}
          fixed={{ source: 'manual', sourceId: null, adjustAdvanceInvoiceIds: [] }}
          note={t('totalsByServer')}
          submit={(body) => browserCall(billing.createInvoice, { body })}
          success={t('invoiceSaved')}
          invalidate={[billing.listInvoices.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditInvoiceButton({ invoice }: { readonly invoice: SalesInvoice }): ReactNode {
  const t = useTranslations('forms');
  const fields = useInvoiceFields();
  if (!invoice.allowedActions.includes('update')) return null;
  const name = invoice.number ?? t('draftInvoice');
  return (
    <DialogButton label={t('edit')} ariaLabel={t('editLabel', { name })} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('editLabel', { name })}
          submitLabel={t('save')}
          schema={UpdateSalesInvoice}
          fields={fields}
          initial={{
            kind: invoice.kind,
            clientId: invoice.clientId,
            projectId: invoice.projectId ?? '',
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            lines: invoice.lines.map((line) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: typed(line.unitPrice),
              taxCodeId: line.taxCodeId ?? '',
            })),
          }}
          note={t('totalsByServer')}
          submit={(body) =>
            browserCall(billing.updateInvoice, {
              params: { id: invoice.id },
              body,
              ifMatch: `"${String(invoice.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[billing.listInvoices.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewCreditNoteButton(): ReactNode {
  const t = useTranslations('forms');
  const invoices = useList(billing.listInvoices, {});
  const posted = invoices.items
    .filter((invoice) => invoice.number !== null && invoice.status !== 'draft')
    .map((invoice) => ({
      value: invoice.id,
      label: `${invoice.number ?? ''} · ${invoice.clientName}`,
    }));
  return (
    <DialogButton label={t('newCreditNote')}>
      {(close) => (
        <FormDialog
          title={t('newCreditNote')}
          submitLabel={t('saveDraft')}
          schema={CreateCreditNote}
          fields={[
            {
              name: 'kind',
              label: t('fields.kind'),
              kind: 'select',
              required: true,
              options: [
                { value: 'credit_note', label: t('noteKinds.credit_note') },
                { value: 'write_off', label: t('noteKinds.write_off') },
              ],
            },
            {
              name: 'invoiceId',
              label: t('fields.invoice'),
              kind: 'select',
              required: true,
              options: posted,
            },
            { name: 'date', label: t('fields.date'), kind: 'date', required: true },
            { name: 'amount', label: t('fields.amount'), kind: 'money', required: true },
            { name: 'reason', label: t('fields.reason'), kind: 'textarea', required: true },
          ]}
          initial={{ kind: 'credit_note', date: today() }}
          note={t('approvalNote')}
          submit={(body) => browserCall(billing.createCreditNote, { body })}
          success={t('noteSaved')}
          invalidate={[billing.listCreditNotes.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

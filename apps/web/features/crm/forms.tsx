'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  AwardTender,
  CreateClientAccount,
  CreateClientContact,
  CreateContract,
  CreateGuarantee,
  CreateLead,
  CreateOpportunity,
  CreateQuotation,
  CreateSalesActivity,
  CreateStandardDocument,
  CreateTender,
  ReplacePipelineStages,
  ReplaceTenderChecklist,
  UpdateClientAccount,
  UpdateContract,
  UpdateLead,
  UpdateOpportunity,
  UpdateQuotation,
  UpdateTender,
  coreEndpoints as core,
  crmEndpoints as crm,
} from '@pitchforge/contracts';
import type {
  ClientAccount,
  Contract,
  Lead,
  Opportunity,
  Quotation,
  Tender,
  TenderChecklistItem,
} from '@pitchforge/contracts';
import { Button, Callout, DateInput, Dialog, Field, Input } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { inDays, today } from '../common/dates.ts';
import { FilePicker, uploadFile, useUploadError } from '../common/files.tsx';
import { DialogButton, FormDialog, dhakaInput } from '../common/form-dialog.tsx';
import type { FormSpec } from '../common/form-dialog.tsx';
import { errorFor, fieldErrors } from '../common/form-errors.ts';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';
import { typed } from '../finance/forms.tsx';

const textOf = (value: unknown) => (typeof value === 'string' ? value : '');

function useUserOptions() {
  const users = useList(core.listUsers, {});
  return users.items.map((user) => ({ value: user.id, label: user.name }));
}

function useClientOptions() {
  const clients = useList(crm.listClients, {});
  return clients.items.map((client) => ({ value: client.id, label: client.name }));
}

/* Leads ------------------------------------------------------------------------------------- */

function useLeadFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const owners = useUserOptions();
  return [
    { name: 'name', label: t('fields.company'), kind: 'text', required: true },
    { name: 'contactName', label: t('fields.contactName'), kind: 'text', nullable: true },
    { name: 'email', label: t('fields.email'), kind: 'text', nullable: true },
    { name: 'phone', label: t('fields.phone'), kind: 'text', nullable: true },
    { name: 'source', label: t('fields.source'), kind: 'text', required: true },
    { name: 'need', label: t('fields.need'), kind: 'textarea', nullable: true },
    { name: 'ownerId', label: t('fields.owner'), kind: 'select', required: true, options: owners },
    { name: 'nextFollowUp', label: t('fields.nextFollowUp'), kind: 'date', nullable: true },
  ];
}

function Duplicates({ name }: { readonly name: string }): ReactNode {
  const t = useTranslations('forms');
  const wanted = name.trim();
  const matches = useQuery({
    queryKey: [crm.findDuplicates.id, wanted],
    queryFn: () => browserCall(crm.findDuplicates, { query: { name: wanted } }),
    enabled: wanted.length >= 3,
  });
  const items = matches.data?.items ?? [];
  if (wanted.length < 3 || items.length === 0) return null;
  return (
    <Callout tone="warn" title={t('possibleDuplicates')}>
      {items.map((item) => `${item.name} (${t(`recordTypes.${item.recordType}`)})`).join(', ')}
    </Callout>
  );
}

export function NewLeadButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useLeadFields();
  return (
    <DialogButton label={t('newLead')}>
      {(close) => (
        <FormDialog
          title={t('newLead')}
          submitLabel={t('save')}
          schema={CreateLead}
          fields={fields}
          aside={(values) => <Duplicates name={textOf(values.get('name'))} />}
          submit={(body) => browserCall(crm.createLead, { body })}
          success={t('saved')}
          invalidate={[crm.listLeads.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditLeadButton({ lead }: { readonly lead: Lead }): ReactNode {
  const t = useTranslations('forms');
  const fields = useLeadFields();
  if (!lead.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: lead.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: lead.name })}
          submitLabel={t('save')}
          schema={UpdateLead}
          fields={fields}
          initial={{
            name: lead.name,
            contactName: lead.contactName ?? '',
            email: lead.email ?? '',
            phone: lead.phone ?? '',
            source: lead.source,
            need: lead.need ?? '',
            ownerId: lead.owner.id,
            nextFollowUp: lead.nextFollowUp ?? '',
          }}
          submit={(body) =>
            browserCall(crm.updateLead, {
              params: { id: lead.id },
              body,
              ifMatch: `"${String(lead.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[crm.listLeads.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Clients ----------------------------------------------------------------------------------- */

function useClientFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  return [
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    { name: 'tin', label: t('fields.tin'), kind: 'text', nullable: true, hint: t('tinHint') },
    { name: 'bin', label: t('fields.bin'), kind: 'text', nullable: true },
    { name: 'paymentTermsDays', label: t('fields.paymentTerms'), kind: 'integer', required: true },
    { name: 'creditLimit', label: t('fields.creditLimit'), kind: 'money', nullable: true },
  ];
}

export function NewClientButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useClientFields();
  return (
    <DialogButton label={t('newClient')}>
      {(close) => (
        <FormDialog
          title={t('newClient')}
          submitLabel={t('save')}
          schema={CreateClientAccount}
          fields={fields}
          initial={{ paymentTermsDays: '30' }}
          aside={(values) => <Duplicates name={textOf(values.get('name'))} />}
          submit={(body) => browserCall(crm.createClient, { body })}
          success={t('saved')}
          invalidate={[crm.listClients.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditClientButton({ client }: { readonly client: ClientAccount }): ReactNode {
  const t = useTranslations('forms');
  const fields = useClientFields();
  if (!client.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: client.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: client.name })}
          submitLabel={t('save')}
          schema={UpdateClientAccount}
          fields={[...fields, { name: 'active', label: t('fields.active'), kind: 'checkbox' }]}
          initial={{
            name: client.name,
            tin: client.tin ?? '',
            bin: client.bin ?? '',
            paymentTermsDays: String(client.paymentTermsDays),
            creditLimit: client.creditLimit === null ? '' : typed(client.creditLimit),
            active: client.active,
          }}
          submit={(body) =>
            browserCall(crm.updateClient, {
              params: { id: client.id },
              body,
              ifMatch: `"${String(client.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[crm.listClients.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function AddContactButton({ client }: { readonly client: ClientAccount }): ReactNode {
  const t = useTranslations('forms');
  if (!client.allowedActions.includes('update')) return null;
  return (
    <DialogButton label={t('addContact')} size="sm" variant="secondary">
      {(close) => (
        <FormDialog
          title={t('addContactTo', { name: client.name })}
          submitLabel={t('save')}
          schema={CreateClientContact}
          fields={[
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            { name: 'role', label: t('fields.role'), kind: 'text', nullable: true },
            { name: 'email', label: t('fields.email'), kind: 'text', nullable: true },
            { name: 'phone', label: t('fields.phone'), kind: 'text', nullable: true },
            { name: 'primary', label: t('fields.primary'), kind: 'checkbox' },
          ]}
          submit={(body) => browserCall(crm.addClientContact, { params: { id: client.id }, body })}
          success={t('saved')}
          invalidate={[crm.listClientContacts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function LogActivityButton({ client }: { readonly client: ClientAccount }): ReactNode {
  const t = useTranslations('forms');
  const kinds = useTranslations('crm.activityKinds');
  if (!client.allowedActions.includes('update')) return null;
  return (
    <DialogButton label={t('logActivity')} size="sm" variant="secondary">
      {(close) => (
        <FormDialog
          title={t('logActivityFor', { name: client.name })}
          submitLabel={t('save')}
          schema={CreateSalesActivity}
          fields={[
            {
              name: 'kind',
              label: t('fields.kind'),
              kind: 'select',
              required: true,
              options: (['call', 'meeting', 'note', 'follow_up'] as const).map((value) => ({
                value,
                label: kinds(value),
              })),
            },
            { name: 'subject', label: t('fields.subject'), kind: 'text', required: true },
            { name: 'followUpOn', label: t('fields.followUpOn'), kind: 'date', nullable: true },
          ]}
          initial={{ kind: 'call' }}
          fixed={{ clientId: client.id, opportunityId: null }}
          submit={(body) => browserCall(crm.createActivity, { body })}
          success={t('saved')}
          invalidate={[crm.listActivities.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Pipeline ---------------------------------------------------------------------------------- */

function useDealFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const clients = useClientOptions();
  const owners = useUserOptions();
  const stages = useQuery({
    queryKey: [crm.listPipelineStages.id],
    queryFn: () => browserCall(crm.listPipelineStages, {}),
  });
  const open = (stages.data?.items ?? []).filter((stage) => !stage.closed);
  return [
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    {
      name: 'clientId',
      label: t('fields.client'),
      kind: 'select',
      required: true,
      options: clients,
    },
    {
      name: 'stageId',
      label: t('fields.stage'),
      kind: 'select',
      required: true,
      options: open.map((stage) => ({
        value: stage.id,
        label: `${stage.name} · ${stage.probabilityPercent}%`,
      })),
    },
    { name: 'value', label: t('fields.value'), kind: 'money', required: true },
    { name: 'ownerId', label: t('fields.owner'), kind: 'select', required: true, options: owners },
    { name: 'expectedCloseDate', label: t('fields.expectedClose'), kind: 'date', nullable: true },
  ];
}

export function NewDealButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useDealFields();
  return (
    <DialogButton label={t('newDeal')}>
      {(close) => (
        <FormDialog
          title={t('newDeal')}
          submitLabel={t('save')}
          schema={CreateOpportunity}
          fields={fields}
          note={t('probabilityByServer')}
          submit={(body) => browserCall(crm.createOpportunity, { body })}
          success={t('saved')}
          invalidate={[crm.listOpportunities.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditDealButton({ deal }: { readonly deal: Opportunity }): ReactNode {
  const t = useTranslations('forms');
  const fields = useDealFields();
  if (!deal.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: deal.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: deal.name })}
          submitLabel={t('save')}
          schema={UpdateOpportunity}
          fields={fields}
          initial={{
            name: deal.name,
            clientId: deal.clientId,
            stageId: deal.stageId,
            value: typed(deal.value),
            ownerId: deal.owner.id,
            expectedCloseDate: deal.expectedCloseDate ?? '',
          }}
          submit={(body) =>
            browserCall(crm.updateOpportunity, {
              params: { id: deal.id },
              body,
              ifMatch: `"${String(deal.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[crm.listOpportunities.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditStagesButton(): ReactNode {
  const t = useTranslations('forms');
  const stages = useQuery({
    queryKey: [crm.listPipelineStages.id],
    queryFn: () => browserCall(crm.listPipelineStages, {}),
  });
  const items = stages.data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <DialogButton label={t('editStages')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('editStages')}
          description={t('editStagesHint')}
          submitLabel={t('save')}
          schema={ReplacePipelineStages}
          fields={[
            {
              name: 'stages',
              label: t('fields.stages'),
              kind: 'lines',
              addLabel: t('addStage'),
              minRows: 2,
              fields: [
                { name: 'id', label: t('fields.id'), kind: 'hidden', nullable: true },
                { name: 'name', label: t('fields.name'), kind: 'text' },
                { name: 'probabilityPercent', label: t('fields.probability'), kind: 'decimal' },
              ],
            },
          ]}
          initial={{
            stages: items.map((stage) => ({
              id: stage.id,
              name: stage.name,
              probabilityPercent: stage.probabilityPercent,
            })),
          }}
          submit={(body) => browserCall(crm.replacePipelineStages, { body })}
          success={t('saved')}
          invalidate={[crm.listPipelineStages.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Quotations and contracts ------------------------------------------------------------------ */

function useQuotationFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const clients = useClientOptions();
  const deals = useList(crm.listOpportunities, {});
  return [
    {
      name: 'clientId',
      label: t('fields.client'),
      kind: 'select',
      required: true,
      options: clients,
    },
    {
      name: 'opportunityId',
      label: t('fields.deal'),
      kind: 'select',
      nullable: true,
      options: deals.items.map((deal) => ({ value: deal.id, label: deal.name })),
    },
    { name: 'title', label: t('fields.title'), kind: 'text', required: true },
    { name: 'date', label: t('fields.date'), kind: 'date', required: true },
    { name: 'validUntil', label: t('fields.validUntil'), kind: 'date', required: true },
    {
      name: 'discountPercent',
      label: t('fields.discountPercent'),
      kind: 'decimal',
      required: true,
    },
    {
      name: 'lines',
      label: t('fields.lines'),
      kind: 'lines',
      addLabel: t('addLine'),
      fields: [
        { name: 'description', label: t('fields.description'), kind: 'text' },
        { name: 'quantity', label: t('fields.quantity'), kind: 'decimal' },
        { name: 'unitPrice', label: t('fields.unitPrice'), kind: 'money' },
      ],
    },
  ];
}

export function NewQuotationButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useQuotationFields();
  return (
    <DialogButton label={t('newQuotation')}>
      {(close) => (
        <FormDialog
          title={t('newQuotation')}
          submitLabel={t('saveDraft')}
          schema={CreateQuotation}
          fields={fields}
          initial={{ date: today(), validUntil: inDays(30), discountPercent: '0' }}
          note={t('totalsByServer')}
          submit={(body) => browserCall(crm.createQuotation, { body })}
          success={t('saved')}
          invalidate={[crm.listQuotations.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditQuotationButton({ quote }: { readonly quote: Quotation }): ReactNode {
  const t = useTranslations('forms');
  const fields = useQuotationFields();
  if (!quote.allowedActions.includes('update')) return null;
  const name = quote.number ?? quote.title;
  return (
    <DialogButton label={t('edit')} ariaLabel={t('editLabel', { name })} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('editLabel', { name })}
          submitLabel={t('save')}
          schema={UpdateQuotation}
          fields={fields}
          initial={{
            clientId: quote.clientId,
            opportunityId: quote.opportunityId ?? '',
            title: quote.title,
            date: quote.date,
            validUntil: quote.validUntil,
            discountPercent: quote.discountPercent,
            lines: quote.lines.map((line) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: typed(line.unitPrice),
            })),
          }}
          note={t('totalsByServer')}
          submit={(body) =>
            browserCall(crm.updateQuotation, {
              params: { id: quote.id },
              body,
              ifMatch: `"${String(quote.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[crm.listQuotations.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

function useContractFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const clients = useClientOptions();
  return [
    {
      name: 'clientId',
      label: t('fields.client'),
      kind: 'select',
      required: true,
      options: clients,
    },
    { name: 'title', label: t('fields.title'), kind: 'text', required: true },
    { name: 'value', label: t('fields.value'), kind: 'money', required: true },
    { name: 'startDate', label: t('fields.startDate'), kind: 'date', required: true },
    { name: 'endDate', label: t('fields.endDate'), kind: 'date', nullable: true },
    { name: 'renewalDate', label: t('fields.renewalDate'), kind: 'date', nullable: true },
    {
      name: 'retentionPercent',
      label: t('fields.retentionPercent'),
      kind: 'decimal',
      required: true,
    },
    { name: 'warrantyEndDate', label: t('fields.warrantyEnd'), kind: 'date', nullable: true },
    { name: 'terms', label: t('fields.terms'), kind: 'textarea', nullable: true },
  ];
}

export function NewContractButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useContractFields();
  return (
    <DialogButton label={t('newContract')}>
      {(close) => (
        <FormDialog
          title={t('newContract')}
          submitLabel={t('save')}
          schema={CreateContract}
          fields={fields}
          initial={{ retentionPercent: '0', startDate: today() }}
          fixed={{ fileIds: [] }}
          submit={(body) => browserCall(crm.createContract, { body })}
          success={t('saved')}
          invalidate={[crm.listContracts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditContractButton({ contract }: { readonly contract: Contract }): ReactNode {
  const t = useTranslations('forms');
  const fields = useContractFields();
  if (!contract.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: contract.title })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: contract.title })}
          submitLabel={t('save')}
          schema={UpdateContract}
          fields={fields}
          initial={{
            clientId: contract.clientId,
            title: contract.title,
            value: typed(contract.value),
            startDate: contract.startDate,
            endDate: contract.endDate ?? '',
            renewalDate: contract.renewalDate ?? '',
            retentionPercent: contract.retentionPercent,
            warrantyEndDate: contract.warrantyEndDate ?? '',
            terms: contract.terms ?? '',
          }}
          submit={(body) =>
            browserCall(crm.updateContract, {
              params: { id: contract.id },
              body,
              ifMatch: `"${String(contract.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[crm.listContracts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Tenders ----------------------------------------------------------------------------------- */

const teamIds = (body: Record<string, unknown>) => ({
  ...body,
  teamUserIds: (body['teamUserIds'] as readonly { id: string }[]).map((row) => row.id),
});

function useTenderFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const users = useUserOptions();
  return [
    { name: 'title', label: t('fields.title'), kind: 'text', required: true },
    { name: 'procuringEntity', label: t('fields.procuringEntity'), kind: 'text', required: true },
    { name: 'egpId', label: t('fields.egpId'), kind: 'text', nullable: true },
    { name: 'method', label: t('fields.method'), kind: 'text', required: true },
    { name: 'estimatedValue', label: t('fields.estimatedValue'), kind: 'money', nullable: true },
    {
      name: 'submissionDeadline',
      label: t('fields.deadline'),
      kind: 'datetime',
      required: true,
      hint: t('dhakaTime'),
    },
    {
      name: 'internalDeadline',
      label: t('fields.internalDeadline'),
      kind: 'datetime',
      nullable: true,
    },
    {
      name: 'teamUserIds',
      label: t('fields.team'),
      kind: 'lines',
      addLabel: t('addPerson'),
      minRows: 0,
      fields: [{ name: 'id', label: t('fields.person'), kind: 'select', options: users }],
    },
  ];
}

export function NewTenderButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useTenderFields();
  return (
    <DialogButton label={t('newTender')}>
      {(close) => (
        <FormDialog
          title={t('newTender')}
          submitLabel={t('save')}
          schema={CreateTender}
          fields={fields}
          initial={{ method: 'OTM', teamUserIds: [] }}
          transform={teamIds}
          submit={(body) => browserCall(crm.createTender, { body })}
          success={t('saved')}
          invalidate={[crm.listTenders.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditTenderButton({ tender }: { readonly tender: Tender }): ReactNode {
  const t = useTranslations('forms');
  const fields = useTenderFields();
  if (!tender.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: tender.title })}
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: tender.title })}
          submitLabel={t('save')}
          schema={UpdateTender}
          fields={fields}
          initial={{
            title: tender.title,
            procuringEntity: tender.procuringEntity,
            egpId: tender.egpId ?? '',
            method: tender.method,
            estimatedValue: tender.estimatedValue === null ? '' : typed(tender.estimatedValue),
            submissionDeadline: dhakaInput(tender.submissionDeadline),
            internalDeadline: dhakaInput(tender.internalDeadline),
            teamUserIds: tender.team.map((person) => ({ id: person.id })),
          }}
          transform={teamIds}
          submit={(body) =>
            browserCall(crm.updateTender, {
              params: { id: tender.id },
              body,
              ifMatch: `"${String(tender.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[crm.listTenders.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function AwardTenderButton({ tender }: { readonly tender: Tender }): ReactNode {
  const t = useTranslations('forms');
  if (!tender.allowedActions.includes('award')) return null;
  return (
    <DialogButton label={t('award')} ariaLabel={t('awardLabel', { name: tender.title })}>
      {(close) => (
        <FormDialog
          title={t('awardLabel', { name: tender.title })}
          description={t('awardHint')}
          submitLabel={t('award')}
          schema={AwardTender}
          fields={[
            {
              name: 'contractValue',
              label: t('fields.contractValue'),
              kind: 'money',
              required: true,
            },
            { name: 'startDate', label: t('fields.startDate'), kind: 'date', required: true },
          ]}
          initial={{
            contractValue: tender.ourPrice === null ? '' : typed(tender.ourPrice),
            startDate: today(),
          }}
          submit={(body) =>
            browserCall(crm.awardTender, {
              params: { id: tender.id },
              body,
              ifMatch: `"${String(tender.meta.version)}"`,
            })
          }
          success={t('awarded')}
          invalidate={[crm.listTenders.id, crm.listContracts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditChecklistButton({
  tender,
  items,
}: {
  readonly tender: Tender;
  readonly items: readonly TenderChecklistItem[];
}): ReactNode {
  const t = useTranslations('forms');
  const users = useUserOptions();
  if (!tender.allowedActions.includes('update')) return null;
  return (
    <DialogButton label={t('editChecklist')} size="sm" variant="secondary">
      {(close) => (
        <FormDialog
          title={t('editChecklistFor', { name: tender.title })}
          submitLabel={t('save')}
          schema={ReplaceTenderChecklist}
          fields={[
            {
              name: 'items',
              label: t('fields.documents'),
              kind: 'lines',
              addLabel: t('addDocument'),
              minRows: 0,
              fields: [
                { name: 'id', label: t('fields.id'), kind: 'hidden', nullable: true },
                { name: 'document', label: t('fields.document'), kind: 'text' },
                {
                  name: 'ownerId',
                  label: t('fields.owner'),
                  kind: 'select',
                  nullable: true,
                  options: users,
                },
                { name: 'dueAt', label: t('fields.due'), kind: 'datetime', nullable: true },
                { name: 'done', label: t('fields.done'), kind: 'checkbox' },
                { name: 'fileId', label: t('fields.file'), kind: 'hidden', nullable: true },
              ],
            },
          ]}
          initial={{
            items: items.map((item) => ({
              id: item.id,
              document: item.document,
              ownerId: item.owner?.id ?? '',
              dueAt: dhakaInput(item.dueAt),
              done: item.done,
              fileId: item.fileId ?? '',
            })),
          }}
          submit={(body) =>
            browserCall(crm.replaceTenderChecklist, { params: { id: tender.id }, body })
          }
          success={t('saved')}
          invalidate={[crm.getTenderChecklist.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewGuaranteeButton(): ReactNode {
  const t = useTranslations('forms');
  const kinds = useTranslations('tenders.guaranteeKinds');
  const tenders = useList(crm.listTenders, {});
  const contracts = useList(crm.listContracts, {});
  return (
    <DialogButton label={t('newGuarantee')}>
      {(close) => (
        <FormDialog
          title={t('newGuarantee')}
          submitLabel={t('save')}
          schema={CreateGuarantee}
          fields={[
            {
              name: 'kind',
              label: t('fields.kind'),
              kind: 'select',
              required: true,
              options: (['bid_security', 'performance_guarantee', 'margin_money'] as const).map(
                (value) => ({
                  value,
                  label: kinds(value),
                }),
              ),
            },
            {
              name: 'tenderId',
              label: t('fields.tender'),
              kind: 'select',
              nullable: true,
              options: tenders.items.map((tender) => ({ value: tender.id, label: tender.title })),
            },
            {
              name: 'contractId',
              label: t('fields.contract'),
              kind: 'select',
              nullable: true,
              options: contracts.items.map((contract) => ({
                value: contract.id,
                label: contract.title,
              })),
            },
            { name: 'issuer', label: t('fields.issuer'), kind: 'text', required: true },
            { name: 'reference', label: t('fields.reference'), kind: 'text', required: true },
            { name: 'amount', label: t('fields.amount'), kind: 'money', required: true },
            { name: 'issuedOn', label: t('fields.issuedOn'), kind: 'date', required: true },
            { name: 'expiresOn', label: t('fields.expiresOn'), kind: 'date', nullable: true },
          ]}
          initial={{ kind: 'bid_security', issuedOn: today() }}
          submit={(body) => browserCall(crm.createGuarantee, { body })}
          success={t('saved')}
          invalidate={[crm.listGuarantees.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Standard documents ------------------------------------------------------------------------ */

export function NewStandardDocumentButton(): ReactNode {
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
        {t('newStandardDocument')}
      </Button>
      {open && (
        <StandardDocumentDialog
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function StandardDocumentDialog({ onClose }: { readonly onClose: () => void }): ReactNode {
  const t = useTranslations('forms');
  const common = useTranslations('common');
  const uploadError = useUploadError();
  const [name, setName] = useState('');
  const [expiresOn, setExpiresOn] = useState<string | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const save = useCommand(
    async (file: File) => {
      const stored = await uploadFile(file, null);
      const result = CreateStandardDocument.safeParse({
        name: name.trim(),
        fileId: stored.id,
        expiresOn,
      });
      if (!result.success) throw new Error(result.error.message);
      return browserCall(crm.createStandardDocument, { body: result.data });
    },
    { success: t('saved'), invalidate: [crm.listStandardDocuments.id], onSuccess: onClose },
  );
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t('newStandardDocument')}
      description={t('standardDocumentHint')}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            loading={save.isPending}
            disabled={picked === null}
            onClick={() => {
              const found = fieldErrors(
                CreateStandardDocument.omit({ fileId: true }).safeParse({
                  name: name.trim(),
                  expiresOn,
                }),
              );
              setErrors(found);
              if (found.size === 0 && picked !== null) save.mutate(picked);
            }}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {save.isError && <Callout tone="crit" title={uploadError(save.error)} />}
        <Field
          label={t('fields.name')}
          required
          requiredLabel={common('required')}
          {...errorFor(errors, 'name')}
        >
          {(control) => (
            <Input
              {...control}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          )}
        </Field>
        <Field label={t('fields.expiresOn')}>
          {(control) => (
            <DateInput
              {...control}
              value={expiresOn}
              onChange={setExpiresOn}
              placeholder={t('chooseDate')}
            />
          )}
        </Field>
        <FilePicker label={t('fields.file')} onPick={setPicked} />
      </div>
    </Dialog>
  );
}

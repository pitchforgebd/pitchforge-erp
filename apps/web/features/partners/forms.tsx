'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import {
  CreateEquityVersion,
  CreatePartner,
  CreatePartnerTransaction,
  PartnerTransactionType,
  ReverseDistributionRun,
  UpdatePartner,
  UpdatePartnerTransaction,
  accountingEndpoints as accounting,
  partnersEndpoints as partnersApi,
} from '@pitchforge/contracts';
import type { DistributionRun, Partner, PartnerTransaction } from '@pitchforge/contracts';

import { browserCall } from '../../lib/api/browser.ts';
import { DialogButton, FormDialog } from '../common/form-dialog.tsx';
import type { FormSpec } from '../common/form-dialog.tsx';
import { useList } from '../common/use-list.ts';
import { typed } from '../finance/forms.tsx';

export function NewPartnerButton(): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('newPartner')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newPartner')}
          description={t('newPartnerHint')}
          submitLabel={t('save')}
          schema={CreatePartner}
          fields={[{ name: 'name', label: t('fields.name'), kind: 'text', required: true }]}
          fixed={{ userId: null }}
          note={t('stepUpNote')}
          submit={(body) => browserCall(partnersApi.createPartner, { body })}
          success={t('saved')}
          invalidate={[partnersApi.listPartners.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditPartnerButton({ partner }: { readonly partner: Partner }): ReactNode {
  const t = useTranslations('forms');
  if (!partner.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: partner.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: partner.name })}
          submitLabel={t('save')}
          schema={UpdatePartner}
          fields={[
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            { name: 'active', label: t('fields.active'), kind: 'checkbox' },
          ]}
          initial={{ name: partner.name, active: partner.active }}
          note={t('stepUpNote')}
          submit={(body) =>
            browserCall(partnersApi.updatePartner, {
              params: { id: partner.id },
              body,
              ifMatch: `"${String(partner.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[partnersApi.listPartners.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewEquityVersionButton(): ReactNode {
  const t = useTranslations('forms');
  const partners = useList(partnersApi.listPartners, {});
  const options = partners.items.map((partner) => ({ value: partner.id, label: partner.name }));
  return (
    <DialogButton label={t('newEquity')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newEquity')}
          description={t('newEquityHint')}
          submitLabel={t('save')}
          schema={CreateEquityVersion}
          fields={[
            { name: 'validFrom', label: t('fields.validFrom'), kind: 'date', required: true },
            {
              name: 'shares',
              label: t('fields.shares'),
              kind: 'lines',
              addLabel: t('addPartner'),
              fields: [
                { name: 'partnerId', label: t('fields.partner'), kind: 'select', options },
                { name: 'percent', label: t('fields.percent'), kind: 'decimal' },
              ],
            },
            { name: 'reason', label: t('fields.reason'), kind: 'textarea', required: true },
          ]}
          initial={{
            shares: partners.items.map((partner) => ({
              partnerId: partner.id,
              percent: partner.equityPercent,
            })),
          }}
          note={t('stepUpNote')}
          submit={(body) => browserCall(partnersApi.createEquityVersion, { body })}
          success={t('saved')}
          invalidate={[partnersApi.listEquityVersions.id, partnersApi.listPartners.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

function useTransactionFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const types = useTranslations('partners.types');
  const partners = useList(partnersApi.listPartners, {});
  const banks = useList(accounting.listBankAccounts, {});
  return [
    {
      name: 'partnerId',
      label: t('fields.partner'),
      kind: 'select',
      required: true,
      options: partners.items.map((partner) => ({ value: partner.id, label: partner.name })),
    },
    {
      name: 'type',
      label: t('fields.type'),
      kind: 'select',
      required: true,
      options: PartnerTransactionType.options.map((value) => ({ value, label: types(value) })),
    },
    { name: 'date', label: t('fields.date'), kind: 'date', required: true },
    { name: 'amount', label: t('fields.amount'), kind: 'money', required: true },
    {
      name: 'bankAccountId',
      label: t('fields.bankAccount'),
      kind: 'select',
      nullable: true,
      options: banks.items.map((bank) => ({ value: bank.id, label: bank.name })),
    },
    { name: 'note', label: t('fields.note'), kind: 'textarea', nullable: true },
  ];
}

export function NewPartnerTransactionButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useTransactionFields();
  return (
    <DialogButton label={t('newPartnerTransaction')}>
      {(close) => (
        <FormDialog
          title={t('newPartnerTransaction')}
          submitLabel={t('saveDraft')}
          schema={CreatePartnerTransaction}
          fields={fields}
          initial={{ date: '2026-11-20' }}
          note={t('withdrawableNote')}
          submit={(body) => browserCall(partnersApi.createPartnerTransaction, { body })}
          success={t('saved')}
          invalidate={[partnersApi.listPartnerTransactions.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditPartnerTransactionButton({
  transaction,
}: {
  readonly transaction: PartnerTransaction;
}): ReactNode {
  const t = useTranslations('forms');
  const fields = useTransactionFields();
  if (!transaction.allowedActions.includes('update')) return null;
  const name = transaction.number ?? transaction.partner.name;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name })}
          submitLabel={t('save')}
          schema={UpdatePartnerTransaction}
          fields={fields}
          initial={{
            partnerId: transaction.partner.id,
            type: transaction.type,
            date: transaction.date,
            amount: typed(transaction.amount),
            bankAccountId: transaction.bankAccountId ?? '',
            note: transaction.note ?? '',
          }}
          submit={(body) =>
            browserCall(partnersApi.updatePartnerTransaction, {
              params: { id: transaction.id },
              body,
              ifMatch: `"${String(transaction.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[partnersApi.listPartnerTransactions.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function ReverseDistributionButton({ run }: { readonly run: DistributionRun }): ReactNode {
  const t = useTranslations('forms');
  if (!run.allowedActions.includes('reverse')) return null;
  const name = run.number ?? '';
  return (
    <DialogButton
      label={t('reverse')}
      ariaLabel={t('reverseLabel', { name })}
      size="sm"
      variant="danger"
    >
      {(close) => (
        <FormDialog
          title={t('reverseLabel', { name })}
          description={t('reverseHint')}
          submitLabel={t('reverse')}
          danger
          schema={ReverseDistributionRun}
          fields={[
            { name: 'reversalDate', label: t('fields.date'), kind: 'date', required: true },
            { name: 'reason', label: t('fields.reason'), kind: 'textarea', required: true },
          ]}
          initial={{ reversalDate: '2026-11-20' }}
          note={t('stepUpNote')}
          submit={(body) =>
            browserCall(partnersApi.reverseDistributionRun, {
              params: { id: run.id },
              body,
              ifMatch: `"${String(run.meta.version)}"`,
            })
          }
          success={t('reversed')}
          invalidate={[partnersApi.listDistributionRuns.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

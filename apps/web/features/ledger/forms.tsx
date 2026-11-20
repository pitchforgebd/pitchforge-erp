'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import {
  AccountType,
  CloseFiscalYear,
  CreateAccount,
  CreateExchangeRate,
  CreatePostingRuleVersion,
  CreateTaxCode,
  CreateWithholdingRule,
  UpdateAccount,
  accountingEndpoints as accounting,
} from '@pitchforge/contracts';
import type { Account } from '@pitchforge/contracts';

import { browserCall } from '../../lib/api/browser.ts';
import { DialogButton, FormDialog } from '../common/form-dialog.tsx';
import { useList } from '../common/use-list.ts';

function useAccountOptions(by: 'id' | 'code') {
  const accounts = useList(accounting.listAccounts, { limit: 200 });
  return accounts.items.map((account) => ({
    value: by === 'id' ? account.id : account.code,
    label: `${account.code} · ${account.name}`,
  }));
}

export function NewAccountButton(): ReactNode {
  const t = useTranslations('forms');
  const types = useTranslations('ledger.accountTypes');
  const parents = useAccountOptions('id');
  return (
    <DialogButton label={t('newAccount')}>
      {(close) => (
        <FormDialog
          title={t('newAccount')}
          submitLabel={t('save')}
          schema={CreateAccount}
          fields={[
            { name: 'code', label: t('fields.code'), kind: 'text', required: true },
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            {
              name: 'type',
              label: t('fields.type'),
              kind: 'select',
              required: true,
              options: AccountType.options.map((value) => ({ value, label: types(value) })),
            },
            {
              name: 'parentId',
              label: t('fields.parent'),
              kind: 'select',
              nullable: true,
              options: parents,
            },
          ]}
          submit={(body) => browserCall(accounting.createAccount, { body })}
          success={t('saved')}
          invalidate={[accounting.listAccounts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditAccountButton({ account }: { readonly account: Account }): ReactNode {
  const t = useTranslations('forms');
  const parents = useAccountOptions('id').filter((option) => option.value !== account.id);
  if (!account.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: `${account.code} ${account.name}` })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: `${account.code} ${account.name}` })}
          submitLabel={t('save')}
          schema={UpdateAccount}
          fields={[
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            {
              name: 'parentId',
              label: t('fields.parent'),
              kind: 'select',
              nullable: true,
              options: parents,
            },
            ...(account.allowedActions.includes('deactivate')
              ? [{ name: 'active', label: t('fields.active'), kind: 'checkbox' as const }]
              : []),
          ]}
          initial={{ name: account.name, parentId: account.parentId ?? '', active: account.active }}
          submit={(body) =>
            browserCall(accounting.updateAccount, {
              params: { id: account.id },
              body,
              ifMatch: `"${String(account.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[accounting.listAccounts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewExchangeRateButton(): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('newRate')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newRate')}
          submitLabel={t('save')}
          schema={CreateExchangeRate}
          fields={[
            {
              name: 'currency',
              label: t('fields.currency'),
              kind: 'select',
              required: true,
              options: ['USD', 'EUR', 'GBP', 'INR', 'SGD', 'MYR', 'AED', 'CNY', 'JPY'].map(
                (value) => ({
                  value,
                  label: value,
                }),
              ),
            },
            { name: 'date', label: t('fields.date'), kind: 'date', required: true },
            { name: 'rate', label: t('fields.rateToBdt'), kind: 'decimal', required: true },
          ]}
          submit={(body) => browserCall(accounting.createExchangeRate, { body })}
          success={t('saved')}
          invalidate={[accounting.listExchangeRates.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewTaxCodeButton(): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('newTaxCode')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newTaxCode')}
          description={t('versionHint')}
          submitLabel={t('save')}
          schema={CreateTaxCode}
          fields={[
            { name: 'code', label: t('fields.code'), kind: 'text', required: true },
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            {
              name: 'rate',
              label: t('fields.rate'),
              kind: 'decimal',
              required: true,
              hint: t('rateHint'),
            },
            { name: 'validFrom', label: t('fields.validFrom'), kind: 'date', required: true },
          ]}
          note={t('stepUpNote')}
          submit={(body) => browserCall(accounting.createTaxCode, { body })}
          success={t('saved')}
          invalidate={[accounting.listTaxCodes.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewWithholdingRuleButton(): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('newWithholdingRule')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newWithholdingRule')}
          description={t('versionHint')}
          submitLabel={t('save')}
          schema={CreateWithholdingRule}
          fields={[
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
            { name: 'category', label: t('fields.category'), kind: 'text', required: true },
            {
              name: 'rate',
              label: t('fields.rate'),
              kind: 'decimal',
              required: true,
              hint: t('rateHint'),
            },
            { name: 'threshold', label: t('fields.threshold'), kind: 'money', nullable: true },
            { name: 'validFrom', label: t('fields.validFrom'), kind: 'date', required: true },
          ]}
          note={t('stepUpNote')}
          submit={(body) => browserCall(accounting.createWithholdingRule, { body })}
          success={t('saved')}
          invalidate={[accounting.listWithholdingRules.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewPostingRuleButton(): ReactNode {
  const t = useTranslations('forms');
  const accounts = useAccountOptions('id');
  return (
    <DialogButton label={t('newPostingRule')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newPostingRule')}
          description={t('versionHint')}
          submitLabel={t('save')}
          schema={CreatePostingRuleVersion}
          fields={[
            {
              name: 'sourceType',
              label: t('fields.sourceType'),
              kind: 'text',
              required: true,
              hint: t('sourceTypeHint'),
            },
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            { name: 'validFrom', label: t('fields.validFrom'), kind: 'date', required: true },
            {
              name: 'lines',
              label: t('fields.lines'),
              kind: 'lines',
              addLabel: t('addLine'),
              minRows: 2,
              fields: [
                {
                  name: 'side',
                  label: t('fields.side'),
                  kind: 'select',
                  options: [
                    { value: 'debit', label: t('debit') },
                    { value: 'credit', label: t('credit') },
                  ],
                },
                {
                  name: 'accountId',
                  label: t('fields.account'),
                  kind: 'select',
                  options: accounts,
                },
                { name: 'amountField', label: t('fields.amountField'), kind: 'text' },
              ],
            },
          ]}
          note={t('stepUpNote')}
          submit={(body) => browserCall(accounting.createPostingRuleVersion, { body })}
          success={t('saved')}
          invalidate={[accounting.listPostingRules.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/** Closing a year moves its profit to retained earnings; only Partners do it. */
export function CloseYearButton(): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('closeYear')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('closeYear')}
          description={t('closeYearHint')}
          submitLabel={t('closeYear')}
          danger
          schema={CloseFiscalYear}
          fields={[
            {
              name: 'fiscalYearCode',
              label: t('fields.fiscalYear'),
              kind: 'select',
              required: true,
              options: [{ value: '2526', label: '2025–26' }],
            },
          ]}
          initial={{ fiscalYearCode: '2526' }}
          note={t('stepUpNote')}
          submit={(body) => browserCall(accounting.closeFiscalYear, { body })}
          success={t('yearClosed')}
          invalidate={[accounting.listFiscalPeriods.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

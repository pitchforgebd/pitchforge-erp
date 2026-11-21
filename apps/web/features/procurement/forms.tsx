'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import {
  AssignAsset,
  CreateAsset,
  CreateDepositGiven,
  CreateLicence,
  CreatePurchaseOrder,
  CreateVendor,
  DepreciationMethod,
  UpdateAsset,
  UpdateLicence,
  UpdatePurchaseOrder,
  UpdateVendor,
  hrEndpoints as hr,
  procurementEndpoints as prc,
} from '@pitchforge/contracts';
import type { Asset, Licence, PurchaseOrder, Vendor } from '@pitchforge/contracts';

import { browserCall } from '../../lib/api/browser.ts';
import { today } from '../common/dates.ts';
import { DialogButton, FormDialog } from '../common/form-dialog.tsx';
import type { FormSpec } from '../common/form-dialog.tsx';
import { useList } from '../common/use-list.ts';
import { typed } from '../finance/forms.tsx';

/** Drop the fields left empty, so an edit keeps what is stored instead of clearing it. */
const withoutEmpty = (body: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(body).filter(([, value]) => value !== null));

/* Vendors ----------------------------------------------------------------------------------- */

function useVendorFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  return [
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    { name: 'tin', label: t('fields.tin'), kind: 'text', nullable: true, hint: t('tinHint') },
    { name: 'bin', label: t('fields.bin'), kind: 'text', nullable: true },
    {
      name: 'withholdingCategory',
      label: t('fields.withholdingCategory'),
      kind: 'text',
      nullable: true,
    },
    { name: 'bankAccountNumber', label: t('fields.accountNumber'), kind: 'text', nullable: true },
  ];
}

export function NewVendorButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useVendorFields();
  return (
    <DialogButton label={t('newVendor')}>
      {(close) => (
        <FormDialog
          title={t('newVendor')}
          submitLabel={t('save')}
          schema={CreateVendor}
          fields={fields}
          submit={(body) => browserCall(prc.createVendor, { body })}
          success={t('saved')}
          invalidate={[prc.listVendors.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditVendorButton({ vendor }: { readonly vendor: Vendor }): ReactNode {
  const t = useTranslations('forms');
  const fields = useVendorFields();
  if (!vendor.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: vendor.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: vendor.name })}
          description={t('bankKeptHint')}
          submitLabel={t('save')}
          schema={UpdateVendor}
          fields={[...fields, { name: 'active', label: t('fields.active'), kind: 'checkbox' }]}
          initial={{
            name: vendor.name,
            tin: vendor.tin ?? '',
            bin: vendor.bin ?? '',
            withholdingCategory: vendor.withholdingCategory ?? '',
            active: vendor.active,
          }}
          transform={withoutEmpty}
          note={t('stepUpNote')}
          submit={(body) =>
            browserCall(prc.updateVendor, {
              params: { id: vendor.id },
              body,
              ifMatch: `"${String(vendor.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[prc.listVendors.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Purchase orders --------------------------------------------------------------------------- */

function useOrderFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const vendors = useList(prc.listVendors, {});
  const requisitions = useList(prc.listRequisitions, { status: 'approved' });
  return [
    {
      name: 'vendorId',
      label: t('fields.vendor'),
      kind: 'select',
      required: true,
      options: vendors.items.map((vendor) => ({ value: vendor.id, label: vendor.name })),
    },
    {
      name: 'requisitionId',
      label: t('fields.requisition'),
      kind: 'select',
      nullable: true,
      options: requisitions.items.map((row) => ({
        value: row.id,
        label: `${row.number ?? ''} · ${row.purpose}`,
      })),
    },
    { name: 'date', label: t('fields.date'), kind: 'date', required: true },
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

export function NewOrderButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useOrderFields();
  return (
    <DialogButton label={t('newOrder')}>
      {(close) => (
        <FormDialog
          title={t('newOrder')}
          submitLabel={t('saveDraft')}
          schema={CreatePurchaseOrder}
          fields={fields}
          initial={{ date: today() }}
          note={t('totalsByServer')}
          submit={(body) => browserCall(prc.createPurchaseOrder, { body })}
          success={t('saved')}
          invalidate={[prc.listPurchaseOrders.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditOrderButton({ order }: { readonly order: PurchaseOrder }): ReactNode {
  const t = useTranslations('forms');
  const fields = useOrderFields();
  if (!order.allowedActions.includes('update')) return null;
  const name = order.number ?? order.vendorName;
  return (
    <DialogButton label={t('edit')} ariaLabel={t('editLabel', { name })} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('editLabel', { name })}
          submitLabel={t('save')}
          schema={UpdatePurchaseOrder}
          fields={fields}
          initial={{
            vendorId: order.vendorId,
            requisitionId: order.requisitionId ?? '',
            date: order.date,
            lines: order.lines.map((line) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: typed(line.unitPrice),
            })),
          }}
          note={t('totalsByServer')}
          submit={(body) =>
            browserCall(prc.updatePurchaseOrder, {
              params: { id: order.id },
              body,
              ifMatch: `"${String(order.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[prc.listPurchaseOrders.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Assets ------------------------------------------------------------------------------------ */

function useAssetFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  return [
    { name: 'tag', label: t('fields.tag'), kind: 'text', required: true },
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    { name: 'category', label: t('fields.category'), kind: 'text', required: true },
    { name: 'purchasedOn', label: t('fields.purchasedOn'), kind: 'date', required: true },
    { name: 'cost', label: t('fields.cost'), kind: 'money', required: true },
    {
      name: 'method',
      label: t('fields.method'),
      kind: 'select',
      required: true,
      options: DepreciationMethod.options.map((value) => ({ value, label: t(`methods.${value}`) })),
    },
    {
      name: 'annualRate',
      label: t('fields.annualRate'),
      kind: 'decimal',
      required: true,
      hint: t('rateHint'),
    },
  ];
}

export function NewAssetButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useAssetFields();
  return (
    <DialogButton label={t('newAsset')}>
      {(close) => (
        <FormDialog
          title={t('newAsset')}
          submitLabel={t('save')}
          schema={CreateAsset}
          fields={fields}
          initial={{ method: 'straight_line', purchasedOn: today() }}
          submit={(body) => browserCall(prc.createAsset, { body })}
          success={t('saved')}
          invalidate={[prc.listAssets.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function AssetActions({ asset }: { readonly asset: Asset }): ReactNode {
  const t = useTranslations('forms');
  const fields = useAssetFields().filter(
    (field) => field.name !== 'cost' && field.name !== 'purchasedOn',
  );
  const employees = useList(hr.listEmployees, { status: 'active' });
  const ifMatch = `"${String(asset.meta.version)}"`;
  return (
    <span className="flex justify-end gap-2">
      {asset.allowedActions.includes('update') && (
        <DialogButton
          label={t('edit')}
          ariaLabel={t('editLabel', { name: asset.tag })}
          size="sm"
          variant="secondary"
        >
          {(close) => (
            <FormDialog
              title={t('editLabel', { name: asset.tag })}
              submitLabel={t('save')}
              schema={UpdateAsset}
              fields={fields}
              initial={{
                tag: asset.tag,
                name: asset.name,
                category: asset.category,
                method: asset.method,
                annualRate: asset.annualRate,
              }}
              submit={(body) =>
                browserCall(prc.updateAsset, { params: { id: asset.id }, body, ifMatch })
              }
              success={t('saved')}
              invalidate={[prc.listAssets.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
      {asset.allowedActions.includes('assign') && (
        <DialogButton
          label={t('assign')}
          ariaLabel={t('assignLabel', { name: asset.tag })}
          size="sm"
        >
          {(close) => (
            <FormDialog
              title={t('assignLabel', { name: asset.tag })}
              description={asset.name}
              submitLabel={t('assign')}
              schema={AssignAsset}
              fields={[
                {
                  name: 'employeeId',
                  label: t('fields.employee'),
                  kind: 'select',
                  required: true,
                  options: employees.items.map((employee) => ({
                    value: employee.id,
                    label: employee.name,
                  })),
                },
              ]}
              submit={(body) =>
                browserCall(prc.assignAsset, { params: { id: asset.id }, body, ifMatch })
              }
              success={t('assigned')}
              invalidate={[prc.listAssets.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
    </span>
  );
}

/* Renewals and deposits --------------------------------------------------------------------- */

function useLicenceFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const vendors = useList(prc.listVendors, {});
  return [
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    {
      name: 'kind',
      label: t('fields.kind'),
      kind: 'select',
      required: true,
      options: (['licence', 'subscription', 'domain'] as const).map((value) => ({
        value,
        label: t(`licenceKinds.${value}`),
      })),
    },
    {
      name: 'vendorId',
      label: t('fields.vendor'),
      kind: 'select',
      nullable: true,
      options: vendors.items.map((vendor) => ({ value: vendor.id, label: vendor.name })),
    },
    { name: 'cost', label: t('fields.cost'), kind: 'money', required: true },
    { name: 'renewsOn', label: t('fields.renewsOn'), kind: 'date', required: true },
  ];
}

export function NewLicenceButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useLicenceFields();
  return (
    <DialogButton label={t('newLicence')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newLicence')}
          submitLabel={t('save')}
          schema={CreateLicence}
          fields={fields}
          initial={{ kind: 'subscription' }}
          submit={(body) => browserCall(prc.createLicence, { body })}
          success={t('saved')}
          invalidate={[prc.listLicences.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditLicenceButton({ licence }: { readonly licence: Licence }): ReactNode {
  const t = useTranslations('forms');
  const fields = useLicenceFields();
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: licence.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: licence.name })}
          submitLabel={t('save')}
          schema={UpdateLicence}
          fields={fields}
          initial={{
            name: licence.name,
            kind: licence.kind,
            vendorId: licence.vendorId ?? '',
            cost: typed(licence.cost),
            renewsOn: licence.renewsOn,
          }}
          submit={(body) =>
            browserCall(prc.updateLicence, {
              params: { id: licence.id },
              body,
              ifMatch: `"${String(licence.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[prc.listLicences.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewDepositButton(): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('newDeposit')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newDeposit')}
          submitLabel={t('save')}
          schema={CreateDepositGiven}
          fields={[
            {
              name: 'kind',
              label: t('fields.kind'),
              kind: 'select',
              required: true,
              options: [
                { value: 'deposit', label: t('depositKinds.deposit') },
                { value: 'guarantee', label: t('depositKinds.guarantee') },
              ],
            },
            { name: 'party', label: t('fields.party'), kind: 'text', required: true },
            { name: 'purpose', label: t('fields.purpose'), kind: 'text', required: true },
            { name: 'amount', label: t('fields.amount'), kind: 'money', required: true },
            { name: 'givenOn', label: t('fields.givenOn'), kind: 'date', required: true },
            { name: 'expiresOn', label: t('fields.expiresOn'), kind: 'date', nullable: true },
          ]}
          initial={{ kind: 'deposit', givenOn: today() }}
          submit={(body) => browserCall(prc.createDepositGiven, { body })}
          success={t('saved')}
          invalidate={[prc.listDepositsGiven.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { CreateRequisition, procurementEndpoints as prc } from '@pitchforge/contracts';
import type { Asset, DepreciationRun, PurchaseOrder, Requisition } from '@pitchforge/contracts';
import {
  Button,
  Callout,
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

import { browserCall } from '../../lib/api/browser.ts';
import { today } from '../common/dates.ts';
import { useErrorMessage } from '../common/errors.ts';
import { PdfButton } from '../common/files.tsx';
import { errorFor, fieldErrors } from '../common/form-errors.ts';
import { moneyFromInput } from '../common/money-input.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { Details, RecordTable } from '../common/record-table.tsx';
import { useCan, useCanRead } from '../common/session.tsx';
import { ForbiddenState } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';
import { FlowStatusPill, MonthText } from '../hr/status.tsx';

import {
  AssetActions,
  EditLicenceButton,
  EditOrderButton,
  EditVendorButton,
  NewAssetButton,
  NewDepositButton,
  NewLicenceButton,
  NewOrderButton,
  NewVendorButton,
} from './forms.tsx';

function RequisitionDialog({ onClose }: { readonly onClose: () => void }): ReactNode {
  const t = useTranslations('procurement');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const body = {
    departmentId: null,
    projectId: null,
    purpose: purpose.trim(),
    lines: [
      {
        description: description.trim(),
        quantity: quantity.trim(),
        estimatedUnitPrice: moneyFromInput(price) ?? { amount: '', currency: 'BDT' as const },
      },
    ],
  };
  const create = useCommand(() => browserCall(prc.createRequisition, { body }), {
    success: t('requisitionDrafted'),
    invalidate: [prc.listRequisitions.id],
    onSuccess: onClose,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('newRequisition')}
      description={t('newRequisitionHint')}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            loading={create.isPending}
            onClick={() => {
              const found = fieldErrors(CreateRequisition.safeParse(body));
              setErrors(found);
              if (found.size === 0) create.mutate(undefined);
            }}
          >
            {t('saveDraft')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {create.isError && <Callout tone="crit" title={message(create.error)} />}
        <Field
          label={t('purpose')}
          required
          requiredLabel={common('required')}
          {...errorFor(errors, 'purpose')}
        >
          {(control) => (
            <Input
              {...control}
              value={purpose}
              onChange={(event) => {
                setPurpose(event.target.value);
              }}
            />
          )}
        </Field>
        <Field
          label={t('item')}
          required
          requiredLabel={common('required')}
          {...errorFor(errors, 'lines.0.description')}
        >
          {(control) => (
            <Input
              {...control}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
            />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t('quantity')}
            required
            requiredLabel={common('required')}
            {...errorFor(errors, 'lines.0.quantity')}
          >
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                }}
              />
            )}
          </Field>
          <Field
            label={t('unitPrice')}
            required
            requiredLabel={common('required')}
            {...errorFor(errors, 'lines.0.estimatedUnitPrice.amount')}
          >
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value);
                }}
              />
            )}
          </Field>
        </div>
        <p className="text-xs text-muted">{t('totalByServer')}</p>
      </div>
    </Dialog>
  );
}

function RequisitionsTab(): ReactNode {
  const t = useTranslations('procurement');
  const message = useErrorMessage();
  const requisitions = useList(prc.listRequisitions, {});
  const [drafting, setDrafting] = useState(false);
  const submit = useCommand(
    (row: Requisition) =>
      browserCall(prc.submitRequisition, {
        params: { id: row.id },
        ifMatch: `"${String(row.meta.version)}"`,
      }),
    { success: t('requisitionSubmitted'), invalidate: [prc.listRequisitions.id] },
  );
  return (
    <div className="flex flex-col gap-3">
      {submit.isError && <Callout tone="crit" title={message(submit.error)} />}
      <RecordTable
        label={t('requisitions')}
        list={requisitions}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{t('requisitionsHint')}</p>
            <Button
              onClick={() => {
                setDrafting(true);
              }}
            >
              {t('newRequisition')}
            </Button>
          </div>
        }
        columns={[
          { id: 'number', header: t('requisition'), cell: (row) => row.number ?? t('draft') },
          { id: 'by', header: t('requestedBy'), cell: (row) => row.requestedBy.name },
          { id: 'purpose', header: t('purpose'), cell: (row) => row.purpose },
          {
            id: 'total',
            header: t('estimate'),
            align: 'right',
            cell: (row) => <Money value={row.estimatedTotal} />,
          },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => <FlowStatusPill status={row.status} />,
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) =>
              row.allowedActions.includes('submit') ? (
                <Button
                  size="sm"
                  aria-label={t('submitRequisitionLabel', { purpose: row.purpose })}
                  onClick={() => {
                    submit.mutate(row);
                  }}
                >
                  {t('submit')}
                </Button>
              ) : null,
          },
        ]}
      />
      {drafting && (
        <RequisitionDialog
          onClose={() => {
            setDrafting(false);
          }}
        />
      )}
    </div>
  );
}

function OrderDialog({
  order,
  onClose,
}: {
  readonly order: PurchaseOrder;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('procurement');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const ifMatch = `"${String(order.meta.version)}"`;
  const firstLine = order.lines[0];
  const [received, setReceived] = useState(firstLine?.quantity ?? '1');
  const submit = useCommand(
    () => browserCall(prc.submitPurchaseOrder, { params: { id: order.id }, ifMatch }),
    {
      success: t('orderSubmitted'),
      invalidate: [prc.listPurchaseOrders.id],
      onSuccess: onClose,
    },
  );
  const amend = useCommand(
    () => browserCall(prc.amendPurchaseOrder, { params: { id: order.id }, ifMatch }),
    {
      success: t('orderAmended'),
      invalidate: [prc.listPurchaseOrders.id],
      onSuccess: onClose,
    },
  );
  const receive = useCommand(
    () =>
      browserCall(prc.createGoodsReceipt, {
        body: {
          purchaseOrderId: order.id,
          receivedOn: today(),
          lines: [{ description: firstLine?.description ?? '', quantity: received.trim() }],
        },
      }),
    {
      success: t('goodsReceived'),
      invalidate: [prc.listGoodsReceipts.id, prc.listPurchaseOrders.id],
      onSuccess: onClose,
    },
  );
  const failed = submit.error ?? amend.error ?? receive.error;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={order.number ?? t('draftOrder')}
      description={order.vendorName}
      closeLabel={common('close')}
      footer={
        <>
          {order.number !== null && (
            <PdfButton
              template="purchase_order"
              record={{ recordType: 'purchase_order', recordId: order.id }}
            />
          )}
          <EditOrderButton order={order} />
          {order.allowedActions.includes('amend') && (
            <Button
              variant="secondary"
              loading={amend.isPending}
              onClick={() => {
                amend.mutate(undefined);
              }}
            >
              {t('amend')}
            </Button>
          )}
          {order.allowedActions.includes('submit') && (
            <Button
              loading={submit.isPending}
              onClick={() => {
                submit.mutate(undefined);
              }}
            >
              {t('submit')}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {failed !== null && <Callout tone="crit" title={message(failed)} />}
        <Details
          items={[
            [t('date'), <DateText key="d" value={order.date} />],
            [t('status'), <FlowStatusPill key="s" status={order.status} />],
            [t('amendment'), order.amendment],
            [t('total'), <Money key="t" value={order.total} />],
          ]}
        />
        <ul className="flex flex-col gap-1 text-sm">
          {order.lines.map((line) => (
            <li key={line.description} className="flex flex-wrap justify-between gap-2">
              <span>
                {line.quantity} × {line.description}
              </span>
              <Money value={line.unitPrice} />
            </li>
          ))}
        </ul>
        {order.allowedActions.includes('receive') && (
          <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <Field label={t('quantityReceived')}>
              {(control) => (
                <Input
                  {...control}
                  inputMode="decimal"
                  value={received}
                  onChange={(event) => {
                    setReceived(event.target.value);
                  }}
                />
              )}
            </Field>
            <Button
              loading={receive.isPending}
              onClick={() => {
                receive.mutate(undefined);
              }}
            >
              {t('recordReceipt')}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function OrdersTab(): ReactNode {
  const t = useTranslations('procurement');
  // Partners run HR, payroll and purchasing in the sample company.
  const manages = useCan('procurement.manage');
  const orders = useList(prc.listPurchaseOrders, {});
  const receipts = useList(prc.listGoodsReceipts, {});
  const [open, setOpen] = useState<PurchaseOrder | null>(null);
  const numberOf = new Map(
    orders.items.map((order) => [order.id, order.number ?? t('draftOrder')]),
  );
  return (
    <div className="flex flex-col gap-4">
      <RecordTable
        label={t('orders')}
        list={orders}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{t('ordersHint')}</p>
            {manages && <NewOrderButton />}
          </div>
        }
        columns={[
          {
            id: 'number',
            header: t('order'),
            cell: (row) => (
              <button
                type="button"
                className="text-left font-mono text-[13px] text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.number ?? t('draftOrder')}
              </button>
            ),
          },
          { id: 'vendor', header: t('vendor'), cell: (row) => row.vendorName },
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
          {
            id: 'total',
            header: t('total'),
            align: 'right',
            cell: (row) => <Money value={row.total} />,
          },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => <FlowStatusPill status={row.status} />,
          },
        ]}
      />
      <RecordTable
        label={t('receipts')}
        list={receipts}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('receipts')}</p>}
        columns={[
          { id: 'number', header: t('receipt'), cell: (row) => <Tag>{row.number ?? '—'}</Tag> },
          {
            id: 'order',
            header: t('order'),
            cell: (row) => numberOf.get(row.purchaseOrderId) ?? '—',
          },
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.receivedOn} /> },
          { id: 'by', header: t('receivedBy'), cell: (row) => row.receivedBy.name },
          {
            id: 'lines',
            header: t('items'),
            cell: (row) =>
              row.lines.map((line) => `${line.quantity} × ${line.description}`).join(', '),
          },
        ]}
      />
      {open !== null && (
        <OrderDialog
          order={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}

function VendorsTab(): ReactNode {
  const t = useTranslations('procurement');
  // Partners run HR, payroll and purchasing in the sample company.
  const manages = useCan('procurement.manage');
  const vendors = useList(prc.listVendors, {});
  return (
    <RecordTable
      label={t('vendors')}
      list={vendors}
      getRowId={(row) => row.id}
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">{t('vendorsHint')}</p>
          {manages && <NewVendorButton />}
        </div>
      }
      columns={[
        { id: 'name', header: t('vendor'), cell: (row) => row.name },
        { id: 'bin', header: t('bin'), cell: (row) => row.bin ?? '—' },
        {
          id: 'withholding',
          header: t('withholding'),
          cell: (row) => row.withholdingCategory ?? '—',
        },
        {
          id: 'bank',
          header: t('bank'),
          cell: (row) =>
            row.bankAccount === undefined ? (
              <span className="text-muted">{t('hidden')}</span>
            ) : (
              (row.bankAccount ?? '—')
            ),
        },
        {
          id: 'actions',
          header: '',
          align: 'right',
          cell: (row) => <EditVendorButton vendor={row} />,
        },
      ]}
    />
  );
}

function AssetsTab(): ReactNode {
  const t = useTranslations('procurement');
  // Partners run HR, payroll and purchasing in the sample company.
  const manages = useCan('procurement.manage');
  const status = useTranslations('procurement.assetStatus');
  const message = useErrorMessage();
  const assets = useList(prc.listAssets, {});
  const returnAsset = useCommand(
    (asset: Asset) =>
      browserCall(prc.returnAsset, {
        params: { id: asset.id },
        ifMatch: `"${String(asset.meta.version)}"`,
      }),
    { success: t('assetReturned'), invalidate: [prc.listAssets.id] },
  );
  return (
    <div className="flex flex-col gap-3">
      {returnAsset.isError && <Callout tone="crit" title={message(returnAsset.error)} />}
      <RecordTable
        label={t('assets')}
        list={assets}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{t('assetsHint')}</p>
            {manages && <NewAssetButton />}
          </div>
        }
        columns={[
          { id: 'tag', header: t('tag'), cell: (row) => <Tag>{row.tag}</Tag> },
          { id: 'name', header: t('asset'), cell: (row) => row.name },
          { id: 'who', header: t('assignedTo'), cell: (row) => row.assignedTo?.name ?? '—' },
          {
            id: 'cost',
            header: t('cost'),
            align: 'right',
            cell: (row) => <Money value={row.cost} />,
          },
          {
            id: 'book',
            header: t('bookValue'),
            align: 'right',
            cell: (row) => <Money value={row.bookValue} />,
          },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => (
              <StatusPill tone={row.status === 'assigned' ? 'info' : 'neutral'}>
                {status(row.status)}
              </StatusPill>
            ),
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) => (
              <span className="flex justify-end gap-2">
                <AssetActions asset={row} />
                {row.allowedActions.includes('return') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={t('returnLabel', { tag: row.tag })}
                    onClick={() => {
                      returnAsset.mutate(row);
                    }}
                  >
                    {t('return')}
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

function DepreciationTab(): ReactNode {
  const t = useTranslations('procurement');
  const message = useErrorMessage();
  const runs = useList(prc.listDepreciationRuns, {});
  const [month, setMonth] = useState('2026-11');
  const preview = useCommand(() => browserCall(prc.previewDepreciationRun, { body: { month } }));
  const post = useCommand(
    (run: DepreciationRun) =>
      browserCall(prc.postDepreciationRun, {
        params: { id: run.id },
        ifMatch: `"${String(run.meta.version)}"`,
      }),
    { success: t('depreciationPosted'), invalidate: [prc.listDepreciationRuns.id] },
  );
  const shown = post.data ?? preview.data;
  return (
    <div className="flex flex-col gap-4">
      <Card title={t('runDepreciation')} description={t('runDepreciationHint')}>
        <div className="flex flex-col gap-3">
          {(preview.isError || post.isError) && (
            <Callout tone="crit" title={message(preview.error ?? post.error)} />
          )}
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t('month')}>
              {(control) => (
                <Select
                  {...control}
                  value={month}
                  options={['2026-09', '2026-11'].map((value) => ({ value, label: value }))}
                  onChange={(event) => {
                    setMonth(event.target.value);
                  }}
                />
              )}
            </Field>
            <Button
              variant="secondary"
              loading={preview.isPending}
              onClick={() => {
                preview.mutate(undefined);
              }}
            >
              {t('preview')}
            </Button>
          </div>
          {shown !== undefined && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface-2 p-3 text-sm">
              <span>
                <MonthText month={shown.month} /> · {t('assetCount', { count: shown.assets })} ·{' '}
                <Money value={shown.total} />
              </span>
              {shown.allowedActions.includes('post') ? (
                <Button
                  loading={post.isPending}
                  onClick={() => {
                    post.mutate(shown);
                  }}
                >
                  {t('post')}
                </Button>
              ) : (
                <span>{t('postedAs', { number: shown.journalEntryNo ?? '—' })}</span>
              )}
            </div>
          )}
        </div>
      </Card>
      <RecordTable
        label={t('depreciationRuns')}
        list={runs}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('depreciationRuns')}</p>}
        columns={[
          { id: 'month', header: t('month'), cell: (row) => <MonthText month={row.month} /> },
          { id: 'assets', header: t('assets'), align: 'right', cell: (row) => row.assets },
          {
            id: 'total',
            header: t('total'),
            align: 'right',
            cell: (row) => <Money value={row.total} />,
          },
          { id: 'journal', header: t('journal'), cell: (row) => row.journalEntryNo ?? '—' },
        ]}
      />
    </div>
  );
}

function RenewalsTab(): ReactNode {
  const t = useTranslations('procurement');
  // Partners run HR, payroll and purchasing in the sample company.
  const manages = useCan('procurement.manage');
  const licences = useList(prc.listLicences, {});
  const deposits = useList(prc.listDepositsGiven, {});
  return (
    <div className="flex flex-col gap-4">
      <RecordTable
        label={t('renewals')}
        list={licences}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{t('renewalsHint')}</p>
            {manages && <NewLicenceButton />}
          </div>
        }
        columns={[
          { id: 'name', header: t('licence'), cell: (row) => row.name },
          { id: 'kind', header: t('kind'), cell: (row) => t(`licenceKinds.${row.kind}`) },
          {
            id: 'cost',
            header: t('cost'),
            align: 'right',
            cell: (row) => <Money value={row.cost} />,
          },
          { id: 'renews', header: t('renewsOn'), cell: (row) => <DateText value={row.renewsOn} /> },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) => (manages ? <EditLicenceButton licence={row} /> : null),
          },
        ]}
      />
      <RecordTable
        label={t('deposits')}
        list={deposits}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">{t('deposits')}</p>
            {manages && <NewDepositButton />}
          </div>
        }
        columns={[
          { id: 'party', header: t('party'), cell: (row) => row.party },
          { id: 'purpose', header: t('purpose'), cell: (row) => row.purpose },
          {
            id: 'amount',
            header: t('amount'),
            align: 'right',
            cell: (row) => <Money value={row.amount} />,
          },
          {
            id: 'expires',
            header: t('expires'),
            cell: (row) =>
              row.expiresOn === null ? t('noExpiry') : <DateText value={row.expiresOn} />,
          },
        ]}
      />
    </div>
  );
}

export function ProcurementPage(): ReactNode {
  const t = useTranslations('procurement');
  const allowed = useCanRead('procurement');
  const finance = useCanRead('finance');
  if (!allowed) return <ForbiddenState />;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs
        label={t('title')}
        items={[
          { value: 'requisitions', label: t('requisitions'), content: <RequisitionsTab /> },
          { value: 'orders', label: t('orders'), content: <OrdersTab /> },
          { value: 'assets', label: t('assets'), content: <AssetsTab /> },
          ...(finance
            ? [
                { value: 'vendors', label: t('vendors'), content: <VendorsTab /> },
                { value: 'depreciation', label: t('depreciation'), content: <DepreciationTab /> },
                { value: 'renewals', label: t('renewalsAndDeposits'), content: <RenewalsTab /> },
              ]
            : []),
        ]}
      />
    </>
  );
}

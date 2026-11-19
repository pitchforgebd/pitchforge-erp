'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { partnersEndpoints as partnersApi } from '@pitchforge/contracts';
import type { DistributionRun, Partner, PartnerTransaction } from '@pitchforge/contracts';
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
  StatusPill,
  Tag,
} from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { Details, RecordTable } from '../common/record-table.tsx';
import { useCanRead, useSession } from '../common/session.tsx';
import { ForbiddenState, LoadingState, QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';
import { StatementTable } from '../finance/party-tables.tsx';

function Balance({ value }: { readonly value: Partner['capitalBalance'] }): ReactNode {
  const t = useTranslations('partners');
  // The API leaves a balance out for a role without the field permission.
  if (value === undefined) return <span className="text-xs text-muted">{t('hidden')}</span>;
  return <Money value={value} />;
}

function PartnerDialog({
  partner,
  onClose,
}: {
  readonly partner: Partner;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('partners');
  const common = useTranslations('common');
  const withdrawable = useQuery({
    queryKey: [partnersApi.getWithdrawableBalance.id, partner.id],
    queryFn: () => browserCall(partnersApi.getWithdrawableBalance, { params: { id: partner.id } }),
  });
  const statement = useQuery({
    queryKey: [partnersApi.getPartnerStatement.id, partner.id],
    queryFn: () =>
      browserCall(partnersApi.getPartnerStatement, {
        params: { id: partner.id },
        query: { from: addDays(todayInDhaka(), -180), to: todayInDhaka() },
      }),
    retry: false,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={partner.name}
      description={t('equityShare', { percent: partner.equityPercent })}
      closeLabel={common('close')}
    >
      <div className="flex flex-col gap-4">
        <QueryView query={withdrawable}>
          {(data) => (
            <>
              <Details
                items={[
                  [t('withdrawable'), <Balance key="w" value={data.amount} />],
                  [t('asOf'), <DateText key="a" value={data.asOf} />],
                ]}
              />
              {data.warning !== null && <Callout tone="warn" title={data.warning} />}
            </>
          )}
        </QueryView>
        {statement.data !== undefined && <StatementTable statement={statement.data} />}
      </div>
    </Dialog>
  );
}

function PartnerCards(): ReactNode {
  const t = useTranslations('partners');
  const partners = useList(partnersApi.listPartners, {});
  const [open, setOpen] = useState<Partner | null>(null);
  if (partners.status === 'loading') return <LoadingState />;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {partners.items.map((partner) => (
          <section key={partner.id} className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-base font-semibold">{partner.name}</h2>
              <span className="font-display text-xl font-semibold text-accent">
                {partner.equityPercent}%
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
              <dt className="text-muted">{t('capital')}</dt>
              <dd className="text-right">
                <Balance value={partner.capitalBalance} />
              </dd>
              <dt className="text-muted">{t('current')}</dt>
              <dd className="text-right">
                <Balance value={partner.currentBalance} />
              </dd>
              <dt className="text-muted">{t('due')}</dt>
              <dd className="text-right">
                <Balance value={partner.dueFromPartner} />
              </dd>
            </dl>
            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              aria-label={t('openPartner', { name: partner.name })}
              onClick={() => {
                setOpen(partner);
              }}
            >
              {t('withdrawableAndStatement')}
            </Button>
          </section>
        ))}
      </div>
      {open !== null && (
        <PartnerDialog
          partner={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

const TX_TONE: Readonly<Record<PartnerTransaction['status'], Tone>> = {
  draft: 'neutral',
  pending_approval: 'info',
  posted: 'good',
  rejected: 'crit',
  reversed: 'warn',
};

function Transactions(): ReactNode {
  const t = useTranslations('partners');
  const types = useTranslations('partners.types');
  const status = useTranslations('partners.status');
  const message = useErrorMessage();
  const transactions = useList(partnersApi.listPartnerTransactions, {});
  const submit = useCommand(
    (transaction: PartnerTransaction) =>
      browserCall(partnersApi.submitPartnerTransaction, {
        params: { id: transaction.id },
        ifMatch: `"${String(transaction.meta.version)}"`,
      }),
    { success: t('drawingSubmitted'), invalidate: [partnersApi.listPartnerTransactions.id] },
  );
  return (
    <div className="flex flex-col gap-3">
      {submit.isError && <Callout tone="crit" title={message(submit.error)} />}
      <RecordTable
        label={t('transactions')}
        list={transactions}
        getRowId={(row) => row.id}
        toolbar={<p className="text-xs text-muted">{t('transactionsHint')}</p>}
        columns={[
          {
            id: 'number',
            header: t('reference'),
            cell: (row) => <Tag>{row.number ?? t('draft')}</Tag>,
          },
          { id: 'partner', header: t('partner'), cell: (row) => row.partner.name },
          { id: 'type', header: t('type'), cell: (row) => types(row.type) },
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
          { id: 'note', header: t('note'), cell: (row) => row.note ?? '—' },
          {
            id: 'amount',
            header: t('amount'),
            align: 'right',
            cell: (row) => <Money value={row.amount} />,
          },
          {
            id: 'status',
            header: t('statusLabel'),

            cell: (row) => <StatusPill tone={TX_TONE[row.status]}>{status(row.status)}</StatusPill>,
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) =>
              row.allowedActions.includes('submit') ? (
                <Button
                  size="sm"
                  loading={submit.isPending && submit.variables.id === row.id}
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

function PreviewDialog({
  run,
  onClose,
}: {
  readonly run: DistributionRun;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('partners');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const post = useCommand(
    () =>
      browserCall(partnersApi.postDistributionRun, {
        params: { id: run.id },
        ifMatch: `"${String(run.meta.version)}"`,
      }),
    {
      success: (result) => t('distributionPosted', { number: result.number ?? '' }),
      invalidate: [partnersApi.listDistributionRuns.id],
      onSuccess: onClose,
    },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={run.number ?? t('preview')}
      description={t('previewDescription')}
      closeLabel={common('close')}
      footer={
        run.allowedActions.includes('post') ? (
          <Button
            loading={post.isPending}
            onClick={() => {
              post.mutate(undefined);
            }}
          >
            {t('postDistribution')}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {post.isError && <Callout tone="crit" title={message(post.error)} />}
        <DistributionDetails run={run} />
      </div>
    </Dialog>
  );
}

function DistributionDetails({ run }: { readonly run: DistributionRun }): ReactNode {
  const t = useTranslations('partners');
  return (
    <>
      <Details
        items={[
          [
            t('period'),
            <span key="p" className="flex flex-wrap gap-1">
              <DateText value={run.periodFrom} /> – <DateText value={run.periodTo} />
            </span>,
          ],
          [t('profit'), <Money key="pr" value={run.profit} />],
          [t('reserve', { percent: run.reservePercent }), <Money key="r" value={run.reserve} />],
          [t('distributable'), <Money key="d" value={run.distributable} />],
        ]}
      />
      <DataTable
        label={t('shares')}
        rows={run.shares}
        getRowId={(row) => row.partnerId}
        loadingState={null}
        errorState={null}
        emptyState={null}
        columns={[
          { id: 'partner', header: t('partner'), cell: (row) => row.partnerName },
          {
            id: 'percent',
            header: t('weighted'),
            align: 'right',
            cell: (row) => `${row.weightedPercent}%`,
          },
          {
            id: 'amount',
            header: t('amount'),
            align: 'right',
            cell: (row) => <Money value={row.amount} />,
          },
        ]}
      />
      <p className="text-xs text-muted">{t('sharesByServer')}</p>
    </>
  );
}

function Distributions(): ReactNode {
  const t = useTranslations('partners');
  const session = useSession();
  const message = useErrorMessage();
  const runs = useList(partnersApi.listDistributionRuns, {});
  const [reservePercent, setReserve] = useState('10');
  const [preview, setPreview] = useState<DistributionRun | null>(null);
  const [viewing, setViewing] = useState<DistributionRun | null>(null);
  const today = todayInDhaka();
  const start = useCommand(
    () =>
      browserCall(partnersApi.previewDistributionRun, {
        body: { periodFrom: addDays(today, -34), periodTo: addDays(today, -4), reservePercent },
      }),
    { onSuccess: setPreview },
  );
  // Only partners run distributions; anyone else sees the history.
  const canRun = session.permissions.includes('admin.read');
  return (
    <div className="flex flex-col gap-3">
      {start.isError && <Callout tone="crit" title={message(start.error)} />}
      <RecordTable
        label={t('distributions')}
        list={runs}
        getRowId={(row) => row.id}
        toolbar={
          <>
            <p className="text-xs text-muted">{t('distributionsHint')}</p>
            {canRun && (
              <span className="flex items-end gap-2">
                <Field label={t('reservePercent')}>
                  {(control) => (
                    <Input
                      {...control}
                      inputMode="decimal"
                      className="w-20"
                      value={reservePercent}
                      onChange={(event) => {
                        setReserve(event.target.value);
                      }}
                    />
                  )}
                </Field>
                <Button
                  size="sm"
                  loading={start.isPending}
                  onClick={() => {
                    start.mutate(undefined);
                  }}
                >
                  {t('runDistribution')}
                </Button>
              </span>
            )}
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
                  setViewing(row);
                }}
              >
                {row.number ?? t('preview')}
              </button>
            ),
          },
          {
            id: 'period',
            header: t('period'),
            cell: (row) => (
              <span className="flex flex-wrap gap-1">
                <DateText value={row.periodFrom} /> – <DateText value={row.periodTo} />
              </span>
            ),
          },
          {
            id: 'profit',
            header: t('profit'),
            align: 'right',
            cell: (row) => <Money value={row.profit} />,
          },
          {
            id: 'distributable',
            header: t('distributable'),
            align: 'right',
            cell: (row) => <Money value={row.distributable} />,
          },
          { id: 'journal', header: t('journal'), cell: (row) => row.journalEntryNo ?? '—' },
        ]}
      />
      {preview !== null && (
        <PreviewDialog
          run={preview}
          onClose={() => {
            setPreview(null);
          }}
        />
      )}
      {viewing !== null && (
        <PreviewDialog
          run={viewing}
          onClose={() => {
            setViewing(null);
          }}
        />
      )}
    </div>
  );
}

function EquityHistory(): ReactNode {
  const t = useTranslations('partners');
  const versions = useList(partnersApi.listEquityVersions, {});
  const partners = useList(partnersApi.listPartners, {});
  const nameOf = new Map(partners.items.map((partner) => [partner.id, partner.name]));
  return (
    <RecordTable
      label={t('equityHistory')}
      list={versions}
      getRowId={(row) => row.id}
      toolbar={<p className="text-xs text-muted">{t('equityHint')}</p>}
      columns={[
        {
          id: 'from',
          header: t('effective'),
          cell: (row) => (
            <span className="flex flex-wrap gap-1">
              <DateText value={row.validFrom} /> –{' '}
              {row.validTo === null ? t('today') : <DateText value={row.validTo} />}
            </span>
          ),
        },
        {
          id: 'shares',
          header: t('shares'),
          cell: (row) => (
            <span className="flex flex-wrap gap-1">
              {row.shares.map((share) => (
                <Tag key={share.partnerId}>
                  {`${nameOf.get(share.partnerId) ?? '…'} ${share.percent}%`}
                </Tag>
              ))}
            </span>
          ),
        },
        { id: 'reason', header: t('reason'), cell: (row) => row.reason },
      ]}
    />
  );
}

export function PartnersPage(): ReactNode {
  const t = useTranslations('partners');
  const allowed = useCanRead('partners');
  if (!allowed) return <ForbiddenState />;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <div className="flex flex-col gap-4">
        <PartnerCards />
        <Card title={t('transactions')}>
          <div className="p-3">
            <Transactions />
          </div>
        </Card>
        <Distributions />
        <EquityHistory />
      </div>
    </>
  );
}

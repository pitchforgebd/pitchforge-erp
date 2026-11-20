'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { crmEndpoints as crm } from '@pitchforge/contracts';
import type { Opportunity, Quotation } from '@pitchforge/contracts';
import { addDays, todayInDhaka } from '@pitchforge/shared-kernel';
import {
  Button,
  Callout,
  DataTable,
  DateText,
  Dialog,
  Field,
  Input,
  KpiTile,
  Money,
  Select,
  StatusPill,
  Tag,
  Textarea,
} from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { Card } from '../common/page-header.tsx';
import { Details, RecordTable } from '../common/record-table.tsx';
import { QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';

import {
  AddContactButton,
  EditClientButton,
  EditContractButton,
  EditDealButton,
  EditLeadButton,
  EditQuotationButton,
  EditStagesButton,
  LogActivityButton,
  NewClientButton,
  NewContractButton,
  NewDealButton,
  NewLeadButton,
  NewQuotationButton,
} from './forms.tsx';

function LoseDialog({
  deal,
  onClose,
}: {
  readonly deal: Opportunity;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('crm');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const [reason, setReason] = useState('');
  const [competitor, setCompetitor] = useState('');
  const lose = useCommand(
    () =>
      browserCall(crm.loseOpportunity, {
        params: { id: deal.id },
        body: {
          reason: reason.trim(),
          competitor: competitor.trim() === '' ? null : competitor.trim(),
        },
        ifMatch: `"${String(deal.meta.version)}"`,
      }),
    { success: t('dealLost'), invalidate: [crm.listOpportunities.id], onSuccess: onClose },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('markLost')}
      description={deal.name}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            variant="danger"
            loading={lose.isPending}
            disabled={reason.trim().length < 3}
            onClick={() => {
              lose.mutate(undefined);
            }}
          >
            {t('markLost')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {lose.isError && <Callout tone="crit" title={message(lose.error)} />}
        <Field label={t('lostReason')} required requiredLabel={common('required')}>
          {(control) => (
            <Textarea
              {...control}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
              }}
            />
          )}
        </Field>
        <Field label={t('competitor')}>
          {(control) => (
            <Input
              {...control}
              value={competitor}
              onChange={(event) => {
                setCompetitor(event.target.value);
              }}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

export function PipelineTab(): ReactNode {
  const t = useTranslations('crm');
  const message = useErrorMessage();
  const stages = useQuery({
    queryKey: [crm.listPipelineStages.id],
    queryFn: () => browserCall(crm.listPipelineStages, {}),
  });
  const deals = useList(crm.listOpportunities, {});
  const [losing, setLosing] = useState<Opportunity | null>(null);
  const invalidate = [crm.listOpportunities.id];
  const move = useCommand(
    ({ deal, stageId }: { deal: Opportunity; stageId: string }) =>
      browserCall(crm.moveOpportunity, {
        params: { id: deal.id },
        body: { stageId },
        ifMatch: `"${String(deal.meta.version)}"`,
      }),
    { success: t('dealMoved'), invalidate },
  );
  const win = useCommand(
    (deal: Opportunity) =>
      browserCall(crm.winOpportunity, {
        params: { id: deal.id },
        body: { projectStartDate: addDays(todayInDhaka(), 7) },
        ifMatch: `"${String(deal.meta.version)}"`,
      }),
    { success: t('dealWon'), invalidate },
  );
  const error = move.error ?? win.error;
  return (
    <div className="flex flex-col gap-3">
      {error !== null && <Callout tone="crit" title={message(error)} />}
      <div className="flex flex-wrap justify-end gap-2">
        <EditStagesButton />
        <NewDealButton />
      </div>
      <QueryView query={stages}>
        {(data) => (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.items.map((stage) => {
              const inStage = deals.items.filter(
                (deal) => deal.stageId === stage.id && deal.status !== 'lost',
              );
              return (
                <section
                  key={stage.id}
                  aria-label={stage.name}
                  className="rounded-control bg-surface-2 p-2"
                >
                  <h3 className="mb-2 flex justify-between px-1 text-xs font-semibold tracking-wider text-muted uppercase">
                    {stage.name} · {stage.probabilityPercent}% <span>{inStage.length}</span>
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {inStage.map((deal) => (
                      <li
                        key={deal.id}
                        className="rounded-control border border-line bg-surface p-3"
                      >
                        <p className="text-sm font-medium">{deal.name}</p>
                        <p className="text-xs text-muted">{deal.clientName}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <Money value={deal.value} /> · {deal.owner.name}
                          {deal.expectedCloseDate !== null && (
                            <DateText value={deal.expectedCloseDate} />
                          )}
                        </p>
                        {deal.allowedActions.includes('move') && (
                          <div className="mt-2 flex flex-col gap-2">
                            <Field label={t('stageOf', { name: deal.name })}>
                              {(control) => (
                                <Select
                                  {...control}
                                  value={deal.stageId}
                                  options={data.items
                                    .filter((option) => !option.closed)
                                    .map((option) => ({ value: option.id, label: option.name }))}
                                  onChange={(event) => {
                                    move.mutate({ deal, stageId: event.target.value });
                                  }}
                                />
                              )}
                            </Field>
                            <span className="flex gap-2">
                              <Button
                                size="sm"
                                aria-label={t('winLabel', { name: deal.name })}
                                onClick={() => {
                                  win.mutate(deal);
                                }}
                              >
                                {t('win')}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                aria-label={t('loseLabel', { name: deal.name })}
                                onClick={() => {
                                  setLosing(deal);
                                }}
                              >
                                {t('lose')}
                              </Button>
                              <EditDealButton deal={deal} />
                            </span>
                          </div>
                        )}
                        {deal.status === 'won' && <StatusPill tone="good">{t('won')}</StatusPill>}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </QueryView>
      <p className="text-xs text-muted">{t('pipelineHint')}</p>
      {losing !== null && (
        <LoseDialog
          deal={losing}
          onClose={() => {
            setLosing(null);
          }}
        />
      )}
    </div>
  );
}

export function ForecastTab(): ReactNode {
  const t = useTranslations('crm');
  const forecast = useQuery({
    queryKey: [crm.getSalesForecast.id],
    queryFn: () => browserCall(crm.getSalesForecast, {}),
  });
  return (
    <Card title={t('forecast')} description={t('forecastHint')}>
      <QueryView query={forecast}>
        {(data) => (
          <DataTable
            label={t('forecast')}
            rows={data.months}
            getRowId={(row) => row.month}
            loadingState={null}
            errorState={null}
            emptyState={null}
            columns={[
              { id: 'month', header: t('month'), cell: (row) => row.month },
              {
                id: 'total',
                header: t('pipelineValue'),
                align: 'right',
                cell: (row) => <Money value={row.total} />,
              },
              {
                id: 'weighted',
                header: t('weighted'),
                align: 'right',
                cell: (row) => <Money value={row.weighted} />,
              },
            ]}
          />
        )}
      </QueryView>
    </Card>
  );
}

const LEAD_TONE = {
  new: 'info',
  contacted: 'neutral',
  qualified: 'good',
  converted: 'good',
  lost: 'crit',
} as const;

export function LeadsTab(): ReactNode {
  const t = useTranslations('crm');
  const status = useTranslations('crm.leadStatus');
  const leads = useList(crm.listLeads, {});
  const message = useErrorMessage();
  const convert = useCommand(
    (lead: { id: string; meta: { version: number } }) =>
      browserCall(crm.convertLead, {
        params: { id: lead.id },
        ifMatch: `"${String(lead.meta.version)}"`,
      }),
    {
      success: (client) => t('converted', { name: client.name }),
      invalidate: [crm.listLeads.id, crm.listClients.id],
    },
  );
  return (
    <div className="flex flex-col gap-3">
      {convert.isError && <Callout tone="crit" title={message(convert.error)} />}
      <RecordTable
        label={t('leads')}
        list={leads}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex justify-end">
            <NewLeadButton />
          </div>
        }
        columns={[
          {
            id: 'name',
            header: t('lead'),
            cell: (row) => (
              <span className="flex flex-col">
                <span className="font-medium">{row.name}</span>
                <span className="text-xs text-muted">{row.need}</span>
              </span>
            ),
          },
          { id: 'contact', header: t('contact'), cell: (row) => row.contactName ?? '—' },
          { id: 'source', header: t('source'), cell: (row) => row.source },
          { id: 'owner', header: t('owner'), cell: (row) => row.owner.name },
          {
            id: 'next',
            header: t('nextFollowUp'),
            cell: (row) =>
              row.nextFollowUp === null ? '—' : <DateText value={row.nextFollowUp} />,
          },

          {
            id: 'status',
            header: t('status'),
            cell: (row) => (
              <StatusPill tone={LEAD_TONE[row.status]}>{status(row.status)}</StatusPill>
            ),
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) => (
              <span className="flex justify-end gap-2">
                <EditLeadButton lead={row} />
                {row.allowedActions.includes('convert') && (
                  <Button
                    size="sm"
                    loading={convert.isPending}
                    aria-label={t('convertLabel', { name: row.name })}
                    onClick={() => {
                      convert.mutate(row);
                    }}
                  >
                    {t('convert')}
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

function ClientDialog({
  clientId,
  onClose,
}: {
  readonly clientId: string;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('crm');
  const common = useTranslations('common');
  const kinds = useTranslations('crm.activityKinds');
  const overview = useQuery({
    queryKey: [crm.getClientOverview.id, clientId],
    queryFn: () => browserCall(crm.getClientOverview, { params: { id: clientId } }),
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={overview.data?.client.name ?? t('client')}
      closeLabel={common('close')}
    >
      <QueryView query={overview}>
        {(data) => (
          <div className="flex flex-col gap-4">
            <span className="flex flex-wrap gap-2">
              <EditClientButton client={data.client} />
              <AddContactButton client={data.client} />
              <LogActivityButton client={data.client} />
            </span>
            <div className="grid grid-cols-2 gap-3">
              <KpiTile label={t('openPipeline')} value={<Money value={data.openPipelineValue} />} />
              <KpiTile label={t('receivable')} value={<Money value={data.receivableBalance} />} />
              <KpiTile label={t('activeProjects')} value={data.activeProjects} />
              <KpiTile label={t('activeContracts')} value={data.activeContracts} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                {t('contacts')}
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {data.contacts.map((person) => (
                  <li key={person.id}>
                    {person.name}
                    {person.role !== null && <span className="text-muted"> · {person.role}</span>}
                    {person.primary && (
                      <span className="ml-2">
                        <Tag>{t('primary')}</Tag>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                {t('activity')}
              </p>
              <ul className="flex flex-col gap-2 text-sm">
                {data.recentActivities.map((item) => (
                  <li key={item.id}>
                    <span className="font-medium">{kinds(item.kind)}</span> · {item.subject}
                    <span className="block text-xs text-muted">
                      {item.owner.name} · <TimeText value={item.at} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </QueryView>
    </Dialog>
  );
}

export function ClientsTab(): ReactNode {
  const t = useTranslations('crm');
  const clients = useList(crm.listClients, {});
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <RecordTable
        label={t('clients')}
        list={clients}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex justify-end">
            <NewClientButton />
          </div>
        }
        columns={[
          {
            id: 'name',
            header: t('client'),
            cell: (row) => (
              <button
                type="button"
                className="text-left text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row.id);
                }}
              >
                {row.name}
              </button>
            ),
          },
          {
            id: 'terms',
            header: t('paymentTerms'),
            cell: (row) => t('days', { days: row.paymentTermsDays }),
          },
          {
            id: 'limit',
            header: t('creditLimit'),
            align: 'right',
            cell: (row) => (row.creditLimit === null ? '—' : <Money value={row.creditLimit} />),
          },
        ]}
      />
      {open !== null && (
        <ClientDialog
          clientId={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

const QUOTE_TONE: Readonly<Record<Quotation['status'], Tone>> = {
  draft: 'neutral',
  pending_approval: 'info',
  approved: 'info',
  sent: 'warn',
  accepted: 'good',
  rejected: 'crit',
  expired: 'neutral',
};

function QuotationDialog({
  quote,
  onClose,
}: {
  readonly quote: Quotation;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('crm');
  const common = useTranslations('common');
  const status = useTranslations('crm.quoteStatus');
  const message = useErrorMessage();
  const options = { params: { id: quote.id }, ifMatch: `"${String(quote.meta.version)}"` };
  const done = { invalidate: [crm.listQuotations.id], onSuccess: onClose };
  const submit = useCommand(() => browserCall(crm.submitQuotation, options), {
    ...done,
    success: t('quoteSubmitted'),
  });
  const send = useCommand(() => browserCall(crm.sendQuotation, { params: { id: quote.id } }), {
    ...done,
    success: t('quoteSent'),
  });
  const accept = useCommand(() => browserCall(crm.acceptQuotation, options), {
    ...done,
    success: t('quoteAccepted'),
  });
  const revise = useCommand(() => browserCall(crm.newQuotationVersion, options), {
    ...done,
    success: (next) => t('quoteRevised', { revision: next.revision }),
  });
  const error = submit.error ?? send.error ?? accept.error ?? revise.error;
  const can = (action: Quotation['allowedActions'][number]) =>
    quote.allowedActions.includes(action);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={quote.number ?? t('draftQuote')}
      description={`${quote.clientName} · ${quote.title}`}
      closeLabel={common('close')}
      footer={
        <>
          <EditQuotationButton quote={quote} />
          {can('new_version') && (
            <Button
              variant="secondary"
              loading={revise.isPending}
              onClick={() => {
                revise.mutate(undefined);
              }}
            >
              {t('newVersion')}
            </Button>
          )}
          {can('send') && (
            <Button
              variant="secondary"
              loading={send.isPending}
              onClick={() => {
                send.mutate(undefined);
              }}
            >
              {t('send')}
            </Button>
          )}
          {can('accept') && (
            <Button
              loading={accept.isPending}
              onClick={() => {
                accept.mutate(undefined);
              }}
            >
              {t('recordAccepted')}
            </Button>
          )}
          {can('submit') && (
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
        {error !== null && <Callout tone="crit" title={message(error)} />}
        <Details
          items={[
            [
              t('status'),
              <StatusPill key="s" tone={QUOTE_TONE[quote.status]}>
                {status(quote.status)}
              </StatusPill>,
            ],
            [t('revision'), quote.revision],
            [t('date'), <DateText key="d" value={quote.date} />],
            [t('validUntil'), <DateText key="v" value={quote.validUntil} />],
            [t('gross'), <Money key="g" value={quote.gross} />],
            [
              t('discount', { percent: quote.discountPercent }),
              <Money key="dc" value={quote.discount} />,
            ],
            [t('vat'), <Money key="vt" value={quote.vat} />],
            [t('total'), <Money key="t" value={quote.total} />],
          ]}
        />
        <DataTable
          label={t('lines')}
          rows={quote.lines}
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

export function QuotationsTab(): ReactNode {
  const t = useTranslations('crm');
  const status = useTranslations('crm.quoteStatus');
  const quotes = useList(crm.listQuotations, {});
  const [open, setOpen] = useState<Quotation | null>(null);
  return (
    <>
      <RecordTable
        label={t('quotations')}
        list={quotes}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{t('quotationsHint')}</p>
            <span className="flex flex-wrap gap-2">
              <NewQuotationButton />
            </span>
          </div>
        }
        columns={[
          {
            id: 'number',
            header: t('quotation'),
            cell: (row) => (
              <button
                type="button"
                className="text-left font-mono text-[13px] text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.number ?? t('draftQuote')}
              </button>
            ),
          },
          { id: 'client', header: t('client'), cell: (row) => row.clientName },
          { id: 'title', header: t('titleColumn'), cell: (row) => row.title },
          { id: 'revision', header: t('revision'), align: 'right', cell: (row) => row.revision },
          {
            id: 'total',
            header: t('total'),
            align: 'right',
            cell: (row) => <Money value={row.total} />,
          },

          {
            id: 'status',
            header: t('status'),
            cell: (row) => (
              <StatusPill tone={QUOTE_TONE[row.status]}>{status(row.status)}</StatusPill>
            ),
          },
        ]}
      />
      {open !== null && (
        <QuotationDialog
          quote={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

export function ContractsTab(): ReactNode {
  const t = useTranslations('crm');
  const contracts = useList(crm.listContracts, {});
  return (
    <RecordTable
      label={t('contracts')}
      list={contracts}
      getRowId={(row) => row.id}
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">{t('contractsHint')}</p>
          <span className="flex flex-wrap gap-2">
            <NewContractButton />
          </span>
        </div>
      }
      columns={[
        { id: 'number', header: t('contract'), cell: (row) => <Tag>{row.number ?? '—'}</Tag> },
        { id: 'client', header: t('client'), cell: (row) => row.clientName },
        { id: 'title', header: t('titleColumn'), cell: (row) => row.title },
        {
          id: 'value',
          header: t('value'),
          align: 'right',
          cell: (row) => <Money value={row.value} />,
        },
        {
          id: 'dates',
          header: t('term'),
          cell: (row) => (
            <span className="flex flex-wrap gap-1">
              <DateText value={row.startDate} /> –{' '}
              {row.endDate === null ? t('open') : <DateText value={row.endDate} />}
            </span>
          ),
        },
        {
          id: 'retention',
          header: t('retention'),
          align: 'right',
          cell: (row) => `${row.retentionPercent}%`,
        },
        {
          id: 'renewal',
          header: t('renewal'),
          cell: (row) => (row.renewalDate === null ? '—' : <DateText value={row.renewalDate} />),
        },
        {
          id: 'actions',
          header: '',
          align: 'right',
          cell: (row) => <EditContractButton contract={row} />,
        },
      ]}
    />
  );
}

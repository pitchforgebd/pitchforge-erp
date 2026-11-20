'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { crmEndpoints as crm } from '@pitchforge/contracts';
import type { Guarantee, Tender } from '@pitchforge/contracts';
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
  Tag,
} from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { moneyFromInput } from '../common/money-input.ts';
import { Details, RecordTable } from '../common/record-table.tsx';
import { QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';

import {
  AwardTenderButton,
  EditChecklistButton,
  EditTenderButton,
  NewGuaranteeButton,
  NewTenderButton,
} from './forms.tsx';

const TENDER_TONE = new Map<Tender['status'], Tone>([
  ['preparing', 'info'],
  ['submitted', 'warn'],
  ['won', 'good'],
  ['lost', 'crit'],
  ['withdrawn', 'neutral'],
]);

function OutcomeForm({
  tender,
  onDone,
}: {
  readonly tender: Tender;
  readonly onDone: () => void;
}): ReactNode {
  const t = useTranslations('tenders');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const [result, setResult] = useState<'won' | 'lost' | 'withdrawn'>('lost');
  const [rank, setRank] = useState('');
  const [winningPrice, setWinningPrice] = useState('');
  const record = useCommand(
    () =>
      browserCall(crm.recordTenderOutcome, {
        params: { id: tender.id },
        body: {
          result,
          rank: rank === '' ? null : Number.parseInt(rank, 10),
          ourPrice: tender.ourPrice,
          winningPrice: moneyFromInput(winningPrice),
        },
        ifMatch: `"${String(tender.meta.version)}"`,
      }),
    { success: t('outcomeRecorded'), invalidate: [crm.listTenders.id], onSuccess: onDone },
  );
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      {record.isError && <Callout tone="crit" title={message(record.error)} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('result')} required requiredLabel={common('required')}>
          {(control) => (
            <Select
              {...control}
              value={result}
              options={(['won', 'lost', 'withdrawn'] as const).map((value) => ({
                value,
                label: t(`status.${value}`),
              }))}
              onChange={(event) => {
                setResult(event.target.value as typeof result);
              }}
            />
          )}
        </Field>
        <Field label={t('rank')}>
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              value={rank}
              onChange={(event) => {
                setRank(event.target.value.replace(/[^0-9]/g, ''));
              }}
            />
          )}
        </Field>
        <Field label={t('winningPrice')}>
          {(control) => (
            <Input
              {...control}
              inputMode="decimal"
              value={winningPrice}
              onChange={(event) => {
                setWinningPrice(event.target.value);
              }}
            />
          )}
        </Field>
      </div>
      <div className="flex justify-end">
        <Button
          loading={record.isPending}
          onClick={() => {
            record.mutate(undefined);
          }}
        >
          {t('recordOutcome')}
        </Button>
      </div>
    </div>
  );
}

function TenderDialog({
  tender,
  onClose,
}: {
  readonly tender: Tender;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('tenders');
  const common = useTranslations('common');
  const status = useTranslations('tenders.status');
  const [recording, setRecording] = useState(false);
  const checklist = useQuery({
    queryKey: [crm.getTenderChecklist.id, tender.id],
    queryFn: () => browserCall(crm.getTenderChecklist, { params: { id: tender.id } }),
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={tender.title}
      description={tender.procuringEntity}
      closeLabel={common('close')}
    >
      <div className="flex flex-col gap-4">
        <Details
          items={[
            [
              t('statusLabel'),
              <StatusPill key="s" tone={TENDER_TONE.get(tender.status) ?? 'neutral'}>
                {status(tender.status)}
              </StatusPill>,
            ],
            [t('egpId'), tender.egpId ?? '—'],
            [t('method'), tender.method],
            [t('deadline'), <TimeText key="d" value={tender.submissionDeadline} />],
            [
              t('estimate'),
              tender.estimatedValue === null ? (
                '—'
              ) : (
                <Money key="e" value={tender.estimatedValue} />
              ),
            ],
            [t('team'), tender.team.map((person) => person.name).join(', ')],
            [t('rank'), tender.rank ?? '—'],
            [
              t('ourPrice'),
              tender.ourPrice === null ? '—' : <Money key="o" value={tender.ourPrice} />,
            ],
          ]}
        />
        <QueryView query={checklist}>
          {(data) =>
            data.items.length === 0 ? (
              <EditChecklistButton tender={tender} items={data.items} />
            ) : (
              <div className="flex flex-col gap-2">
                <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                  {t('checklist', {
                    done: data.items.filter((item) => item.done).length,
                    count: data.items.length,
                  })}
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {data.items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>{item.document}</span>
                      {item.done ? (
                        <StatusPill tone="good">{t('ready')}</StatusPill>
                      ) : (
                        <StatusPill tone="warn">
                          {t('pending', { name: item.owner?.name ?? t('unassigned') })}
                        </StatusPill>
                      )}
                    </li>
                  ))}
                </ul>
                <span>
                  <EditChecklistButton tender={tender} items={data.items} />
                </span>
              </div>
            )
          }
        </QueryView>
        <span className="flex flex-wrap justify-end gap-2">
          <EditTenderButton tender={tender} />
          <AwardTenderButton tender={tender} />
        </span>
        {tender.allowedActions.includes('record_outcome') &&
          (recording ? (
            <OutcomeForm tender={tender} onDone={onClose} />
          ) : (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setRecording(true);
                }}
              >
                {t('recordOutcome')}
              </Button>
            </div>
          ))}
      </div>
    </Dialog>
  );
}

export function TendersTab(): ReactNode {
  const t = useTranslations('tenders');
  const status = useTranslations('tenders.status');
  const tenders = useList(crm.listTenders, {});
  const [open, setOpen] = useState<Tender | null>(null);
  return (
    <>
      <RecordTable
        label={t('register')}
        list={tenders}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{t('registerHint')}</p>
            <span className="flex flex-wrap gap-2">
              <NewTenderButton />
            </span>
          </div>
        }
        columns={[
          {
            id: 'title',
            header: t('tender'),
            cell: (row) => (
              <button
                type="button"
                className="text-left text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.title}
              </button>
            ),
          },
          { id: 'entity', header: t('entity'), cell: (row) => row.procuringEntity },
          { id: 'method', header: t('method'), cell: (row) => <Tag>{row.method}</Tag> },
          {
            id: 'deadline',
            header: t('deadline'),
            cell: (row) => <TimeText value={row.submissionDeadline} />,
          },
          {
            id: 'status',
            header: t('statusLabel'),
            cell: (row) => (
              <StatusPill tone={TENDER_TONE.get(row.status) ?? 'neutral'}>
                {status(row.status)}
              </StatusPill>
            ),
          },
        ]}
      />
      {open !== null && (
        <TenderDialog
          tender={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

export function GuaranteesTab(): ReactNode {
  const t = useTranslations('tenders');
  const kinds = useTranslations('tenders.guaranteeKinds');
  const message = useErrorMessage();
  const guarantees = useList(crm.listGuarantees, {});
  const documents = useList(crm.listStandardDocuments, {});
  const release = useCommand(
    (guarantee: Guarantee) =>
      browserCall(crm.releaseGuarantee, {
        params: { id: guarantee.id },
        ifMatch: `"${String(guarantee.meta.version)}"`,
      }),
    { success: t('released'), invalidate: [crm.listGuarantees.id] },
  );
  return (
    <div className="flex flex-col gap-4">
      {release.isError && <Callout tone="crit" title={message(release.error)} />}
      <RecordTable
        label={t('guarantees')}
        list={guarantees}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">{t('guarantees')}</p>
            <NewGuaranteeButton />
          </div>
        }
        columns={[
          { id: 'kind', header: t('kind'), cell: (row) => kinds(row.kind) },
          { id: 'issuer', header: t('issuer'), cell: (row) => row.issuer },
          { id: 'reference', header: t('reference'), cell: (row) => <Tag>{row.reference}</Tag> },
          {
            id: 'amount',
            header: t('amount'),
            align: 'right',
            cell: (row) => <Money value={row.amount} />,
          },
          {
            id: 'expires',
            header: t('expires'),
            cell: (row) => (row.expiresOn === null ? '—' : <DateText value={row.expiresOn} />),
          },
          {
            id: 'status',
            header: t('statusLabel'),
            cell: (row) => (
              <StatusPill tone={row.status === 'active' ? 'info' : 'neutral'}>
                {t(`guaranteeStatus.${row.status}`)}
              </StatusPill>
            ),
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) =>
              row.allowedActions.includes('release') ? (
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={t('releaseLabel', { reference: row.reference })}
                  onClick={() => {
                    release.mutate(row);
                  }}
                >
                  {t('release')}
                </Button>
              ) : null,
          },
        ]}
      />
      <RecordTable
        label={t('documents')}
        list={documents}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('documents')}</p>}
        columns={[
          { id: 'name', header: t('document'), cell: (row) => row.name },
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

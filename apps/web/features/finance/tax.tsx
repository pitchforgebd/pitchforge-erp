'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { accountingEndpoints as accounting } from '@pitchforge/contracts';
import { DateText, Field, KpiTile, Money, Select, StatusPill, Tag } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { Card } from '../common/page-header.tsx';
import { RecordTable } from '../common/record-table.tsx';
import { QueryView } from '../common/states.tsx';
import { useList } from '../common/use-list.ts';

const MONTHS = ['2026-11', '2026-10', '2026-09', '2026-08', '2026-07'] as const;

function VatReturnCard(): ReactNode {
  const t = useTranslations('tax');
  const [month, setMonth] = useState<string>('2026-10');
  const vat = useQuery({
    queryKey: [accounting.getVatReturn.id, month],
    queryFn: () => browserCall(accounting.getVatReturn, { query: { month } }),
  });
  return (
    <Card title={t('vatReturn')} description={t('vatReturnDescription')}>
      <div className="flex flex-col gap-4 p-4">
        <div className="max-w-xs">
          <Field label={t('month')}>
            {(control) => (
              <Select
                {...control}
                value={month}
                options={MONTHS.map((value) => ({ value, label: value }))}
                onChange={(event) => {
                  setMonth(event.target.value);
                }}
              />
            )}
          </Field>
        </div>
        <QueryView query={vat}>
          {(data) => (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiTile label={t('outputVat')} value={<Money value={data.outputVat} />} />
              <KpiTile label={t('inputVat')} value={<Money value={data.inputVat} />} />
              <KpiTile label={t('vdsDeducted')} value={<Money value={data.vdsDeducted} />} />
              <KpiTile
                label={t('payable')}
                value={<Money value={data.payable} />}
                hint={t('payableHint')}
              />
            </div>
          )}
        </QueryView>
      </div>
    </Card>
  );
}

export function TaxTab(): ReactNode {
  const t = useTranslations('tax');
  const certificates = useList(accounting.listWithholdingCertificates, {});
  const challans = useList(accounting.listChallans, {});
  const kinds = useTranslations('tax.challanKinds');
  return (
    <div className="flex flex-col gap-4">
      <VatReturnCard />
      <RecordTable
        label={t('certificates')}
        list={certificates}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('certificates')}</p>}
        columns={[
          {
            id: 'direction',
            header: t('direction'),
            cell: (row) => (
              <StatusPill tone={row.direction === 'received' ? 'info' : 'neutral'}>
                {row.direction === 'received' ? t('received') : t('issued')}
              </StatusPill>
            ),
          },
          { id: 'kind', header: t('kind'), cell: (row) => row.kind.toUpperCase() },
          { id: 'party', header: t('party'), cell: (row) => row.partyName },
          { id: 'period', header: t('period'), cell: (row) => row.period },
          {
            id: 'number',
            header: t('certificateNo'),
            cell: (row) => <Tag>{row.certificateNo}</Tag>,
          },
          {
            id: 'amount',
            header: t('amount'),
            align: 'right',
            cell: (row) => <Money value={row.amount} />,
          },
          {
            id: 'file',
            header: t('copy'),
            cell: (row) =>
              row.fileId === null ? (
                <StatusPill tone="warn">{t('copyMissing')}</StatusPill>
              ) : (
                <StatusPill tone="good">{t('copyOnFile')}</StatusPill>
              ),
          },
        ]}
      />
      <RecordTable
        label={t('challans')}
        list={challans}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('challans')}</p>}
        columns={[
          { id: 'number', header: t('challanNo'), cell: (row) => <Tag>{row.challanNo}</Tag> },
          { id: 'kind', header: t('kind'), cell: (row) => kinds(row.taxKind) },
          { id: 'period', header: t('period'), cell: (row) => row.period },
          { id: 'paid', header: t('paidOn'), cell: (row) => <DateText value={row.paidOn} /> },
          {
            id: 'amount',
            header: t('amount'),
            align: 'right',
            cell: (row) => <Money value={row.amount} />,
          },
          { id: 'journal', header: t('journal'), cell: (row) => row.journalEntryNo ?? '—' },
        ]}
      />
    </div>
  );
}

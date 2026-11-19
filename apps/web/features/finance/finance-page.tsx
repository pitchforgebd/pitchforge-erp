'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { reportingEndpoints as reporting } from '@pitchforge/contracts';
import { KpiTile, Money, Tabs } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { PageHeader } from '../common/page-header.tsx';
import { useCanRead } from '../common/session.tsx';
import { ForbiddenState } from '../common/states.tsx';

import { AccountsTab, ChequesTab, ClaimsTab, ReconciliationTab } from './bank.tsx';
import { BillsTab } from './bills.tsx';
import { AgeingTab, PayeesTab, RunsTab } from './payments.tsx';
import { TaxTab } from './tax.tsx';

/** The finance figures come from the server's finance dashboard; nothing is summed here. */
function Figures(): ReactNode {
  const dashboard = useQuery({
    queryKey: [reporting.getDashboard.id, 'finance'],
    queryFn: () => browserCall(reporting.getDashboard, { params: { kind: 'finance' } }),
  });
  if (dashboard.data === undefined) return null;
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {dashboard.data.tiles.map((tile) => {
        const value = tile.money !== null ? <Money value={tile.money} /> : (tile.count ?? '—');
        const content = (
          <KpiTile
            label={tile.label}
            value={value}
            {...(tile.hint !== null && { hint: tile.hint })}
          />
        );
        return tile.link === null ? (
          <div key={tile.key}>{content}</div>
        ) : (
          <Link key={tile.key} href={tile.link} className="block rounded-card">
            {content}
          </Link>
        );
      })}
    </div>
  );
}

export function FinancePage(): ReactNode {
  const t = useTranslations('finance');
  const allowed = useCanRead('finance');
  if (!allowed) return <ForbiddenState />;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Figures />
      <Tabs
        label={t('title')}
        items={[
          { value: 'bills', label: t('bills'), content: <BillsTab /> },
          { value: 'runs', label: t('runs'), content: <RunsTab /> },
          { value: 'payees', label: t('payees'), content: <PayeesTab /> },
          { value: 'ageing', label: t('ageing'), content: <AgeingTab /> },
          { value: 'claims', label: t('claimsAndAdvances'), content: <ClaimsTab /> },
          { value: 'bank', label: t('bankAccounts'), content: <AccountsTab /> },
          { value: 'reconciliation', label: t('reconciliation'), content: <ReconciliationTab /> },
          { value: 'cheques', label: t('cheques'), content: <ChequesTab /> },
          { value: 'tax', label: t('tax'), content: <TaxTab /> },
        ]}
      />
    </>
  );
}

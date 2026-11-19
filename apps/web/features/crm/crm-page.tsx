'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Tabs } from '@pitchforge/ui';

import { PageHeader } from '../common/page-header.tsx';
import { useCanRead } from '../common/session.tsx';
import { ForbiddenState } from '../common/states.tsx';

import {
  ClientsTab,
  ContractsTab,
  ForecastTab,
  LeadsTab,
  PipelineTab,
  QuotationsTab,
} from './sales.tsx';
import { GuaranteesTab, TendersTab } from './tenders.tsx';

export function CrmPage(): ReactNode {
  const t = useTranslations('crm');
  const allowed = useCanRead('crm');
  if (!allowed) return <ForbiddenState />;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs
        label={t('title')}
        items={[
          { value: 'pipeline', label: t('pipeline'), content: <PipelineTab /> },
          { value: 'forecast', label: t('forecast'), content: <ForecastTab /> },
          { value: 'leads', label: t('leads'), content: <LeadsTab /> },
          { value: 'clients', label: t('clients'), content: <ClientsTab /> },
          { value: 'quotations', label: t('quotations'), content: <QuotationsTab /> },
          { value: 'contracts', label: t('contracts'), content: <ContractsTab /> },
          { value: 'tenders', label: t('tenders'), content: <TendersTab /> },
          { value: 'guarantees', label: t('guaranteesAndDocuments'), content: <GuaranteesTab /> },
        ]}
      />
    </>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Tabs } from '@pitchforge/ui';

import { PageHeader } from '../common/page-header.tsx';
import { useCanRead } from '../common/session.tsx';
import { ForbiddenState } from '../common/states.tsx';

import { LoansAndSettlementsTab, PayrollRunsTab } from './payroll.tsx';
import { AttendanceTab, EmployeesTab, LeaveAdminTab } from './people.tsx';
import { LeaveRequestsTable, PayslipsTable, SelfServiceTab } from './self-service.tsx';

export function HrPage(): ReactNode {
  const t = useTranslations('hr');
  const allowed = useCanRead('hr');
  const payroll = useCanRead('payroll');
  if (!allowed) return <ForbiddenState />;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs
        label={t('title')}
        items={[
          { value: 'me', label: t('me'), content: <SelfServiceTab /> },
          { value: 'employees', label: t('employees'), content: <EmployeesTab /> },
          { value: 'attendance', label: t('attendance'), content: <AttendanceTab /> },
          {
            value: 'leave',
            label: t('leave'),
            content: (
              <div className="flex flex-col gap-4">
                <LeaveRequestsTable label={t('requests')} />
                <LeaveAdminTab />
              </div>
            ),
          },
          ...(payroll
            ? [
                { value: 'payroll', label: t('payroll'), content: <PayrollRunsTab /> },
                { value: 'payslips', label: t('payslips'), content: <PayslipsTable /> },
                {
                  value: 'loans',
                  label: t('loansAndSettlements'),
                  content: <LoansAndSettlementsTab />,
                },
              ]
            : []),
        ]}
      />
    </>
  );
}

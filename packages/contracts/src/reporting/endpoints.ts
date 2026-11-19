import { z } from 'zod';

import { createOne, listOf } from '../endpoint-helpers.ts';
import { defineEndpoints } from '../endpoint.ts';
import { IsoDate, Uuid } from '../shared/primitives.ts';

import {
  AccountLedger,
  CreateReportSchedule,
  Dashboard,
  DashboardKind,
  FinancialStatement,
  ReportId,
  ReportSchedule,
  ReportTable,
  TrialBalance,
} from './schemas.ts';

const R = '/api/v1/reporting';
const AsOf = z.strictObject({ asOf: IsoDate.optional() });
const Period = z.strictObject({
  from: IsoDate,
  to: IsoDate,
  compareFrom: IsoDate.optional(),
  compareTo: IsoDate.optional(),
});

export const reportingEndpoints = defineEndpoints('reporting', {
  getDashboard: {
    method: 'GET',
    path: `${R}/dashboards/{kind}`,
    summary: 'A dashboard; figures are filtered to the caller’s scope',
    featureIds: ['RPT-01', 'RPT-02', 'RPT-03', 'RPT-04', 'RPT-05', 'RPT-06'],
    params: z.strictObject({ kind: DashboardKind }),
    response: Dashboard,
  },
  getTrialBalance: {
    method: 'GET',
    path: `${R}/trial-balance`,
    summary: 'Trial balance',
    featureIds: ['RPT-07'],
    query: AsOf,
    response: TrialBalance,
  },
  getProfitAndLoss: {
    method: 'GET',
    path: `${R}/profit-and-loss`,
    summary: 'Profit and loss',
    featureIds: ['RPT-07'],
    query: Period,
    response: FinancialStatement,
  },
  getBalanceSheet: {
    method: 'GET',
    path: `${R}/balance-sheet`,
    summary: 'Balance sheet',
    featureIds: ['RPT-07'],
    query: AsOf,
    response: FinancialStatement,
  },
  getCashFlow: {
    method: 'GET',
    path: `${R}/cash-flow`,
    summary: 'Cash flow statement',
    featureIds: ['RPT-07'],
    query: Period,
    response: FinancialStatement,
  },
  getAccountLedger: {
    method: 'GET',
    path: `${R}/general-ledger`,
    summary: 'General ledger of one account, drilling down to source documents',
    featureIds: ['RPT-08', 'RPT-19'],
    query: z.strictObject({ accountId: Uuid, from: IsoDate, to: IsoDate }),
    response: AccountLedger,
  },
  getReport: {
    method: 'GET',
    path: `${R}/reports/{report}`,
    summary: 'A tabular report; restricted columns are left out for the caller',
    featureIds: [
      'RPT-08',
      'RPT-09',
      'RPT-10',
      'RPT-11',
      'RPT-12',
      'RPT-13',
      'RPT-14',
      'RPT-15',
      'RPT-16',
      'RPT-17',
      'PAY-13',
    ],
    params: z.strictObject({ report: ReportId }),
    query: z.strictObject({
      from: IsoDate.optional(),
      to: IsoDate.optional(),
      projectId: Uuid.optional(),
    }),
    response: ReportTable,
    errors: ['RATE_LIMITED'],
  },
  listReportSchedules: listOf(
    `${R}/report-schedules`,
    'Scheduled report emails',
    ['RPT-20'],
    ReportSchedule,
  ),
  createReportSchedule: createOne(
    `${R}/report-schedules`,
    'Schedule a report email; exports use core exports',
    ['RPT-20'],
    CreateReportSchedule,
    ReportSchedule,
  ),
});

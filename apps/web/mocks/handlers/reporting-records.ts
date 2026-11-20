import { reportingEndpoints as reporting } from '@pitchforge/contracts';
import type { ReportId } from '@pitchforge/contracts';

import { rid } from '../data/core-records.ts';
import {
  BALANCE_SHEET,
  CASH_FLOW,
  SCHEDULES,
  TRIAL_BALANCE,
  accountLedgerOf,
  profitAndLoss,
  readsReports,
  reportFor,
} from '../data/reporting-records.ts';
import type { MockHandler, MockReply } from '../define.ts';
import { bodyOf, serveList, withViewerAsync } from '../serve.ts';
import type { Viewer } from '../serve.ts';

const queryOf = (url: string) => new URL(url).searchParams;

/** The books are for partners and finance; anyone else is refused. */
const booksOnly = (viewer: Viewer, reply: () => MockReply | Promise<MockReply>) =>
  readsReports(viewer.role) ? reply() : ({ problem: 'FORBIDDEN' } as const);

export const reportingRecordHandlers: readonly MockHandler[] = [
  withViewerAsync(reporting.getTrialBalance, (viewer) =>
    booksOnly(viewer, () => ({ json: TRIAL_BALANCE })),
  ),
  withViewerAsync(reporting.getProfitAndLoss, (viewer, request) =>
    booksOnly(viewer, () => {
      const query = queryOf(request.request.url);
      if (query.get('from') === null || query.get('to') === null) return { problem: 'VALIDATION' };
      return { json: profitAndLoss(query.get('compareFrom') !== null) };
    }),
  ),
  withViewerAsync(reporting.getBalanceSheet, (viewer) =>
    booksOnly(viewer, () => ({ json: BALANCE_SHEET })),
  ),
  withViewerAsync(reporting.getCashFlow, (viewer, request) =>
    booksOnly(viewer, () => {
      const query = queryOf(request.request.url);
      return query.get('from') === null || query.get('to') === null
        ? { problem: 'VALIDATION' }
        : { json: CASH_FLOW };
    }),
  ),
  withViewerAsync(reporting.getAccountLedger, (viewer, request) =>
    booksOnly(viewer, () => {
      const query = queryOf(request.request.url);
      const from = query.get('from');
      const to = query.get('to');
      const ledger =
        from === null || to === null
          ? undefined
          : accountLedgerOf(query.get('accountId') ?? '', from, to);
      return ledger === undefined ? { problem: 'VALIDATION' } : { json: ledger };
    }),
  ),
  withViewerAsync(reporting.getReport, (viewer, request) =>
    booksOnly(viewer, () => {
      const id = request.path.split('/').at(-1) ?? '';
      const table = reportFor(id as ReportId, viewer.role);
      return table === undefined ? { problem: 'NOT_FOUND' } : { json: table };
    }),
  ),
  serveList(reporting.listReportSchedules, (viewer) =>
    readsReports(viewer.role) ? SCHEDULES : [],
  ),
  withViewerAsync(reporting.createReportSchedule, (viewer, request) =>
    booksOnly(viewer, async () => ({
      json: {
        ...(await bodyOf(request)),
        id: rid(9709),
        nextRunAt: '2026-11-21T02:00:00Z',
      },
    })),
  ),
];

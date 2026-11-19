import { z } from 'zod';

import { AccountCode, IsoDate, Money, Timestamp, Uuid } from '../shared/primitives.ts';
import { RecordRef } from '../shared/record.ts';

/** A line of a financial statement; `accountId` opens the drill-down (RPT-19). */
export const StatementRow = z
  .object({
    label: z.string(),
    accountId: Uuid.nullable(),
    accountCode: AccountCode.nullable(),
    amount: Money,
    comparative: Money.nullable(),
    isTotal: z.boolean(),
  })
  .meta({ id: 'StatementRow' });
export type StatementRow = z.infer<typeof StatementRow>;

export const StatementSection = z
  .object({ title: z.string(), rows: z.array(StatementRow), total: Money })
  .meta({ id: 'StatementSection' });
export type StatementSection = z.infer<typeof StatementSection>;

/** Every figure comes from the ledger through the server. */
export const FinancialStatement = z
  .object({
    title: z.string(),
    from: IsoDate.nullable(),
    to: IsoDate,
    sections: z.array(StatementSection),
    result: Money,
    generatedAt: Timestamp,
  })
  .meta({ id: 'FinancialStatement' });
export type FinancialStatement = z.infer<typeof FinancialStatement>;

export const TrialBalanceRow = z
  .object({
    accountId: Uuid,
    accountCode: AccountCode,
    accountName: z.string(),
    debit: Money,
    credit: Money,
  })
  .meta({ id: 'TrialBalanceRow' });
export type TrialBalanceRow = z.infer<typeof TrialBalanceRow>;

export const TrialBalance = z
  .object({
    asOf: IsoDate,
    rows: z.array(TrialBalanceRow),
    totalDebit: Money,
    totalCredit: Money,
    generatedAt: Timestamp,
  })
  .meta({ id: 'TrialBalance' });
export type TrialBalance = z.infer<typeof TrialBalance>;

/** One line of an account's ledger, linking to its entry and source document. */
export const LedgerRow = z
  .object({
    date: IsoDate,
    entryNo: z.string(),
    description: z.string(),
    source: RecordRef.nullable(),
    debit: Money,
    credit: Money,
    balance: Money,
  })
  .meta({ id: 'LedgerRow' });
export type LedgerRow = z.infer<typeof LedgerRow>;

export const AccountLedger = z
  .object({
    accountId: Uuid,
    accountName: z.string(),
    from: IsoDate,
    to: IsoDate,
    opening: Money,
    rows: z.array(LedgerRow),
    closing: Money,
  })
  .meta({ id: 'AccountLedger' });
export type AccountLedger = z.infer<typeof AccountLedger>;

export const ReportId = z
  .enum([
    'cash_book',
    'budget_vs_actual',
    'milestone_slippage',
    'partner_distribution',
    'payee_payments',
    'vat_summary',
    'withholding_summary',
    'pipeline',
    'win_loss',
    'tenders_and_guarantees',
    'timesheets',
    'utilisation',
    'labour_cost',
    'payroll_summary',
    'hr_headcount',
    'leave_summary',
    'procurement_spend',
    'asset_register',
  ])
  .meta({ id: 'ReportId' });
export type ReportId = z.infer<typeof ReportId>;

export const ReportColumn = z
  .object({ key: z.string(), label: z.string(), kind: z.enum(['text', 'money', 'date', 'number']) })
  .meta({ id: 'ReportColumn' });
export type ReportColumn = z.infer<typeof ReportColumn>;

/**
 * A tabular report. Columns are chosen by the server for the caller: a restricted column is
 * left out of `columns` and of every row, never sent and hidden. Cells are strings or Money.
 */
export const ReportTable = z
  .object({
    report: ReportId,
    title: z.string(),
    from: IsoDate.nullable(),
    to: IsoDate.nullable(),
    columns: z.array(ReportColumn),
    rows: z.array(z.record(z.string(), z.union([z.string(), Money, z.null()]))),
    generatedAt: Timestamp,
  })
  .meta({ id: 'ReportTable' });
export type ReportTable = z.infer<typeof ReportTable>;

export const DashboardKind = z
  .enum(['partner', 'finance', 'pm', 'sales', 'hr', 'employee'])
  .meta({ id: 'DashboardKind' });
export type DashboardKind = z.infer<typeof DashboardKind>;

export const DashboardTile = z
  .object({
    key: z.string(),
    label: z.string(),
    /** A preformatted count or an amount, always from the server. */
    money: Money.nullable(),
    count: z.number().int().nullable(),
    hint: z.string().nullable(),
    link: z.string().nullable(),
  })
  .meta({ id: 'DashboardTile' });
export type DashboardTile = z.infer<typeof DashboardTile>;

export const Dashboard = z
  .object({ kind: DashboardKind, tiles: z.array(DashboardTile), generatedAt: Timestamp })
  .meta({ id: 'Dashboard' });
export type Dashboard = z.infer<typeof Dashboard>;

export const ReportSchedule = z
  .object({
    id: Uuid,
    report: ReportId,
    format: z.enum(['pdf', 'xlsx', 'csv']),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    recipientUserIds: z.array(Uuid),
    nextRunAt: Timestamp,
  })
  .meta({ id: 'ReportSchedule' });
export type ReportSchedule = z.infer<typeof ReportSchedule>;

/** Recipients are users, so each email goes through their own permissions. */
export const CreateReportSchedule = z
  .strictObject({
    report: ReportId,
    format: z.enum(['pdf', 'xlsx', 'csv']),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    recipientUserIds: z.array(Uuid).min(1).max(50),
  })
  .meta({ id: 'CreateReportSchedule' });
export type CreateReportSchedule = z.infer<typeof CreateReportSchedule>;

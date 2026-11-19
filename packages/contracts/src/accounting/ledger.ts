import { z } from 'zod';

import {
  AccountCode,
  DocumentNo,
  IsoDate,
  NonNegativeMoney,
  Rate,
  Reason,
  Timestamp,
  Uuid,
} from '../shared/primitives.ts';
import { AuditMeta, PersonRef, allowedActions } from '../shared/record.ts';

/* Chart of accounts ------------------------------------------------------------------------- */

export const AccountType = z
  .enum(['asset', 'liability', 'equity', 'income', 'expense'])
  .meta({ id: 'AccountType' });
export type AccountType = z.infer<typeof AccountType>;

export const Account = z
  .object({
    id: Uuid,
    code: AccountCode,
    name: z.string(),
    type: AccountType,
    normalBalance: z.enum(['debit', 'credit']),
    parentId: Uuid.nullable(),
    /** Control accounts (AR, AP, payroll payable) are written only by the posting engine. */
    isControl: z.boolean(),
    active: z.boolean(),
    allowedActions: allowedActions(['update', 'deactivate']),
    meta: AuditMeta,
  })
  .meta({ id: 'Account' });
export type Account = z.infer<typeof Account>;

export const CreateAccount = z
  .strictObject({
    code: AccountCode,
    name: z.string().trim().min(2).max(120),
    type: AccountType,
    parentId: Uuid.nullable(),
  })
  .meta({ id: 'CreateAccount' });
export type CreateAccount = z.infer<typeof CreateAccount>;

export const UpdateAccount = z
  .strictObject({
    name: z.string().trim().min(2).max(120),
    parentId: Uuid.nullable(),
    active: z.boolean(),
  })
  .partial()
  .meta({ id: 'UpdateAccount' });
export type UpdateAccount = z.infer<typeof UpdateAccount>;

/* Fiscal periods and close ------------------------------------------------------------------- */

export const FiscalPeriod = z
  .object({
    id: Uuid,
    fiscalYearCode: z.string().regex(/^[0-9]{4}$/),
    number: z.number().int().min(1).max(12),
    startDate: IsoDate,
    endDate: IsoDate,
    status: z.enum(['open', 'locked']),
    lockedAt: Timestamp.nullable(),
    lockedBy: PersonRef.nullable(),
    allowedActions: allowedActions(['lock', 'reopen']),
    meta: AuditMeta,
  })
  .meta({ id: 'FiscalPeriod' });
export type FiscalPeriod = z.infer<typeof FiscalPeriod>;

export const ReopenPeriod = z.strictObject({ reason: Reason }).meta({ id: 'ReopenPeriod' });
export type ReopenPeriod = z.infer<typeof ReopenPeriod>;

export const CloseChecklistItem = z
  .object({
    key: z.string(),
    label: z.string(),
    done: z.boolean(),
    doneBy: PersonRef.nullable(),
    doneAt: Timestamp.nullable(),
  })
  .meta({ id: 'CloseChecklistItem' });
export type CloseChecklistItem = z.infer<typeof CloseChecklistItem>;

export const CloseChecklist = z
  .object({ periodId: Uuid, items: z.array(CloseChecklistItem) })
  .meta({ id: 'CloseChecklist' });
export type CloseChecklist = z.infer<typeof CloseChecklist>;

export const UpdateChecklistItem = z
  .strictObject({ key: z.string().min(1).max(60), done: z.boolean() })
  .meta({ id: 'UpdateChecklistItem' });
export type UpdateChecklistItem = z.infer<typeof UpdateChecklistItem>;

export const CloseFiscalYear = z
  .strictObject({ fiscalYearCode: z.string().regex(/^[0-9]{4}$/) })
  .meta({ id: 'CloseFiscalYear' });
export type CloseFiscalYear = z.infer<typeof CloseFiscalYear>;

export const FiscalYearClosed = z
  .object({ fiscalYearCode: z.string(), journalEntryNo: DocumentNo })
  .meta({ id: 'FiscalYearClosed' });
export type FiscalYearClosed = z.infer<typeof FiscalYearClosed>;

/* Journal ------------------------------------------------------------------------------------ */

/** Real references on every journal line (FIN-04); never a polymorphic pair. */
export const Dimensions = z
  .object({
    projectId: Uuid.nullable(),
    departmentId: Uuid.nullable(),
    costCenterId: Uuid.nullable(),
    employeeId: Uuid.nullable(),
    partnerId: Uuid.nullable(),
    contactId: Uuid.nullable(),
  })
  .meta({ id: 'Dimensions' });
export type Dimensions = z.infer<typeof Dimensions>;

export const JournalLine = z
  .object({
    id: Uuid,
    accountId: Uuid,
    accountCode: AccountCode,
    accountName: z.string(),
    description: z.string().nullable(),
    debit: NonNegativeMoney,
    credit: NonNegativeMoney,
    fxRate: Rate,
    dimensions: Dimensions,
  })
  .meta({ id: 'JournalLine' });
export type JournalLine = z.infer<typeof JournalLine>;

/** A posted entry is immutable: it has no update endpoint, only `reverse`. */
export const JournalEntry = z
  .object({
    id: Uuid,
    entryNo: DocumentNo,
    entryDate: IsoDate,
    periodId: Uuid,
    sourceType: z.string(),
    sourceId: Uuid.nullable(),
    description: z.string(),
    status: z.enum(['posted', 'reversed']),
    reversalOfId: Uuid.nullable(),
    reversedById: Uuid.nullable(),
    lines: z.array(JournalLine).min(2),
    /** Totals are calculated by the server. */
    totalDebit: NonNegativeMoney,
    totalCredit: NonNegativeMoney,
    postedAt: Timestamp,
    postedBy: PersonRef,
    allowedActions: allowedActions(['reverse']),
  })
  .meta({ id: 'JournalEntry' });
export type JournalEntry = z.infer<typeof JournalEntry>;

export const ReverseJournalEntry = z
  .strictObject({ reversalDate: IsoDate, reason: Reason })
  .meta({ id: 'ReverseJournalEntry' });
export type ReverseJournalEntry = z.infer<typeof ReverseJournalEntry>;

export const ReversalResult = z
  .object({ original: JournalEntry, reversal: JournalEntry })
  .meta({ id: 'ReversalResult' });
export type ReversalResult = z.infer<typeof ReversalResult>;

const ManualJournalLineInput = z
  .strictObject({
    accountId: Uuid,
    description: z.string().trim().max(200).nullable(),
    debit: NonNegativeMoney,
    credit: NonNegativeMoney,
    projectId: Uuid.nullable(),
    departmentId: Uuid.nullable(),
    costCenterId: Uuid.nullable(),
    employeeId: Uuid.nullable(),
    partnerId: Uuid.nullable(),
    contactId: Uuid.nullable(),
  })
  .meta({ id: 'ManualJournalLineInput' });

export const ManualJournalStatus = z
  .enum(['draft', 'pending_approval', 'posted', 'rejected'])
  .meta({ id: 'ManualJournalStatus' });
export type ManualJournalStatus = z.infer<typeof ManualJournalStatus>;

/** A proposal: the server checks balance and control accounts when it is submitted. */
export const ManualJournal = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    entryDate: IsoDate,
    description: z.string(),
    status: ManualJournalStatus,
    approvalId: Uuid.nullable(),
    lines: z.array(ManualJournalLineInput),
    journalEntryNo: DocumentNo.nullable(),
    fileIds: z.array(Uuid),
    allowedActions: allowedActions(['update', 'submit', 'delete']),
    meta: AuditMeta,
  })
  .meta({ id: 'ManualJournal' });
export type ManualJournal = z.infer<typeof ManualJournal>;

export const CreateManualJournal = z
  .strictObject({
    entryDate: IsoDate,
    description: z.string().trim().min(3).max(300),
    lines: z.array(ManualJournalLineInput).min(2).max(200),
    fileIds: z.array(Uuid).max(20),
  })
  .meta({ id: 'CreateManualJournal' });
export type CreateManualJournal = z.infer<typeof CreateManualJournal>;

export const UpdateManualJournal = CreateManualJournal.partial().meta({
  id: 'UpdateManualJournal',
});
export type UpdateManualJournal = z.infer<typeof UpdateManualJournal>;

/* Posting rules ------------------------------------------------------------------------------ */

const PostingRuleLine = z
  .strictObject({
    side: z.enum(['debit', 'credit']),
    accountId: Uuid,
    /** Which document amount this line takes: "net", "vat", "tds" … */
    amountField: z.string().regex(/^[a-z][a-z_]*$/),
  })
  .meta({ id: 'PostingRuleLine' });

/** Effective-dated configuration (R7), reviewed by finance; never code. */
export const PostingRule = z
  .object({
    id: Uuid,
    sourceType: z.string(),
    name: z.string(),
    lines: z.array(PostingRuleLine).min(2),
    validFrom: IsoDate,
    validTo: IsoDate.nullable(),
    meta: AuditMeta,
  })
  .meta({ id: 'PostingRule' });
export type PostingRule = z.infer<typeof PostingRule>;

export const CreatePostingRuleVersion = z
  .strictObject({
    sourceType: z.string().regex(/^[a-z][a-z_]*$/),
    name: z.string().trim().min(2).max(120),
    lines: z.array(PostingRuleLine).min(2).max(20),
    validFrom: IsoDate,
  })
  .meta({ id: 'CreatePostingRuleVersion' });
export type CreatePostingRuleVersion = z.infer<typeof CreatePostingRuleVersion>;

/** Result of a command that writes one journal entry. */
export const PostedResult = z.object({ journalEntryNo: DocumentNo }).meta({ id: 'PostedResult' });
export type PostedResult = z.infer<typeof PostedResult>;

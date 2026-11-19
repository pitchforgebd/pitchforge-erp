import { z } from 'zod';

import {
  AccountCode,
  CurrencyCode,
  DocumentNo,
  IsoDate,
  Masked,
  Money,
  NonNegativeMoney,
  PositiveMoney,
  Rate,
  Uuid,
} from '../shared/primitives.ts';
import { AuditMeta, allowedActions, restricted } from '../shared/record.ts';

export const BankAccountKind = z
  .enum(['bank', 'cash', 'bkash', 'nagad', 'rocket'])
  .meta({ id: 'BankAccountKind' });
export type BankAccountKind = z.infer<typeof BankAccountKind>;

export const BankAccount = z
  .object({
    id: Uuid,
    name: z.string(),
    kind: BankAccountKind,
    institution: z.string().nullable(),
    accountNumber: restricted(Masked.nullable(), 'bank'),
    currency: CurrencyCode,
    ledgerAccountCode: AccountCode,
    balance: Money,
    active: z.boolean(),
    allowedActions: allowedActions(['update', 'deactivate']),
    meta: AuditMeta,
  })
  .meta({ id: 'BankAccount' });
export type BankAccount = z.infer<typeof BankAccount>;

export const CreateBankAccount = z
  .strictObject({
    name: z.string().trim().min(2).max(120),
    kind: BankAccountKind,
    institution: z.string().trim().max(120).nullable(),
    accountNumber: z.string().trim().min(5).max(34).nullable(),
    currency: CurrencyCode,
    ledgerAccountCode: AccountCode,
  })
  .meta({ id: 'CreateBankAccount' });
export type CreateBankAccount = z.infer<typeof CreateBankAccount>;

export const UpdateBankAccount = CreateBankAccount.omit({ currency: true, ledgerAccountCode: true })
  .extend({ active: z.boolean() })
  .partial()
  .meta({ id: 'UpdateBankAccount' });
export type UpdateBankAccount = z.infer<typeof UpdateBankAccount>;

export const Transfer = z
  .object({
    id: Uuid,
    number: DocumentNo,
    date: IsoDate,
    fromAccountId: Uuid,
    toAccountId: Uuid,
    amount: PositiveMoney,
    charges: NonNegativeMoney,
    note: z.string().nullable(),
    journalEntryNo: DocumentNo,
    meta: AuditMeta,
  })
  .meta({ id: 'Transfer' });
export type Transfer = z.infer<typeof Transfer>;

export const CreateTransfer = z
  .strictObject({
    date: IsoDate,
    fromAccountId: Uuid,
    toAccountId: Uuid,
    amount: PositiveMoney,
    charges: NonNegativeMoney,
    note: z.string().trim().max(300).nullable(),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, 'Choose two different accounts')
  .meta({ id: 'CreateTransfer' });
export type CreateTransfer = z.infer<typeof CreateTransfer>;

/* Statements and reconciliation --------------------------------------------------------------- */

export const ImportBankStatement = z
  .strictObject({ bankAccountId: Uuid, fileId: Uuid })
  .meta({ id: 'ImportBankStatement' });
export type ImportBankStatement = z.infer<typeof ImportBankStatement>;

export const BankStatementLine = z
  .object({
    id: Uuid,
    bankAccountId: Uuid,
    date: IsoDate,
    description: z.string(),
    /** Positive for money in, negative for money out. */
    amount: Money,
    status: z.enum(['unmatched', 'matched', 'posted']),
    matchedEntryNo: DocumentNo.nullable(),
    suggestedEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['match', 'unmatch', 'post_charge']),
  })
  .meta({ id: 'BankStatementLine' });
export type BankStatementLine = z.infer<typeof BankStatementLine>;

export const MatchStatementLine = z
  .strictObject({ journalEntryId: Uuid })
  .meta({ id: 'MatchStatementLine' });
export type MatchStatementLine = z.infer<typeof MatchStatementLine>;

/** Post a bank charge or interest line straight from the statement. */
export const PostStatementLine = z
  .strictObject({
    accountCode: AccountCode,
    description: z.string().trim().min(3).max(200),
  })
  .meta({ id: 'PostStatementLine' });
export type PostStatementLine = z.infer<typeof PostStatementLine>;

export const ReconciliationSummary = z
  .object({
    bankAccountId: Uuid,
    asOf: IsoDate,
    statementBalance: Money,
    ledgerBalance: Money,
    difference: Money,
    unmatchedLines: z.number().int().min(0),
  })
  .meta({ id: 'ReconciliationSummary' });
export type ReconciliationSummary = z.infer<typeof ReconciliationSummary>;

/* Cheques ------------------------------------------------------------------------------------- */

export const ChequeStatus = z
  .enum(['issued', 'received', 'presented', 'cleared', 'bounced', 'cancelled'])
  .meta({ id: 'ChequeStatus' });
export type ChequeStatus = z.infer<typeof ChequeStatus>;

export const Cheque = z
  .object({
    id: Uuid,
    chequeNo: z.string(),
    direction: z.enum(['issued', 'received']),
    bankAccountId: Uuid,
    partyName: z.string(),
    amount: PositiveMoney,
    /** A date after today makes it post-dated. */
    chequeDate: IsoDate,
    status: ChequeStatus,
    allowedActions: allowedActions(['set_status']),
    meta: AuditMeta,
  })
  .meta({ id: 'Cheque' });
export type Cheque = z.infer<typeof Cheque>;

export const CreateCheque = z
  .strictObject({
    chequeNo: z.string().trim().min(1).max(30),
    direction: z.enum(['issued', 'received']),
    bankAccountId: Uuid,
    partyName: z.string().trim().min(2).max(200),
    amount: PositiveMoney,
    chequeDate: IsoDate,
  })
  .meta({ id: 'CreateCheque' });
export type CreateCheque = z.infer<typeof CreateCheque>;

export const SetChequeStatus = z
  .strictObject({ status: ChequeStatus })
  .meta({ id: 'SetChequeStatus' });
export type SetChequeStatus = z.infer<typeof SetChequeStatus>;

/* Exchange rates (manual, FIN-21) -------------------------------------------------------------- */

export const ExchangeRate = z
  .object({ id: Uuid, currency: CurrencyCode, date: IsoDate, rate: Rate, meta: AuditMeta })
  .meta({ id: 'ExchangeRate' });
export type ExchangeRate = z.infer<typeof ExchangeRate>;

export const CreateExchangeRate = z
  .strictObject({ currency: CurrencyCode, date: IsoDate, rate: Rate })
  .meta({ id: 'CreateExchangeRate' });
export type CreateExchangeRate = z.infer<typeof CreateExchangeRate>;

import { z } from 'zod';

import {
  AccountCode,
  DocumentNo,
  IsoDate,
  Money,
  NonNegativeMoney,
  PositiveMoney,
  Timestamp,
  Uuid,
} from '../shared/primitives.ts';
import { AuditMeta, PersonRef, allowedActions } from '../shared/record.ts';

/* Vendor bills ------------------------------------------------------------------------------- */

export const VendorBillStatus = z
  .enum(['draft', 'pending_approval', 'ready_to_pay', 'partially_paid', 'paid', 'rejected'])
  .meta({ id: 'VendorBillStatus' });
export type VendorBillStatus = z.infer<typeof VendorBillStatus>;

export const VendorBill = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    vendorId: Uuid,
    vendorName: z.string(),
    projectId: Uuid.nullable(),
    accountCode: AccountCode,
    description: z.string(),
    billDate: IsoDate,
    dueDate: IsoDate,
    net: NonNegativeMoney,
    vat: NonNegativeMoney,
    /** Server-calculated: net + VAT, what remains unpaid, and journal link. */
    gross: NonNegativeMoney,
    balanceDue: NonNegativeMoney,
    journalEntryNo: DocumentNo.nullable(),
    status: VendorBillStatus,
    approvalId: Uuid.nullable(),
    fileIds: z.array(Uuid),
    allowedActions: allowedActions(['update', 'submit', 'approve', 'reject', 'pay']),
    meta: AuditMeta,
  })
  .meta({ id: 'VendorBill' });
export type VendorBill = z.infer<typeof VendorBill>;

export const CreateVendorBill = z
  .strictObject({
    vendorId: Uuid,
    projectId: Uuid.nullable(),
    accountCode: AccountCode,
    description: z.string().trim().min(3).max(300),
    billDate: IsoDate,
    dueDate: IsoDate,
    net: PositiveMoney,
    vat: NonNegativeMoney,
    fileIds: z.array(Uuid).max(20),
  })
  .meta({ id: 'CreateVendorBill' });
export type CreateVendorBill = z.infer<typeof CreateVendorBill>;

export const UpdateVendorBill = CreateVendorBill.partial().meta({ id: 'UpdateVendorBill' });
export type UpdateVendorBill = z.infer<typeof UpdateVendorBill>;

/* Payment runs ------------------------------------------------------------------------------- */

export const PaymentRunStatus = z
  .enum(['draft', 'pending_approval', 'paid', 'rejected'])
  .meta({ id: 'PaymentRunStatus' });
export type PaymentRunStatus = z.infer<typeof PaymentRunStatus>;

/** Withholding is calculated by the server from the effective-dated tables. */
export const PaymentRunLine = z
  .object({
    billId: Uuid,
    billNumber: DocumentNo,
    payeeName: z.string(),
    amount: PositiveMoney,
    tds: NonNegativeMoney,
    vds: NonNegativeMoney,
    netPaid: NonNegativeMoney,
  })
  .meta({ id: 'PaymentRunLine' });
export type PaymentRunLine = z.infer<typeof PaymentRunLine>;

export const PaymentRun = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    paymentDate: IsoDate,
    bankAccountId: Uuid,
    status: PaymentRunStatus,
    approvalId: Uuid.nullable(),
    lines: z.array(PaymentRunLine).min(1),
    totalNetPaid: NonNegativeMoney,
    preparedBy: PersonRef,
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['update', 'submit', 'approve', 'reject', 'export_advice']),
    meta: AuditMeta,
  })
  .meta({ id: 'PaymentRun' });
export type PaymentRun = z.infer<typeof PaymentRun>;

export const CreatePaymentRun = z
  .strictObject({
    paymentDate: IsoDate,
    bankAccountId: Uuid,
    /** Partial payments: `amount` may be below the bill's balance due. */
    lines: z
      .array(z.strictObject({ billId: Uuid, amount: PositiveMoney }))
      .min(1)
      .max(500),
  })
  .meta({ id: 'CreatePaymentRun' });
export type CreatePaymentRun = z.infer<typeof CreatePaymentRun>;

export const UpdatePaymentRun = CreatePaymentRun.partial().meta({ id: 'UpdatePaymentRun' });
export type UpdatePaymentRun = z.infer<typeof UpdatePaymentRun>;

/* Payees and ageing -------------------------------------------------------------------------- */

export const Payee = z
  .object({
    id: Uuid,
    name: z.string(),
    kind: z.enum(['vendor', 'employee', 'freelancer', 'partner']),
    paidThisFiscalYear: NonNegativeMoney,
    withheldThisFiscalYear: NonNegativeMoney,
    outstanding: NonNegativeMoney,
  })
  .meta({ id: 'Payee' });
export type Payee = z.infer<typeof Payee>;

export const PayeePayment = z
  .object({
    date: IsoDate,
    reference: DocumentNo,
    documentNo: DocumentNo.nullable(),
    gross: NonNegativeMoney,
    tds: NonNegativeMoney,
    vds: NonNegativeMoney,
    netPaid: NonNegativeMoney,
  })
  .meta({ id: 'PayeePayment' });
export type PayeePayment = z.infer<typeof PayeePayment>;

export const AgeingRow = z
  .object({
    partyId: Uuid,
    partyName: z.string(),
    notDue: NonNegativeMoney,
    days1To30: NonNegativeMoney,
    days31To60: NonNegativeMoney,
    days61To90: NonNegativeMoney,
    over90: NonNegativeMoney,
    total: NonNegativeMoney,
  })
  .meta({ id: 'AgeingRow' });
export type AgeingRow = z.infer<typeof AgeingRow>;

export const AgeingReport = z
  .object({
    asOf: IsoDate,
    rows: z.array(AgeingRow),
    totals: AgeingRow.omit({ partyId: true, partyName: true }),
  })
  .meta({ id: 'AgeingReport' });
export type AgeingReport = z.infer<typeof AgeingReport>;

export const PartyStatementLine = z
  .object({
    date: IsoDate,
    reference: z.string(),
    description: z.string(),
    debit: NonNegativeMoney,
    credit: NonNegativeMoney,
    balance: Money,
  })
  .meta({ id: 'PartyStatementLine' });
export type PartyStatementLine = z.infer<typeof PartyStatementLine>;

export const PartyStatement = z
  .object({
    partyId: Uuid,
    partyName: z.string(),
    from: IsoDate,
    to: IsoDate,
    opening: Money,
    lines: z.array(PartyStatementLine),
    closing: Money,
  })
  .meta({ id: 'PartyStatement' });
export type PartyStatement = z.infer<typeof PartyStatement>;

/* Expense claims and advances ---------------------------------------------------------------- */

export const ClaimStatus = z
  .enum(['draft', 'pending_approval', 'approved', 'paid', 'rejected'])
  .meta({ id: 'ClaimStatus' });
export type ClaimStatus = z.infer<typeof ClaimStatus>;

export const ExpenseClaim = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    employee: PersonRef,
    projectId: Uuid.nullable(),
    accountCode: AccountCode,
    description: z.string(),
    expenseDate: IsoDate,
    amount: PositiveMoney,
    status: ClaimStatus,
    approvalId: Uuid.nullable(),
    fileIds: z.array(Uuid),
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['update', 'submit', 'pay']),
    meta: AuditMeta,
  })
  .meta({ id: 'ExpenseClaim' });
export type ExpenseClaim = z.infer<typeof ExpenseClaim>;

export const CreateExpenseClaim = z
  .strictObject({
    projectId: Uuid.nullable(),
    accountCode: AccountCode,
    description: z.string().trim().min(3).max(300),
    expenseDate: IsoDate,
    amount: PositiveMoney,
    fileIds: z.array(Uuid).max(20),
  })
  .meta({ id: 'CreateExpenseClaim' });
export type CreateExpenseClaim = z.infer<typeof CreateExpenseClaim>;

export const PayDocument = z
  .strictObject({ bankAccountId: Uuid, paymentDate: IsoDate })
  .meta({ id: 'PayDocument' });
export type PayDocument = z.infer<typeof PayDocument>;

export const EmployeeAdvance = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    employee: PersonRef,
    purpose: z.string(),
    amount: PositiveMoney,
    settled: NonNegativeMoney,
    outstanding: NonNegativeMoney,
    status: z.enum(['draft', 'pending_approval', 'paid', 'settled', 'rejected']),
    approvalId: Uuid.nullable(),
    requestedAt: Timestamp,
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['submit', 'pay', 'settle']),
    meta: AuditMeta,
  })
  .meta({ id: 'EmployeeAdvance' });
export type EmployeeAdvance = z.infer<typeof EmployeeAdvance>;

export const CreateEmployeeAdvance = z
  .strictObject({ purpose: z.string().trim().min(3).max(300), amount: PositiveMoney })
  .meta({ id: 'CreateEmployeeAdvance' });
export type CreateEmployeeAdvance = z.infer<typeof CreateEmployeeAdvance>;

export const SettleAdvance = z
  .strictObject({
    expenseClaimIds: z.array(Uuid).max(50),
    returnedAmount: NonNegativeMoney,
    bankAccountId: Uuid.nullable(),
  })
  .meta({ id: 'SettleAdvance' });
export type SettleAdvance = z.infer<typeof SettleAdvance>;

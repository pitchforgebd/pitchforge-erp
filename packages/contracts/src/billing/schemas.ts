import { z } from 'zod';

import {
  DocumentNo,
  IsoDate,
  NonNegativeMoney,
  PositiveMoney,
  Quantity,
  Reason,
  Uuid,
} from '../shared/primitives.ts';
import { AuditMeta, allowedActions } from '../shared/record.ts';

export const InvoiceStatus = z
  .enum(['draft', 'posted', 'partially_paid', 'paid', 'credited'])
  .meta({ id: 'InvoiceStatus' });
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

const InvoiceLineInput = z
  .strictObject({
    description: z.string().trim().min(2).max(300),
    quantity: Quantity,
    unitPrice: PositiveMoney,
    /** Effective-dated tax code; the server works out the VAT. */
    taxCodeId: Uuid.nullable(),
  })
  .meta({ id: 'InvoiceLineInput' });

export const SalesInvoice = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    kind: z.enum(['standard', 'advance']),
    clientId: Uuid,
    clientName: z.string(),
    projectId: Uuid.nullable(),
    /** What it was raised from (BIL-01). */
    source: z.enum(['manual', 'milestone', 'billing_plan', 'timesheet']),
    sourceId: Uuid.nullable(),
    issueDate: IsoDate,
    dueDate: IsoDate,
    lines: z.array(InvoiceLineInput),
    /** Server-calculated. */
    net: NonNegativeMoney,
    vat: NonNegativeMoney,
    advanceAdjusted: NonNegativeMoney,
    total: NonNegativeMoney,
    balanceDue: NonNegativeMoney,
    status: InvoiceStatus,
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['update', 'post', 'send_reminder']),
    meta: AuditMeta,
  })
  .meta({ id: 'SalesInvoice' });
export type SalesInvoice = z.infer<typeof SalesInvoice>;

export const CreateSalesInvoice = z
  .strictObject({
    kind: z.enum(['standard', 'advance']),
    clientId: Uuid,
    projectId: Uuid.nullable(),
    source: z.enum(['manual', 'milestone', 'billing_plan', 'timesheet']),
    sourceId: Uuid.nullable(),
    issueDate: IsoDate,
    dueDate: IsoDate,
    lines: z.array(InvoiceLineInput).min(1).max(100),
    /** Advance invoices to set against this one (BIL-03). */
    adjustAdvanceInvoiceIds: z.array(Uuid).max(20),
  })
  .meta({ id: 'CreateSalesInvoice' });
export type CreateSalesInvoice = z.infer<typeof CreateSalesInvoice>;

export const UpdateSalesInvoice = CreateSalesInvoice.partial().meta({ id: 'UpdateSalesInvoice' });
export type UpdateSalesInvoice = z.infer<typeof UpdateSalesInvoice>;

export const ReceiptAllocation = z
  .strictObject({ invoiceId: Uuid, amount: PositiveMoney })
  .meta({ id: 'ReceiptAllocation' });
export type ReceiptAllocation = z.infer<typeof ReceiptAllocation>;

export const Receipt = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    clientId: Uuid,
    clientName: z.string(),
    date: IsoDate,
    bankAccountId: Uuid,
    /** Cash received. */
    amount: PositiveMoney,
    /** Deducted by the client (BIL-05). */
    ait: NonNegativeMoney,
    vds: NonNegativeMoney,
    retention: NonNegativeMoney,
    allocations: z.array(ReceiptAllocation).min(1),
    status: z.enum(['draft', 'posted', 'reversed']),
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['update', 'post']),
    meta: AuditMeta,
  })
  .meta({ id: 'Receipt' });
export type Receipt = z.infer<typeof Receipt>;

export const CreateReceipt = z
  .strictObject({
    clientId: Uuid,
    date: IsoDate,
    bankAccountId: Uuid,
    amount: PositiveMoney,
    ait: NonNegativeMoney,
    vds: NonNegativeMoney,
    retention: NonNegativeMoney,
    allocations: z.array(ReceiptAllocation).min(1).max(100),
  })
  .meta({ id: 'CreateReceipt' });
export type CreateReceipt = z.infer<typeof CreateReceipt>;

export const CreditNoteStatus = z
  .enum(['draft', 'pending_approval', 'posted', 'rejected'])
  .meta({ id: 'CreditNoteStatus' });
export type CreditNoteStatus = z.infer<typeof CreditNoteStatus>;

/** A credit note or a write-off of an unpaid invoice (BIL-06). */
export const CreditNote = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    kind: z.enum(['credit_note', 'write_off']),
    invoiceId: Uuid,
    date: IsoDate,
    amount: PositiveMoney,
    reason: z.string(),
    status: CreditNoteStatus,
    approvalId: Uuid.nullable(),
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['submit']),
    meta: AuditMeta,
  })
  .meta({ id: 'CreditNote' });
export type CreditNote = z.infer<typeof CreditNote>;

export const CreateCreditNote = z
  .strictObject({
    kind: z.enum(['credit_note', 'write_off']),
    invoiceId: Uuid,
    date: IsoDate,
    amount: PositiveMoney,
    reason: Reason,
  })
  .meta({ id: 'CreateCreditNote' });
export type CreateCreditNote = z.infer<typeof CreateCreditNote>;

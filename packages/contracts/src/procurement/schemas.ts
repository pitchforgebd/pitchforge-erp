import { z } from 'zod';

import {
  DocumentNo,
  IsoDate,
  Masked,
  NonNegativeMoney,
  PositiveMoney,
  Quantity,
  Rate,
  Uuid,
} from '../shared/primitives.ts';
import { AuditMeta, PersonRef, allowedActions, restricted } from '../shared/record.ts';

const Name = z.string().trim().min(2).max(200);

export const Vendor = z
  .object({
    id: Uuid,
    name: z.string(),
    /** The vendor's business TIN and BIN. Bank details are restricted. */
    tin: z.string().nullable(),
    bin: z.string().nullable(),
    withholdingCategory: z.string().nullable(),
    bankAccount: restricted(Masked.nullable(), 'bank'),
    active: z.boolean(),
    allowedActions: allowedActions(['update', 'update_bank_details']),
    meta: AuditMeta,
  })
  .meta({ id: 'Vendor' });
export type Vendor = z.infer<typeof Vendor>;

export const CreateVendor = z
  .strictObject({
    name: Name,
    tin: z
      .string()
      .regex(/^[0-9]{12}$/)
      .nullable(),
    bin: z
      .string()
      .regex(/^[0-9]{9,13}$/)
      .nullable(),
    withholdingCategory: z.string().trim().max(60).nullable(),
    bankAccountNumber: z.string().trim().min(5).max(34).nullable(),
  })
  .meta({ id: 'CreateVendor' });
export type CreateVendor = z.infer<typeof CreateVendor>;

export const UpdateVendor = CreateVendor.extend({ active: z.boolean() })
  .partial()
  .meta({ id: 'UpdateVendor' });
export type UpdateVendor = z.infer<typeof UpdateVendor>;

const LineInput = z
  .strictObject({
    description: z.string().trim().min(2).max(300),
    quantity: Quantity,
    estimatedUnitPrice: PositiveMoney,
  })
  .meta({ id: 'RequisitionLineInput' });

export const RequisitionStatus = z
  .enum(['draft', 'pending_approval', 'approved', 'rejected', 'ordered'])
  .meta({ id: 'RequisitionStatus' });
export type RequisitionStatus = z.infer<typeof RequisitionStatus>;

export const Requisition = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    requestedBy: PersonRef,
    departmentId: Uuid.nullable(),
    projectId: Uuid.nullable(),
    purpose: z.string(),
    lines: z.array(LineInput),
    estimatedTotal: NonNegativeMoney,
    status: RequisitionStatus,
    approvalId: Uuid.nullable(),
    allowedActions: allowedActions(['update', 'submit']),
    meta: AuditMeta,
  })
  .meta({ id: 'Requisition' });
export type Requisition = z.infer<typeof Requisition>;

export const CreateRequisition = z
  .strictObject({
    departmentId: Uuid.nullable(),
    projectId: Uuid.nullable(),
    purpose: z.string().trim().min(3).max(300),
    lines: z.array(LineInput).min(1).max(100),
  })
  .meta({ id: 'CreateRequisition' });
export type CreateRequisition = z.infer<typeof CreateRequisition>;

const PurchaseOrderLineInput = z
  .strictObject({
    description: z.string().trim().min(2).max(300),
    quantity: Quantity,
    unitPrice: PositiveMoney,
  })
  .meta({ id: 'PurchaseOrderLineInput' });

export const PurchaseOrderStatus = z
  .enum(['draft', 'pending_approval', 'approved', 'partially_received', 'received', 'rejected'])
  .meta({ id: 'PurchaseOrderStatus' });
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatus>;

export const PurchaseOrder = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    amendment: z.number().int().min(0),
    vendorId: Uuid,
    vendorName: z.string(),
    requisitionId: Uuid.nullable(),
    date: IsoDate,
    lines: z.array(PurchaseOrderLineInput),
    total: NonNegativeMoney,
    status: PurchaseOrderStatus,
    approvalId: Uuid.nullable(),
    allowedActions: allowedActions(['update', 'submit', 'amend', 'receive']),
    meta: AuditMeta,
  })
  .meta({ id: 'PurchaseOrder' });
export type PurchaseOrder = z.infer<typeof PurchaseOrder>;

export const CreatePurchaseOrder = z
  .strictObject({
    vendorId: Uuid,
    requisitionId: Uuid.nullable(),
    date: IsoDate,
    lines: z.array(PurchaseOrderLineInput).min(1).max(100),
  })
  .meta({ id: 'CreatePurchaseOrder' });
export type CreatePurchaseOrder = z.infer<typeof CreatePurchaseOrder>;

export const UpdatePurchaseOrder = CreatePurchaseOrder.partial().meta({
  id: 'UpdatePurchaseOrder',
});
export type UpdatePurchaseOrder = z.infer<typeof UpdatePurchaseOrder>;

export const GoodsReceipt = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    purchaseOrderId: Uuid,
    receivedOn: IsoDate,
    receivedBy: PersonRef,
    lines: z.array(z.object({ description: z.string(), quantity: Quantity })),
    meta: AuditMeta,
  })
  .meta({ id: 'GoodsReceipt' });
export type GoodsReceipt = z.infer<typeof GoodsReceipt>;

export const CreateGoodsReceipt = z
  .strictObject({
    purchaseOrderId: Uuid,
    receivedOn: IsoDate,
    lines: z
      .array(z.strictObject({ description: z.string().trim().min(2).max(300), quantity: Quantity }))
      .min(1)
      .max(100),
  })
  .meta({ id: 'CreateGoodsReceipt' });
export type CreateGoodsReceipt = z.infer<typeof CreateGoodsReceipt>;

export const DepreciationMethod = z
  .enum(['straight_line', 'reducing_balance'])
  .meta({ id: 'DepreciationMethod' });
export type DepreciationMethod = z.infer<typeof DepreciationMethod>;

export const Asset = z
  .object({
    id: Uuid,
    tag: z.string(),
    name: z.string(),
    category: z.string(),
    purchasedOn: IsoDate,
    cost: NonNegativeMoney,
    /** Calculated by the server. */
    bookValue: NonNegativeMoney,
    method: DepreciationMethod,
    annualRate: Rate,
    assignedTo: PersonRef.nullable(),
    status: z.enum(['in_store', 'assigned', 'disposed']),
    allowedActions: allowedActions(['update', 'assign', 'return']),
    meta: AuditMeta,
  })
  .meta({ id: 'Asset' });
export type Asset = z.infer<typeof Asset>;

export const CreateAsset = z
  .strictObject({
    tag: z.string().trim().min(1).max(30),
    name: Name,
    category: z.string().trim().min(2).max(60),
    purchasedOn: IsoDate,
    cost: NonNegativeMoney,
    method: DepreciationMethod,
    annualRate: Rate,
  })
  .meta({ id: 'CreateAsset' });
export type CreateAsset = z.infer<typeof CreateAsset>;

export const UpdateAsset = CreateAsset.omit({ cost: true, purchasedOn: true })
  .partial()
  .meta({ id: 'UpdateAsset' });
export type UpdateAsset = z.infer<typeof UpdateAsset>;

export const AssignAsset = z.strictObject({ employeeId: Uuid }).meta({ id: 'AssignAsset' });
export type AssignAsset = z.infer<typeof AssignAsset>;

export const DepreciationRun = z
  .object({
    id: Uuid,
    month: z.string(),
    assets: z.number().int().min(0),
    total: NonNegativeMoney,
    status: z.enum(['preview', 'posted']),
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['post']),
    meta: AuditMeta,
  })
  .meta({ id: 'DepreciationRun' });
export type DepreciationRun = z.infer<typeof DepreciationRun>;

export const CreateDepreciationRun = z
  .strictObject({ month: z.string().regex(/^[0-9]{4}-(0[1-9]|1[0-2])$/) })
  .meta({ id: 'CreateDepreciationRun' });
export type CreateDepreciationRun = z.infer<typeof CreateDepreciationRun>;

/** Licences, subscriptions and domains with renewals (PRC-16). */
export const Licence = z
  .object({
    id: Uuid,
    name: z.string(),
    kind: z.enum(['licence', 'subscription', 'domain']),
    vendorId: Uuid.nullable(),
    cost: NonNegativeMoney,
    renewsOn: IsoDate,
    meta: AuditMeta,
  })
  .meta({ id: 'Licence' });
export type Licence = z.infer<typeof Licence>;

export const CreateLicence = z
  .strictObject({
    name: Name,
    kind: z.enum(['licence', 'subscription', 'domain']),
    vendorId: Uuid.nullable(),
    cost: NonNegativeMoney,
    renewsOn: IsoDate,
  })
  .meta({ id: 'CreateLicence' });
export type CreateLicence = z.infer<typeof CreateLicence>;

export const UpdateLicence = CreateLicence.partial().meta({ id: 'UpdateLicence' });
export type UpdateLicence = z.infer<typeof UpdateLicence>;

/** Guarantees and deposits the company has given (PRC-17). */
export const DepositGiven = z
  .object({
    id: Uuid,
    kind: z.enum(['guarantee', 'deposit']),
    party: z.string(),
    purpose: z.string(),
    amount: PositiveMoney,
    givenOn: IsoDate,
    expiresOn: IsoDate.nullable(),
    status: z.enum(['active', 'returned']),
    meta: AuditMeta,
  })
  .meta({ id: 'DepositGiven' });
export type DepositGiven = z.infer<typeof DepositGiven>;

export const CreateDepositGiven = z
  .strictObject({
    kind: z.enum(['guarantee', 'deposit']),
    party: Name,
    purpose: z.string().trim().min(3).max(300),
    amount: PositiveMoney,
    givenOn: IsoDate,
    expiresOn: IsoDate.nullable(),
  })
  .meta({ id: 'CreateDepositGiven' });
export type CreateDepositGiven = z.infer<typeof CreateDepositGiven>;

import { z } from 'zod';

import {
  DocumentNo,
  Money,
  NonNegativeMoney,
  Reason,
  Timestamp,
  Uuid,
} from '../shared/primitives.ts';
import { AuditMeta, PersonRef, allowedActions } from '../shared/record.ts';

export const ApprovalStatus = z
  .enum(['pending', 'approved', 'rejected', 'returned', 'cancelled'])
  .meta({ id: 'ApprovalStatus' });
export type ApprovalStatus = z.infer<typeof ApprovalStatus>;

export const ApprovalStep = z
  .object({
    approver: PersonRef.nullable(),
    roleName: z.string().nullable(),
    status: z.enum(['waiting', 'current', 'approved', 'rejected', 'returned', 'skipped']),
    decidedAt: Timestamp.nullable(),
    comment: z.string().nullable(),
  })
  .meta({ id: 'ApprovalStep' });
export type ApprovalStep = z.infer<typeof ApprovalStep>;

/** A pre-computed journal line, shown so approvers see the posting in plain words. */
export const PostingPreviewLine = z
  .object({
    accountCode: z.string(),
    accountName: z.string(),
    description: z.string().nullable(),
    debit: Money,
    credit: Money,
  })
  .meta({ id: 'PostingPreviewLine' });
export type PostingPreviewLine = z.infer<typeof PostingPreviewLine>;

/** Calculated by the server's posting engine; the browser never computes it. */
export const PostingPreview = z
  .object({ lines: z.array(PostingPreviewLine) })
  .meta({ id: 'PostingPreview' });
export type PostingPreview = z.infer<typeof PostingPreview>;

export const ApprovalRequest = z
  .object({
    id: Uuid,
    reference: z.string(),
    sourceType: z.string(),
    sourceId: Uuid,
    title: z.string(),
    amount: Money.nullable(),
    status: ApprovalStatus,
    requestedBy: PersonRef,
    requestedAt: Timestamp,
    ruleName: z.string(),
    steps: z.array(ApprovalStep),
    posting: PostingPreview.nullable(),
    fileIds: z.array(Uuid),
    allowedActions: allowedActions(['approve', 'reject', 'return', 'delegate']),
    meta: AuditMeta,
  })
  .meta({ id: 'ApprovalRequest' });
export type ApprovalRequest = z.infer<typeof ApprovalRequest>;

export const ApprovalDecision = z
  .strictObject({ comment: z.string().trim().max(500).nullable() })
  .meta({ id: 'ApprovalDecision' });
export type ApprovalDecision = z.infer<typeof ApprovalDecision>;

export const ApprovalReason = z.strictObject({ reason: Reason }).meta({ id: 'ApprovalReason' });
export type ApprovalReason = z.infer<typeof ApprovalReason>;

export const DelegateApproval = z
  .strictObject({ delegateUserId: Uuid, reason: Reason })
  .meta({ id: 'DelegateApproval' });
export type DelegateApproval = z.infer<typeof DelegateApproval>;

export const ApprovalOutcome = z
  .object({ approval: ApprovalRequest, journalEntryNo: DocumentNo.nullable() })
  .meta({ id: 'ApprovalOutcome' });
export type ApprovalOutcome = z.infer<typeof ApprovalOutcome>;

/** Who approves what: by type, amount, department and project (CORE-16, CORE-18). */
export const ApprovalRule = z
  .object({
    id: Uuid,
    name: z.string(),
    sourceType: z.string(),
    minAmount: NonNegativeMoney.nullable(),
    maxAmount: NonNegativeMoney.nullable(),
    departmentId: Uuid.nullable(),
    projectId: Uuid.nullable(),
    approverRoleIds: z.array(Uuid).min(1),
    /** 'all' = every listed approver must approve, e.g. all other partners. */
    mode: z.enum(['any', 'all', 'sequence']),
    slaHours: z.number().int().min(1).nullable(),
    active: z.boolean(),
    meta: AuditMeta,
  })
  .meta({ id: 'ApprovalRule' });
export type ApprovalRule = z.infer<typeof ApprovalRule>;

export const CreateApprovalRule = z
  .strictObject({
    name: z.string().trim().min(2).max(120),
    sourceType: z.string().regex(/^[a-z][a-z_]*$/),
    minAmount: NonNegativeMoney.nullable(),
    maxAmount: NonNegativeMoney.nullable(),
    departmentId: Uuid.nullable(),
    projectId: Uuid.nullable(),
    approverRoleIds: z.array(Uuid).min(1),
    mode: z.enum(['any', 'all', 'sequence']),
    slaHours: z.number().int().min(1).nullable(),
  })
  .meta({ id: 'CreateApprovalRule' });
export type CreateApprovalRule = z.infer<typeof CreateApprovalRule>;

export const UpdateApprovalRule = CreateApprovalRule.extend({ active: z.boolean() })
  .partial()
  .meta({ id: 'UpdateApprovalRule' });
export type UpdateApprovalRule = z.infer<typeof UpdateApprovalRule>;

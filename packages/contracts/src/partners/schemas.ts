import { z } from 'zod';

import {
  DocumentNo,
  IsoDate,
  Money,
  NonNegativeMoney,
  Percent,
  PositiveMoney,
  Reason,
  Uuid,
} from '../shared/primitives.ts';
import { AuditMeta, PersonRef, allowedActions, restricted } from '../shared/record.ts';

/**
 * Balances are restricted to Partners, Finance and Auditor (access-control-matrix.md); they
 * are omitted from the response for anyone else.
 */
export const Partner = z
  .object({
    id: Uuid,
    userId: Uuid.nullable(),
    name: z.string(),
    active: z.boolean(),
    equityPercent: Percent,
    capitalBalance: restricted(Money, 'partner-balance'),
    currentBalance: restricted(Money, 'partner-balance'),
    dueFromPartner: restricted(Money, 'partner-balance'),
    allowedActions: allowedActions(['update']),
    meta: AuditMeta,
  })
  .meta({ id: 'Partner' });
export type Partner = z.infer<typeof Partner>;

export const CreatePartner = z
  .strictObject({ name: z.string().trim().min(2).max(120), userId: Uuid.nullable() })
  .meta({ id: 'CreatePartner' });
export type CreatePartner = z.infer<typeof CreatePartner>;

export const UpdatePartner = z
  .strictObject({
    name: z.string().trim().min(2).max(120),
    userId: Uuid.nullable(),
    active: z.boolean(),
  })
  .partial()
  .meta({ id: 'UpdatePartner' });
export type UpdatePartner = z.infer<typeof UpdatePartner>;

export const EquityShare = z
  .strictObject({ partnerId: Uuid, percent: Percent })
  .meta({ id: 'EquityShare' });
export type EquityShare = z.infer<typeof EquityShare>;

/** Effective-dated. The server checks that the shares total exactly 100%. */
export const EquityVersion = z
  .object({
    id: Uuid,
    validFrom: IsoDate,
    validTo: IsoDate.nullable(),
    shares: z.array(EquityShare).min(1),
    reason: z.string(),
    meta: AuditMeta,
  })
  .meta({ id: 'EquityVersion' });
export type EquityVersion = z.infer<typeof EquityVersion>;

export const CreateEquityVersion = z
  .strictObject({ validFrom: IsoDate, shares: z.array(EquityShare).min(1), reason: Reason })
  .meta({ id: 'CreateEquityVersion' });
export type CreateEquityVersion = z.infer<typeof CreateEquityVersion>;

export const PartnerTransactionType = z
  .enum([
    'capital_contribution',
    'drawing',
    'capital_return',
    'loan_to_partner',
    'remuneration',
    'held_in_personal_account',
  ])
  .meta({ id: 'PartnerTransactionType' });
export type PartnerTransactionType = z.infer<typeof PartnerTransactionType>;

export const PartnerTransactionStatus = z
  .enum(['draft', 'pending_approval', 'posted', 'rejected', 'reversed'])
  .meta({ id: 'PartnerTransactionStatus' });
export type PartnerTransactionStatus = z.infer<typeof PartnerTransactionStatus>;

export const PartnerTransaction = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    partner: PersonRef,
    type: PartnerTransactionType,
    date: IsoDate,
    amount: PositiveMoney,
    bankAccountId: Uuid.nullable(),
    note: z.string().nullable(),
    status: PartnerTransactionStatus,
    approvalId: Uuid.nullable(),
    requestedBy: PersonRef,
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['update', 'submit']),
    meta: AuditMeta,
  })
  .meta({ id: 'PartnerTransaction' });
export type PartnerTransaction = z.infer<typeof PartnerTransaction>;

export const CreatePartnerTransaction = z
  .strictObject({
    partnerId: Uuid,
    type: PartnerTransactionType,
    date: IsoDate,
    amount: PositiveMoney,
    bankAccountId: Uuid.nullable(),
    note: z.string().trim().max(300).nullable(),
  })
  .meta({ id: 'CreatePartnerTransaction' });
export type CreatePartnerTransaction = z.infer<typeof CreatePartnerTransaction>;

export const UpdatePartnerTransaction = CreatePartnerTransaction.partial().meta({
  id: 'UpdatePartnerTransaction',
});
export type UpdatePartnerTransaction = z.infer<typeof UpdatePartnerTransaction>;

/** Server-calculated: what the partner may draw now, with a warning when it is exceeded. */
export const WithdrawableBalance = z
  .object({
    partnerId: Uuid,
    asOf: IsoDate,
    amount: restricted(Money, 'partner-balance'),
    warning: z.string().nullable(),
  })
  .meta({ id: 'WithdrawableBalance' });
export type WithdrawableBalance = z.infer<typeof WithdrawableBalance>;

export const DistributionShare = z
  .object({
    partnerId: Uuid,
    partnerName: z.string(),
    /** Day-weighted when equity changed during the period (PAR-11). */
    weightedPercent: z.string(),
    amount: NonNegativeMoney,
  })
  .meta({ id: 'DistributionShare' });
export type DistributionShare = z.infer<typeof DistributionShare>;

export const DistributionRunStatus = z
  .enum(['preview', 'posted', 'reversed'])
  .meta({ id: 'DistributionRunStatus' });
export type DistributionRunStatus = z.infer<typeof DistributionRunStatus>;

/** Every figure is calculated by the server; the browser only displays the preview. */
export const DistributionRun = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    periodFrom: IsoDate,
    periodTo: IsoDate,
    profit: Money,
    reservePercent: Percent,
    reserve: NonNegativeMoney,
    distributable: NonNegativeMoney,
    shares: z.array(DistributionShare),
    status: DistributionRunStatus,
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['post', 'reverse']),
    meta: AuditMeta,
  })
  .meta({ id: 'DistributionRun' });
export type DistributionRun = z.infer<typeof DistributionRun>;

export const CreateDistributionRun = z
  .strictObject({ periodFrom: IsoDate, periodTo: IsoDate, reservePercent: Percent })
  .meta({ id: 'CreateDistributionRun' });
export type CreateDistributionRun = z.infer<typeof CreateDistributionRun>;

export const ReverseDistributionRun = z
  .strictObject({ reversalDate: IsoDate, reason: Reason })
  .meta({ id: 'ReverseDistributionRun' });
export type ReverseDistributionRun = z.infer<typeof ReverseDistributionRun>;

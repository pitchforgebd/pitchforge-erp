import { z } from 'zod';

import {
  DocumentNo,
  IsoDate,
  Money,
  NonNegativeMoney,
  Percent,
  PositiveMoney,
  Quantity,
  Reason,
  Timestamp,
  Uuid,
  YearMonth,
} from '../shared/primitives.ts';
import { AuditMeta, PersonRef, allowedActions } from '../shared/record.ts';

const Name = z.string().trim().min(2).max(200);
const Note = z.string().trim().max(500).nullable();

/* Leads --------------------------------------------------------------------------------------- */

export const LeadStatus = z
  .enum(['new', 'contacted', 'qualified', 'converted', 'lost'])
  .meta({ id: 'LeadStatus' });
export type LeadStatus = z.infer<typeof LeadStatus>;

export const Lead = z
  .object({
    id: Uuid,
    number: DocumentNo,
    name: z.string(),
    contactName: z.string().nullable(),
    email: z.email().nullable(),
    phone: z.string().nullable(),
    source: z.string(),
    need: z.string().nullable(),
    owner: PersonRef,
    nextFollowUp: IsoDate.nullable(),
    status: LeadStatus,
    allowedActions: allowedActions(['update', 'convert']),
    meta: AuditMeta,
  })
  .meta({ id: 'Lead' });
export type Lead = z.infer<typeof Lead>;

export const CreateLead = z
  .strictObject({
    name: Name,
    contactName: Name.nullable(),
    email: z.email().max(254).nullable(),
    phone: z.string().trim().max(30).nullable(),
    source: z.string().trim().min(2).max(60),
    need: Note,
    ownerId: Uuid,
    nextFollowUp: IsoDate.nullable(),
  })
  .meta({ id: 'CreateLead' });
export type CreateLead = z.infer<typeof CreateLead>;

export const UpdateLead = CreateLead.extend({ status: LeadStatus })
  .partial()
  .meta({ id: 'UpdateLead' });
export type UpdateLead = z.infer<typeof UpdateLead>;

/** A possible duplicate, found by name, phone, email or TIN (CRM-03). */
export const DuplicateMatch = z
  .object({
    recordType: z.enum(['lead', 'client']),
    recordId: Uuid,
    name: z.string(),
    matchedOn: z.array(z.enum(['name', 'phone', 'email', 'tin'])).min(1),
  })
  .meta({ id: 'DuplicateMatch' });
export type DuplicateMatch = z.infer<typeof DuplicateMatch>;

/* Clients ------------------------------------------------------------------------------------- */

export const ClientAccount = z
  .object({
    id: Uuid,
    name: z.string(),
    /** A company's TIN and BIN; a person's TIN lives on the restricted contact master. */
    tin: z.string().nullable(),
    bin: z.string().nullable(),
    paymentTermsDays: z.number().int().min(0).max(365),
    creditLimit: NonNegativeMoney.nullable(),
    active: z.boolean(),
    allowedActions: allowedActions(['update', 'deactivate']),
    meta: AuditMeta,
  })
  .meta({ id: 'ClientAccount' });
export type ClientAccount = z.infer<typeof ClientAccount>;

export const CreateClientAccount = z
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
    paymentTermsDays: z.number().int().min(0).max(365),
    creditLimit: NonNegativeMoney.nullable(),
  })
  .meta({ id: 'CreateClientAccount' });
export type CreateClientAccount = z.infer<typeof CreateClientAccount>;

export const UpdateClientAccount = CreateClientAccount.extend({ active: z.boolean() })
  .partial()
  .meta({ id: 'UpdateClientAccount' });
export type UpdateClientAccount = z.infer<typeof UpdateClientAccount>;

export const ClientContact = z
  .object({
    id: Uuid,
    clientId: Uuid,
    name: z.string(),
    role: z.string().nullable(),
    email: z.email().nullable(),
    phone: z.string().nullable(),
    primary: z.boolean(),
  })
  .meta({ id: 'ClientContact' });
export type ClientContact = z.infer<typeof ClientContact>;

export const CreateClientContact = z
  .strictObject({
    name: Name,
    role: z.string().trim().max(80).nullable(),
    email: z.email().max(254).nullable(),
    phone: z.string().trim().max(30).nullable(),
    primary: z.boolean(),
  })
  .meta({ id: 'CreateClientContact' });
export type CreateClientContact = z.infer<typeof CreateClientContact>;

export const SalesActivity = z
  .object({
    id: Uuid,
    clientId: Uuid.nullable(),
    opportunityId: Uuid.nullable(),
    kind: z.enum(['call', 'meeting', 'note', 'follow_up']),
    subject: z.string(),
    at: Timestamp,
    followUpOn: IsoDate.nullable(),
    owner: PersonRef,
  })
  .meta({ id: 'SalesActivity' });
export type SalesActivity = z.infer<typeof SalesActivity>;

export const CreateSalesActivity = z
  .strictObject({
    clientId: Uuid.nullable(),
    opportunityId: Uuid.nullable(),
    kind: z.enum(['call', 'meeting', 'note', 'follow_up']),
    subject: z.string().trim().min(2).max(300),
    followUpOn: IsoDate.nullable(),
  })
  .meta({ id: 'CreateSalesActivity' });
export type CreateSalesActivity = z.infer<typeof CreateSalesActivity>;

/** Everything about one client on one page (CRM-07). Figures come from the server. */
export const ClientOverview = z
  .object({
    client: ClientAccount,
    contacts: z.array(ClientContact),
    recentActivities: z.array(SalesActivity),
    openPipelineValue: NonNegativeMoney,
    receivableBalance: Money,
    activeProjects: z.number().int().min(0),
    activeContracts: z.number().int().min(0),
  })
  .meta({ id: 'ClientOverview' });
export type ClientOverview = z.infer<typeof ClientOverview>;

/* Pipeline ------------------------------------------------------------------------------------ */

export const PipelineStage = z
  .object({ id: Uuid, name: z.string(), probabilityPercent: Percent, closed: z.boolean() })
  .meta({ id: 'PipelineStage' });
export type PipelineStage = z.infer<typeof PipelineStage>;

export const ReplacePipelineStages = z
  .strictObject({
    stages: z
      .array(z.strictObject({ id: Uuid.nullable(), name: Name, probabilityPercent: Percent }))
      .min(2)
      .max(12),
  })
  .meta({ id: 'ReplacePipelineStages' });
export type ReplacePipelineStages = z.infer<typeof ReplacePipelineStages>;

export const OpportunityStatus = z.enum(['open', 'won', 'lost']).meta({ id: 'OpportunityStatus' });
export type OpportunityStatus = z.infer<typeof OpportunityStatus>;

export const Opportunity = z
  .object({
    id: Uuid,
    name: z.string(),
    clientId: Uuid,
    clientName: z.string(),
    stageId: Uuid,
    value: NonNegativeMoney,
    probabilityPercent: Percent,
    owner: PersonRef,
    expectedCloseDate: IsoDate.nullable(),
    status: OpportunityStatus,
    lostReason: z.string().nullable(),
    competitor: z.string().nullable(),
    projectId: Uuid.nullable(),
    allowedActions: allowedActions(['update', 'move', 'win', 'lose']),
    meta: AuditMeta,
  })
  .meta({ id: 'Opportunity' });
export type Opportunity = z.infer<typeof Opportunity>;

export const CreateOpportunity = z
  .strictObject({
    name: Name,
    clientId: Uuid,
    stageId: Uuid,
    value: NonNegativeMoney,
    ownerId: Uuid,
    expectedCloseDate: IsoDate.nullable(),
  })
  .meta({ id: 'CreateOpportunity' });
export type CreateOpportunity = z.infer<typeof CreateOpportunity>;

export const UpdateOpportunity = CreateOpportunity.omit({ stageId: true })
  .partial()
  .meta({ id: 'UpdateOpportunity' });
export type UpdateOpportunity = z.infer<typeof UpdateOpportunity>;

export const MoveOpportunity = z.strictObject({ stageId: Uuid }).meta({ id: 'MoveOpportunity' });
export type MoveOpportunity = z.infer<typeof MoveOpportunity>;

export const LoseOpportunity = z
  .strictObject({ reason: Reason, competitor: z.string().trim().max(120).nullable() })
  .meta({ id: 'LoseOpportunity' });
export type LoseOpportunity = z.infer<typeof LoseOpportunity>;

export const WinOpportunity = z
  .strictObject({ projectStartDate: IsoDate })
  .meta({ id: 'WinOpportunity' });
export type WinOpportunity = z.infer<typeof WinOpportunity>;

export const SalesForecastMonth = z
  .object({ month: YearMonth, total: NonNegativeMoney, weighted: NonNegativeMoney })
  .meta({ id: 'SalesForecastMonth' });
export type SalesForecastMonth = z.infer<typeof SalesForecastMonth>;

/** Weighted by stage probability on the server. */
export const SalesForecast = z
  .object({ months: z.array(SalesForecastMonth) })
  .meta({ id: 'SalesForecast' });
export type SalesForecast = z.infer<typeof SalesForecast>;

/* Quotations and contracts ---------------------------------------------------------------------- */

const QuotationLineInput = z
  .strictObject({
    description: z.string().trim().min(2).max(300),
    quantity: Quantity,
    unitPrice: PositiveMoney,
  })
  .meta({ id: 'QuotationLineInput' });

export const QuotationStatus = z
  .enum(['draft', 'pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'expired'])
  .meta({ id: 'QuotationStatus' });
export type QuotationStatus = z.infer<typeof QuotationStatus>;

export const Quotation = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    revision: z.number().int().min(1),
    clientId: Uuid,
    clientName: z.string(),
    opportunityId: Uuid.nullable(),
    title: z.string(),
    date: IsoDate,
    validUntil: IsoDate,
    lines: z.array(QuotationLineInput),
    discountPercent: Percent,
    /** Server-calculated totals. */
    gross: NonNegativeMoney,
    discount: NonNegativeMoney,
    vat: NonNegativeMoney,
    total: NonNegativeMoney,
    status: QuotationStatus,
    approvalId: Uuid.nullable(),
    allowedActions: allowedActions(['update', 'submit', 'send', 'accept', 'new_version']),
    meta: AuditMeta,
  })
  .meta({ id: 'Quotation' });
export type Quotation = z.infer<typeof Quotation>;

export const CreateQuotation = z
  .strictObject({
    clientId: Uuid,
    opportunityId: Uuid.nullable(),
    title: Name,
    date: IsoDate,
    validUntil: IsoDate,
    lines: z.array(QuotationLineInput).min(1).max(100),
    discountPercent: Percent,
  })
  .meta({ id: 'CreateQuotation' });
export type CreateQuotation = z.infer<typeof CreateQuotation>;

export const UpdateQuotation = CreateQuotation.partial().meta({ id: 'UpdateQuotation' });
export type UpdateQuotation = z.infer<typeof UpdateQuotation>;

export const ContractStatus = z
  .enum(['draft', 'active', 'completed', 'terminated'])
  .meta({ id: 'ContractStatus' });
export type ContractStatus = z.infer<typeof ContractStatus>;

export const Contract = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    clientId: Uuid,
    clientName: z.string(),
    title: z.string(),
    value: NonNegativeMoney,
    startDate: IsoDate,
    endDate: IsoDate.nullable(),
    renewalDate: IsoDate.nullable(),
    retentionPercent: Percent,
    warrantyEndDate: IsoDate.nullable(),
    terms: z.string().nullable(),
    status: ContractStatus,
    fileIds: z.array(Uuid),
    allowedActions: allowedActions(['update']),
    meta: AuditMeta,
  })
  .meta({ id: 'Contract' });
export type Contract = z.infer<typeof Contract>;

export const CreateContract = z
  .strictObject({
    clientId: Uuid,
    title: Name,
    value: NonNegativeMoney,
    startDate: IsoDate,
    endDate: IsoDate.nullable(),
    renewalDate: IsoDate.nullable(),
    retentionPercent: Percent,
    warrantyEndDate: IsoDate.nullable(),
    terms: z.string().trim().max(4000).nullable(),
    fileIds: z.array(Uuid).max(20),
  })
  .meta({ id: 'CreateContract' });
export type CreateContract = z.infer<typeof CreateContract>;

export const UpdateContract = CreateContract.extend({ status: ContractStatus })
  .partial()
  .meta({ id: 'UpdateContract' });
export type UpdateContract = z.infer<typeof UpdateContract>;

/* Tenders ------------------------------------------------------------------------------------- */

export const TenderStatus = z
  .enum(['preparing', 'submitted', 'won', 'lost', 'withdrawn'])
  .meta({ id: 'TenderStatus' });
export type TenderStatus = z.infer<typeof TenderStatus>;

export const Tender = z
  .object({
    id: Uuid,
    title: z.string(),
    procuringEntity: z.string(),
    egpId: z.string().nullable(),
    method: z.string(),
    estimatedValue: NonNegativeMoney.nullable(),
    submissionDeadline: Timestamp,
    internalDeadline: Timestamp.nullable(),
    team: z.array(PersonRef),
    status: TenderStatus,
    rank: z.number().int().min(1).nullable(),
    ourPrice: NonNegativeMoney.nullable(),
    winningPrice: NonNegativeMoney.nullable(),
    contractId: Uuid.nullable(),
    allowedActions: allowedActions(['update', 'record_outcome', 'award']),
    meta: AuditMeta,
  })
  .meta({ id: 'Tender' });
export type Tender = z.infer<typeof Tender>;

export const CreateTender = z
  .strictObject({
    title: Name,
    procuringEntity: Name,
    egpId: z.string().trim().max(60).nullable(),
    method: z.string().trim().min(2).max(60),
    estimatedValue: NonNegativeMoney.nullable(),
    submissionDeadline: Timestamp,
    internalDeadline: Timestamp.nullable(),
    teamUserIds: z.array(Uuid).max(30),
  })
  .meta({ id: 'CreateTender' });
export type CreateTender = z.infer<typeof CreateTender>;

export const UpdateTender = CreateTender.partial().meta({ id: 'UpdateTender' });
export type UpdateTender = z.infer<typeof UpdateTender>;

export const TenderOutcome = z
  .strictObject({
    result: z.enum(['won', 'lost', 'withdrawn']),
    rank: z.number().int().min(1).nullable(),
    ourPrice: NonNegativeMoney.nullable(),
    winningPrice: NonNegativeMoney.nullable(),
  })
  .meta({ id: 'TenderOutcome' });
export type TenderOutcome = z.infer<typeof TenderOutcome>;

/** Creates the contract and the project (TND-14). */
export const AwardTender = z
  .strictObject({ contractValue: PositiveMoney, startDate: IsoDate })
  .meta({ id: 'AwardTender' });
export type AwardTender = z.infer<typeof AwardTender>;

export const TenderChecklistItem = z
  .object({
    id: Uuid,
    document: z.string(),
    owner: PersonRef.nullable(),
    dueAt: Timestamp.nullable(),
    done: z.boolean(),
    fileId: Uuid.nullable(),
  })
  .meta({ id: 'TenderChecklistItem' });
export type TenderChecklistItem = z.infer<typeof TenderChecklistItem>;

export const ReplaceTenderChecklist = z
  .strictObject({
    items: z
      .array(
        z.strictObject({
          id: Uuid.nullable(),
          document: Name,
          ownerId: Uuid.nullable(),
          dueAt: Timestamp.nullable(),
          done: z.boolean(),
          fileId: Uuid.nullable(),
        }),
      )
      .max(200),
  })
  .meta({ id: 'ReplaceTenderChecklist' });
export type ReplaceTenderChecklist = z.infer<typeof ReplaceTenderChecklist>;

/** Reusable bid documents with an expiry (TND-05). */
export const StandardDocument = z
  .object({
    id: Uuid,
    name: z.string(),
    fileId: Uuid,
    expiresOn: IsoDate.nullable(),
    meta: AuditMeta,
  })
  .meta({ id: 'StandardDocument' });
export type StandardDocument = z.infer<typeof StandardDocument>;

export const CreateStandardDocument = z
  .strictObject({ name: Name, fileId: Uuid, expiresOn: IsoDate.nullable() })
  .meta({ id: 'CreateStandardDocument' });
export type CreateStandardDocument = z.infer<typeof CreateStandardDocument>;

export const GuaranteeKind = z
  .enum(['bid_security', 'performance_guarantee', 'margin_money'])
  .meta({ id: 'GuaranteeKind' });
export type GuaranteeKind = z.infer<typeof GuaranteeKind>;

export const Guarantee = z
  .object({
    id: Uuid,
    kind: GuaranteeKind,
    tenderId: Uuid.nullable(),
    contractId: Uuid.nullable(),
    issuer: z.string(),
    reference: z.string(),
    amount: PositiveMoney,
    issuedOn: IsoDate,
    expiresOn: IsoDate.nullable(),
    status: z.enum(['active', 'released', 'forfeited']),
    allowedActions: allowedActions(['release', 'forfeit']),
    meta: AuditMeta,
  })
  .meta({ id: 'Guarantee' });
export type Guarantee = z.infer<typeof Guarantee>;

export const CreateGuarantee = z
  .strictObject({
    kind: GuaranteeKind,
    tenderId: Uuid.nullable(),
    contractId: Uuid.nullable(),
    issuer: Name,
    reference: z.string().trim().min(1).max(60),
    amount: PositiveMoney,
    issuedOn: IsoDate,
    expiresOn: IsoDate.nullable(),
  })
  .meta({ id: 'CreateGuarantee' });
export type CreateGuarantee = z.infer<typeof CreateGuarantee>;

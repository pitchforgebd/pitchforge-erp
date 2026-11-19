import { z } from 'zod';

import { Masked, IsoDate, Uuid } from '../shared/primitives.ts';
import { AuditMeta, allowedActions, restricted } from '../shared/record.ts';

const Tin = z.string().regex(/^[0-9]{12}$/, 'A TIN has 12 digits');
const Bin = z.string().regex(/^[0-9]{9,13}$/, 'A BIN has 9 to 13 digits');

export const Company = z
  .object({
    id: Uuid,
    legalName: z.string(),
    tin: Tin,
    bin: Bin,
    licenceNo: z.string().nullable(),
    logoFileId: Uuid.nullable(),
    baseCurrency: z.literal('BDT'),
    fiscalYearStartMonth: z.number().int().min(1).max(12),
    meta: AuditMeta,
  })
  .meta({ id: 'Company' });
export type Company = z.infer<typeof Company>;

export const UpdateCompany = z
  .strictObject({
    legalName: z.string().trim().min(2).max(200),
    tin: Tin,
    bin: Bin,
    licenceNo: z.string().trim().max(100).nullable(),
    logoFileId: Uuid.nullable(),
  })
  .partial()
  .meta({ id: 'UpdateCompany' });
export type UpdateCompany = z.infer<typeof UpdateCompany>;

export const OrgUnitType = z
  .enum(['branch', 'department', 'cost_center'])
  .meta({ id: 'OrgUnitType' });
export type OrgUnitType = z.infer<typeof OrgUnitType>;

export const OrgUnit = z
  .object({
    id: Uuid,
    type: OrgUnitType,
    code: z.string(),
    name: z.string(),
    parentId: Uuid.nullable(),
    active: z.boolean(),
    meta: AuditMeta,
  })
  .meta({ id: 'OrgUnit' });
export type OrgUnit = z.infer<typeof OrgUnit>;

export const CreateOrgUnit = z
  .strictObject({
    type: OrgUnitType,
    code: z.string().trim().min(1).max(20),
    name: z.string().trim().min(2).max(120),
    parentId: Uuid.nullable(),
  })
  .meta({ id: 'CreateOrgUnit' });
export type CreateOrgUnit = z.infer<typeof CreateOrgUnit>;

export const UpdateOrgUnit = z
  .strictObject({
    name: z.string().trim().min(2).max(120),
    parentId: Uuid.nullable(),
    active: z.boolean(),
  })
  .partial()
  .meta({ id: 'UpdateOrgUnit' });
export type UpdateOrgUnit = z.infer<typeof UpdateOrgUnit>;

export const ContactKind = z
  .enum(['client', 'vendor', 'employee', 'partner', 'other'])
  .meta({ id: 'ContactKind' });
export type ContactKind = z.infer<typeof ContactKind>;

/** Shared contact master (CORE-03). */
export const Contact = z
  .object({
    id: Uuid,
    name: z.string(),
    kinds: z.array(ContactKind).min(1),
    email: z.email().nullable(),
    phone: z.string().nullable(),
    bin: Bin.nullable(),
    /** A person's TIN is Restricted data (data-classification.md). */
    tin: restricted(Tin.nullable(), 'tin'),
    bankAccount: restricted(Masked.nullable(), 'bank'),
    allowedActions: allowedActions(['update', 'deactivate']),
    meta: AuditMeta,
  })
  .meta({ id: 'Contact' });
export type Contact = z.infer<typeof Contact>;

export const CreateContact = z
  .strictObject({
    name: z.string().trim().min(2).max(200),
    kinds: z.array(ContactKind).min(1),
    email: z.email().max(254).nullable(),
    phone: z.string().trim().max(30).nullable(),
    bin: Bin.nullable(),
    tin: Tin.nullable(),
    bankAccountNumber: z.string().trim().min(5).max(34).nullable(),
  })
  .meta({ id: 'CreateContact' });
export type CreateContact = z.infer<typeof CreateContact>;

export const UpdateContact = CreateContact.partial().meta({ id: 'UpdateContact' });
export type UpdateContact = z.infer<typeof UpdateContact>;

/** Gap-free numbering per document type and fiscal year (CORE-04). Read only: the server issues. */
export const NumberSeries = z
  .object({
    id: Uuid,
    documentType: z.string(),
    prefix: z.string().regex(/^[A-Z]{2,6}$/),
    fiscalYearCode: z.string().regex(/^[0-9]{4}$/),
    lastIssued: z.number().int().min(0),
    gapFree: z.boolean(),
  })
  .meta({ id: 'NumberSeries' });
export type NumberSeries = z.infer<typeof NumberSeries>;

export const Holiday = z
  .object({ id: Uuid, branchId: Uuid.nullable(), date: IsoDate, name: z.string(), meta: AuditMeta })
  .meta({ id: 'Holiday' });
export type Holiday = z.infer<typeof Holiday>;

export const CreateHoliday = z
  .strictObject({
    branchId: Uuid.nullable(),
    date: IsoDate,
    name: z.string().trim().min(2).max(120),
  })
  .meta({ id: 'CreateHoliday' });
export type CreateHoliday = z.infer<typeof CreateHoliday>;

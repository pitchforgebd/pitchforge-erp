import { z } from 'zod';

import { Timestamp, Uuid } from '../shared/primitives.ts';
import { PersonRef, RecordRef } from '../shared/record.ts';

/* Notifications ---------------------------------------------------------------------------- */

export const Notification = z
  .object({
    id: Uuid,
    title: z.string(),
    body: z.string(),
    /** In-app route to the record; never contains personal data. */
    link: z.string().nullable(),
    readAt: Timestamp.nullable(),
    createdAt: Timestamp,
  })
  .meta({ id: 'Notification' });
export type Notification = z.infer<typeof Notification>;

export const NotificationPreferences = z
  .strictObject({
    email: z.boolean(),
    push: z.boolean(),
    dailyDigest: z.boolean(),
    mutedTypes: z.array(z.string().max(60)),
  })
  .meta({ id: 'NotificationPreferences' });
export type NotificationPreferences = z.infer<typeof NotificationPreferences>;

/** Reminder schedule for a date field: days before (7, 3, 1, 0) (CORE-25, CORE-35). */
export const ReminderRule = z
  .object({
    id: Uuid,
    subject: z.string(),
    daysBefore: z.array(z.number().int().min(0).max(365)),
    active: z.boolean(),
  })
  .meta({ id: 'ReminderRule' });
export type ReminderRule = z.infer<typeof ReminderRule>;

export const UpdateReminderRule = z
  .strictObject({
    daysBefore: z.array(z.number().int().min(0).max(365)).min(1),
    active: z.boolean(),
  })
  .partial()
  .meta({ id: 'UpdateReminderRule' });
export type UpdateReminderRule = z.infer<typeof UpdateReminderRule>;

/* Audit ------------------------------------------------------------------------------------- */

/** One audit row. Restricted values are masked by the server before they reach this shape. */
export const AuditEntry = z
  .object({
    id: Uuid,
    at: Timestamp,
    user: PersonRef.nullable(),
    ipAddress: z.string().nullable(),
    device: z.string().nullable(),
    action: z.enum(['insert', 'update', 'delete', 'login', 'export', 'view_restricted']),
    tableName: z.string(),
    recordId: z.string().nullable(),
    changes: z.array(
      z.object({ field: z.string(), old: z.string().nullable(), new: z.string().nullable() }),
    ),
    requestId: z.string().nullable(),
  })
  .meta({ id: 'AuditEntry' });
export type AuditEntry = z.infer<typeof AuditEntry>;

export const AuditChainStatus = z
  .object({
    verifiedAt: Timestamp.nullable(),
    rowsVerified: z.number().int().min(0),
    intact: z.boolean(),
  })
  .meta({ id: 'AuditChainStatus' });
export type AuditChainStatus = z.infer<typeof AuditChainStatus>;

/** Timeline entry on a record (CORE-30). */
export const ActivityEntry = z
  .object({ id: Uuid, at: Timestamp, user: PersonRef.nullable(), summary: z.string() })
  .meta({ id: 'ActivityEntry' });
export type ActivityEntry = z.infer<typeof ActivityEntry>;

/* Files ------------------------------------------------------------------------------------- */

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const AllowedContentType = z
  .enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])
  .meta({ id: 'AllowedContentType' });
export type AllowedContentType = z.infer<typeof AllowedContentType>;

export const FileStatus = z
  .enum(['pending_upload', 'scanning', 'clean', 'infected'])
  .meta({ id: 'FileStatus' });
export type FileStatus = z.infer<typeof FileStatus>;

export const StoredFile = z
  .object({
    id: Uuid,
    name: z.string(),
    contentType: AllowedContentType,
    sizeBytes: z.number().int().min(1).max(MAX_FILE_BYTES),
    status: FileStatus,
    record: RecordRef.nullable(),
    uploadedBy: PersonRef,
    uploadedAt: Timestamp,
  })
  .meta({ id: 'StoredFile' });
export type StoredFile = z.infer<typeof StoredFile>;

export const CreateUpload = z
  .strictObject({
    name: z.string().trim().min(1).max(200),
    contentType: AllowedContentType,
    sizeBytes: z.number().int().min(1).max(MAX_FILE_BYTES),
    record: RecordRef.nullable(),
  })
  .meta({ id: 'CreateUpload' });
export type CreateUpload = z.infer<typeof CreateUpload>;

/** A short-lived signed URL (5 minutes). The file stays unavailable until the virus scan. */
export const UploadIntent = z
  .object({ fileId: Uuid, uploadUrl: z.url(), expiresAt: Timestamp })
  .meta({ id: 'UploadIntent' });
export type UploadIntent = z.infer<typeof UploadIntent>;

export const DownloadLink = z
  .object({ downloadUrl: z.url(), expiresAt: Timestamp })
  .meta({ id: 'DownloadLink' });
export type DownloadLink = z.infer<typeof DownloadLink>;

/* Search ------------------------------------------------------------------------------------ */

/** Filtered by permission in the database, not after loading (CORE-37). */
export const SearchResult = z
  .object({
    recordType: z.string(),
    recordId: Uuid,
    title: z.string(),
    subtitle: z.string().nullable(),
    link: z.string(),
  })
  .meta({ id: 'SearchResult' });
export type SearchResult = z.infer<typeof SearchResult>;

/* Long jobs, imports and exports (202 + job id) ------------------------------------------------ */

export const Job = z
  .object({
    id: Uuid,
    kind: z.string(),
    status: z.enum(['queued', 'running', 'succeeded', 'failed']),
    progressPercent: z.number().int().min(0).max(100),
    resultFileId: Uuid.nullable(),
    errorCode: z.string().nullable(),
    createdAt: Timestamp,
    finishedAt: Timestamp.nullable(),
  })
  .meta({ id: 'Job' });
export type Job = z.infer<typeof Job>;

export const ImportType = z
  .enum([
    'chart_of_accounts',
    'opening_balances',
    'contacts',
    'employees',
    'bank_statement',
    'attendance',
  ])
  .meta({ id: 'ImportType' });
export type ImportType = z.infer<typeof ImportType>;

export const StartImport = z
  .strictObject({ type: ImportType, fileId: Uuid, dryRun: z.boolean() })
  .meta({ id: 'StartImport' });
export type StartImport = z.infer<typeof StartImport>;

export const ImportResult = z
  .object({
    id: Uuid,
    type: ImportType,
    dryRun: z.boolean(),
    status: z.enum(['validating', 'ready', 'failed', 'committed']),
    rowsTotal: z.number().int().min(0),
    rowsWithErrors: z.number().int().min(0),
    errors: z.array(
      z.object({
        row: z.number().int().min(1),
        column: z.string().nullable(),
        message: z.string(),
      }),
    ),
    jobId: Uuid,
  })
  .meta({ id: 'ImportResult' });
export type ImportResult = z.infer<typeof ImportResult>;

export const StartExport = z
  .strictObject({
    listId: z.string().regex(/^[a-z][a-z_.]*$/),
    format: z.enum(['xlsx', 'csv', 'pdf']),
    filters: z.record(z.string(), z.string()),
  })
  .meta({ id: 'StartExport' });
export type StartExport = z.infer<typeof StartExport>;

/** Render a branded PDF of one record (CORE-36). */
export const RenderDocument = z
  .strictObject({
    template: z.enum(['invoice', 'payslip', 'purchase_order', 'statement', 'bank_advice']),
    record: RecordRef,
  })
  .meta({ id: 'RenderDocument' });
export type RenderDocument = z.infer<typeof RenderDocument>;

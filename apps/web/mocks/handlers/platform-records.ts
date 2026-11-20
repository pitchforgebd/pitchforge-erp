import { accountingEndpoints as accounting, coreEndpoints as core } from '@pitchforge/contracts';
import type { ImportResult, Job, StoredFile } from '@pitchforge/contracts';

import { MOCK_STORAGE_ORIGIN } from '../../lib/api/mock-storage.ts';
import { PEOPLE, rid } from '../data/core-records.ts';
import type { MockHandler } from '../define.ts';
import { bodyOf, idOf, withViewerAsync } from '../serve.ts';
import type { Viewer } from '../serve.ts';

/** Imports change the books and the registers: partners and finance. */
const FINANCE_ROLES = new Set<Viewer['role']>(['partner', 'finance']);

/**
 * Files, PDFs, jobs and imports. Nothing is stored: an upload is accepted and forgotten, every
 * PDF is the same sample, and an import answers with a fixed preview. The storage host below
 * (MOCK_STORAGE_ORIGIN) does not exist; the BFF points it at /bff/mock-storage on this origin.
 */

const NOW = '2026-11-21T04:00:00Z';
const EXPIRES = '2026-11-21T04:05:00Z';
export const UPLOADED_FILE_ID = rid(9801);
export const SAMPLE_PDF_ID = rid(9811);

const finished = (id: string, kind: string, resultFileId: string | null): Job => ({
  id,
  kind,
  status: 'succeeded',
  progressPercent: 100,
  resultFileId,
  errorCode: null,
  createdAt: NOW,
  finishedAt: NOW,
});

const file = (
  id: string,
  name: string,
  recordType: string,
  recordId: string,
  by = PEOPLE.arif,
): StoredFile => ({
  id,
  name,
  contentType: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
  sizeBytes: 184_320,
  status: 'clean',
  record: { recordType, recordId },
  uploadedBy: by,
  uploadedAt: '2026-11-01T13:20:00Z',
});

/** Receipts and documents already attached to sample records. */
const RECORD_FILES: readonly StoredFile[] = [
  file(rid(1308), 'bus-ticket-chattogram.jpg', 'expense_claim', rid(4001)),
  file(rid(1309), 'hotel-agrabad.pdf', 'expense_claim', rid(4001)),
];

/** What a dry run of an import finds; the same rows whatever the file holds. */
const preview = (type: ImportResult['type'], dryRun: boolean): ImportResult => ({
  id: rid(9821),
  type,
  dryRun,
  status: dryRun ? 'ready' : 'committed',
  rowsTotal: 42,
  rowsWithErrors: 2,
  errors: [
    { row: 7, column: 'amount', message: 'Not an amount: "12,50o"' },
    { row: 19, column: 'date', message: 'Not a date: "31/02/2026"' },
  ],
  jobId: rid(9822),
});

export const platformRecordHandlers: readonly MockHandler[] = [
  withViewerAsync(core.createUpload, () => ({
    json: {
      fileId: UPLOADED_FILE_ID,
      uploadUrl: `${MOCK_STORAGE_ORIGIN}/upload/${UPLOADED_FILE_ID}`,
      expiresAt: EXPIRES,
    },
  })),
  withViewerAsync(core.completeUpload, (viewer, request) => ({
    json: {
      id: idOf(request),
      name: 'uploaded-file.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      // Scanned and clean straight away in the samples.
      status: 'clean',
      record: null,
      uploadedBy: { id: viewer.userId, name: viewer.name },
      uploadedAt: NOW,
    },
  })),
  withViewerAsync(core.listRecordFiles, (_viewer, request) => {
    const query = new URL(request.request.url).searchParams;
    const items = RECORD_FILES.filter(
      (item) =>
        item.record?.recordType === query.get('recordType') &&
        item.record.recordId === query.get('recordId'),
    );
    return { json: { items, nextCursor: null } };
  }),
  withViewerAsync(core.getFile, (_viewer, request) => {
    const found = RECORD_FILES.find((item) => item.id === idOf(request));
    return found === undefined ? { problem: 'NOT_FOUND' } : { json: found };
  }),
  withViewerAsync(core.createDownload, (_viewer, request) => ({
    json: { downloadUrl: `${MOCK_STORAGE_ORIGIN}/download/${idOf(request)}`, expiresAt: EXPIRES },
  })),
  withViewerAsync(core.renderDocument, () => ({
    json: finished(rid(9812), 'document.render', SAMPLE_PDF_ID),
  })),
  withViewerAsync(core.getJob, (_viewer, request) => ({
    json: finished(idOf(request), 'job', SAMPLE_PDF_ID),
  })),
  withViewerAsync(core.startImport, async (viewer, request) => {
    if (!FINANCE_ROLES.has(viewer.role)) return { problem: 'FORBIDDEN' };
    const body = await bodyOf(request);
    return { json: preview(body['type'] as ImportResult['type'], body['dryRun'] !== false) };
  }),
  withViewerAsync(core.getImport, (viewer) =>
    FINANCE_ROLES.has(viewer.role) ? { json: preview('contacts', true) } : { problem: 'FORBIDDEN' },
  ),
  withViewerAsync(core.commitImport, (viewer) =>
    FINANCE_ROLES.has(viewer.role)
      ? { json: preview('contacts', false) }
      : { problem: 'FORBIDDEN' },
  ),
  withViewerAsync(accounting.importBankStatement, (viewer) =>
    FINANCE_ROLES.has(viewer.role)
      ? { json: finished(rid(9831), 'accounting.bank_statement_import', null) }
      : { problem: 'FORBIDDEN' },
  ),
];

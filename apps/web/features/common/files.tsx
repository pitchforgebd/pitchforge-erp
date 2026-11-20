'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import { AllowedContentType, MAX_FILE_BYTES, coreEndpoints as core } from '@pitchforge/contracts';
import type { RecordRef, StoredFile } from '@pitchforge/contracts';
import { Button, Callout, DateText } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';

import { useErrorMessage } from './errors.ts';
import { useCommand } from './step-up.tsx';
import { useList } from './use-list.ts';

/** Why a file was refused before anything was sent. */
export class FileRefused extends Error {
  readonly reason: 'type' | 'size';

  constructor(reason: 'type' | 'size') {
    super(reason);
    this.reason = reason;
  }
}

/**
 * Upload one file: ask the API for a signed URL, send the bytes there, then mark it complete
 * so it is scanned. Type and size are checked first against the contract's own limits.
 */
export async function uploadFile(file: File, record: RecordRef | null): Promise<StoredFile> {
  const contentType = AllowedContentType.safeParse(file.type);
  if (!contentType.success) throw new FileRefused('type');
  if (file.size < 1 || file.size > MAX_FILE_BYTES) throw new FileRefused('size');
  const intent = await browserCall(core.createUpload, {
    body: { name: file.name, contentType: contentType.data, sizeBytes: file.size, record },
  });
  const sent = await fetch(intent.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'content-type': contentType.data },
    credentials: 'same-origin',
  });
  if (!sent.ok) throw new Error(`Upload failed with ${String(sent.status)}`);
  return browserCall(core.completeUpload, { params: { id: intent.fileId } });
}

/** Open a stored file through a short-lived signed link. */
export async function openFile(fileId: string): Promise<void> {
  const link = await browserCall(core.createDownload, { params: { id: fileId } });
  window.open(link.downloadUrl, '_blank', 'noopener,noreferrer');
}

/** A message for an upload that failed, refused files included. */
export function useUploadError(): (error: unknown) => string {
  const t = useTranslations('files');
  const message = useErrorMessage();
  return (error) => {
    if (error instanceof FileRefused) {
      return error.reason === 'type'
        ? t('wrongType')
        : t('tooLarge', { megabytes: MAX_FILE_BYTES / 1024 / 1024 });
    }
    return message(error);
  };
}

/** A file picker with its label; the file is handed over, not uploaded. */
export function FilePicker({
  label,
  onPick,
  accept,
}: {
  readonly label: string;
  readonly onPick: (file: File | null) => void;
  readonly accept?: string;
}): ReactNode {
  const id = useId();
  const t = useTranslations('files');
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept={accept ?? AllowedContentType.options.join(',')}
        className="text-sm file:mr-3 file:rounded-control file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm"
        onChange={(event) => {
          onPick(event.target.files?.item(0) ?? null);
        }}
      />
      <p className="text-xs text-muted">
        {t('limits', { megabytes: MAX_FILE_BYTES / 1024 / 1024 })}
      </p>
    </div>
  );
}

/** Files attached to one record: list, open and, when allowed, attach another. */
export function RecordFiles({
  record,
  canAttach,
}: {
  readonly record: RecordRef;
  readonly canAttach: boolean;
}): ReactNode {
  const t = useTranslations('files');
  const uploadError = useUploadError();
  const message = useErrorMessage();
  const files = useList(core.listRecordFiles, {
    recordType: record.recordType,
    recordId: record.recordId,
  });
  const [picked, setPicked] = useState<File | null>(null);
  const attach = useCommand((file: File) => uploadFile(file, record), {
    success: t('attached'),
    invalidate: [core.listRecordFiles.id],
    onSuccess: () => {
      setPicked(null);
    },
  });
  const open = useCommand((fileId: string) => openFile(fileId));
  return (
    <section aria-label={t('attachments')} className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
        {t('attachments')}
      </p>
      {files.items.length === 0 ? (
        <p className="text-sm text-muted">{t('none')}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {files.items.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {file.name}{' '}
                <span className="text-xs text-muted">
                  · {file.uploadedBy.name} · <DateText value={file.uploadedAt.slice(0, 10)} />
                </span>
              </span>
              {file.status === 'clean' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={t('openLabel', { name: file.name })}
                  onClick={() => {
                    open.mutate(file.id);
                  }}
                >
                  {t('open')}
                </Button>
              ) : (
                <span className="text-xs text-muted">{t(`status.${file.status}`)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {open.isError && <Callout tone="crit" title={message(open.error)} />}
      {canAttach && (
        <div className="flex flex-wrap items-end gap-2">
          <FilePicker label={t('attach')} onPick={setPicked} />
          <Button
            size="sm"
            loading={attach.isPending}
            disabled={picked === null}
            onClick={() => {
              if (picked !== null) attach.mutate(picked);
            }}
          >
            {t('upload')}
          </Button>
        </div>
      )}
      {attach.isError && <Callout tone="crit" title={uploadError(attach.error)} />}
    </section>
  );
}

type Template = 'invoice' | 'payslip' | 'purchase_order' | 'statement' | 'bank_advice';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Ask the server for a branded PDF of a record, wait for the job, then open it. */
async function renderPdf(template: Template, record: RecordRef): Promise<void> {
  let job = await browserCall(core.renderDocument, { body: { template, record } });
  for (
    let tries = 0;
    tries < 20 && job.status !== 'succeeded' && job.status !== 'failed';
    tries += 1
  ) {
    await sleep(1000);
    job = await browserCall(core.getJob, { params: { id: job.id } });
  }
  if (job.status !== 'succeeded' || job.resultFileId === null) throw new Error('PDF was not made');
  await openFile(job.resultFileId);
}

export function PdfButton({
  template,
  record,
  label,
}: {
  readonly template: Template;
  readonly record: RecordRef;
  readonly label?: string;
}): ReactNode {
  const t = useTranslations('files');
  const message = useErrorMessage();
  const pdf = useCommand(() => renderPdf(template, record));
  return (
    <>
      <Button
        variant="secondary"
        loading={pdf.isPending}
        onClick={() => {
          pdf.mutate(undefined);
        }}
      >
        {label ?? t('pdf')}
      </Button>
      {pdf.isError && <Callout tone="crit" title={message(pdf.error)} />}
    </>
  );
}

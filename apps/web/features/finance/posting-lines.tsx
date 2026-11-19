import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Money } from '@pitchforge/ui';

export interface PostingLine {
  readonly accountCode: string;
  readonly accountName: string;
  readonly description: string | null;
  readonly debit: { readonly amount: string; readonly currency: string };
  readonly credit: { readonly amount: string; readonly currency: string };
}

const isZero = (amount: string) => /^[0.]+$/.test(amount);

/** Journal lines as the posting engine sent them; nothing is summed here. */
export function PostingLines({
  title,
  lines,
  note,
  totals,
}: {
  readonly title: string;
  readonly lines: readonly PostingLine[];
  readonly note?: string;
  /** Totals from the server, when it sends them. */
  readonly totals?: {
    readonly debit: PostingLine['debit'];
    readonly credit: PostingLine['credit'];
  };
}): ReactNode {
  const t = useTranslations('finance');
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</p>
      <div
        className="overflow-x-auto rounded-control border border-line"
        role="group"
        aria-label={title}
        tabIndex={0}
      >
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] tracking-wider text-muted uppercase">
              <th scope="col" className="px-3 py-2">
                {t('account')}
              </th>
              <th scope="col" className="px-3 py-2">
                {t('memo')}
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                {t('debit')}
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                {t('credit')}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr
                key={`${line.accountCode}-${String(index)}`}
                className="border-b border-line last:border-b-0"
              >
                <td className="px-3 py-2">
                  <span className="font-mono text-xs">{line.accountCode}</span> {line.accountName}
                </td>
                <td className="px-3 py-2 text-muted">{line.description ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  {isZero(line.debit.amount) ? '' : <Money value={line.debit} />}
                </td>
                <td className="px-3 py-2 text-right">
                  {isZero(line.credit.amount) ? '' : <Money value={line.credit} />}
                </td>
              </tr>
            ))}
            {totals !== undefined && (
              <tr className="border-t-2 border-line-strong font-semibold">
                <td className="px-3 py-2" colSpan={2}>
                  {t('total')}
                </td>
                <td className="px-3 py-2 text-right">
                  <Money value={totals.debit} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Money value={totals.credit} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {note !== undefined && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

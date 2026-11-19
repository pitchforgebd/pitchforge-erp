'use client';

import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import type { RowData } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn.ts';

export interface DataTableColumn<Row> {
  readonly id: string;
  readonly header: string;
  readonly cell: (row: Row) => ReactNode;
  /** Numbers and money align right. */
  readonly align?: 'left' | 'right';
  /** Sorted by the server: a click asks for a new `sort`, rows are never sorted here. */
  readonly sortable?: boolean;
}

export type DataTableStatus = 'loading' | 'error' | 'ready';

export interface DataTableProps<Row> {
  /** Names the table for screen readers. */
  readonly label: string;
  readonly columns: readonly DataTableColumn<Row>[];
  readonly rows: readonly Row[];
  readonly getRowId: (row: Row) => string;
  readonly status?: DataTableStatus;
  /** The API's sort value: `date` or `-date`. */
  readonly sort?: string;
  readonly onSortChange?: (sort: string) => void;
  readonly loadingState: ReactNode;
  readonly errorState: ReactNode;
  readonly emptyState: ReactNode;
}

const features = tableFeatures({});

function SortIcon({ direction }: { readonly direction: 'ascending' | 'descending' | 'none' }) {
  if (direction === 'ascending') return <ArrowUp aria-hidden className="size-3.5" />;
  if (direction === 'descending') return <ArrowDown aria-hidden className="size-3.5" />;
  return <ChevronsUpDown aria-hidden className="size-3.5 text-muted" />;
}

function directionOf(sort: string | undefined, id: string) {
  if (sort === id) return 'ascending';
  if (sort === `-${id}`) return 'descending';
  return 'none';
}

/** Server-side table: sorting, filtering and pagination all happen in the API. */
export function DataTable<Row extends RowData>({
  label,
  columns,
  rows,
  getRowId,
  status = 'ready',
  sort,
  onSortChange,
  loadingState,
  errorState,
  emptyState,
}: DataTableProps<Row>): ReactNode {
  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<typeof features, Row>();
    return helper.columns(
      columns.map((column) =>
        helper.display({
          id: column.id,
          header: () => column.header,
          cell: (context) => column.cell(context.row.original),
        }),
      ),
    );
  }, [columns]);

  const data = useMemo(() => [...rows], [rows]);
  const table = useTable({
    features,
    columns: tableColumns,
    data,
    getRowId: (row) => getRowId(row),
  });
  const columnById = new Map(columns.map((column) => [column.id, column]));

  let body: ReactNode = null;
  if (status === 'loading') body = loadingState;
  if (status === 'error') body = errorState;
  if (status === 'ready' && rows.length === 0) body = emptyState;

  return (
    <div className="rounded-card border border-line bg-surface">
      {/* A wide table scrolls inside its own frame, by keyboard too. */}
      <div role="group" aria-label={label} tabIndex={0} className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" aria-busy={status === 'loading'}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-line">
                {group.headers.map((header) => {
                  const column = columnById.get(header.id);
                  const direction = directionOf(sort, header.id);
                  const canSort = column?.sortable === true && onSortChange !== undefined;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={canSort ? direction : undefined}
                      className={cn(
                        'px-3 py-2 text-[11px] font-semibold tracking-wider whitespace-nowrap text-muted uppercase',
                        column?.align === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 uppercase"
                          onClick={() => {
                            onSortChange(direction === 'ascending' ? `-${header.id}` : header.id);
                          }}
                        >
                          <table.FlexRender header={header} />
                          <SortIcon direction={direction} />
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          {body === null && (
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  {row.getAllCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-3 py-2',
                        columnById.get(cell.column.id)?.align === 'right' && 'text-right',
                      )}
                    >
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      {body}
    </div>
  );
}

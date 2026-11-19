'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { Endpoint } from '@pitchforge/contracts';

import { browserCall } from '../../lib/api/browser.ts';
import type { CallOptions, CallResult } from '../../lib/api/client.ts';

type ItemOf<E> = CallResult<E> extends { items: readonly (infer I)[] } ? I : never;
type QueryOf<E> = CallOptions<E> extends { query: infer Q } ? Q : Record<string, never>;

export interface ListState<E> {
  readonly items: readonly ItemOf<E>[];
  readonly status: 'loading' | 'error' | 'ready';
  readonly error: unknown;
  readonly hasMore: boolean;
  readonly loadingMore: boolean;
  readonly loadMore: () => void;
  readonly refetch: () => void;
}

/**
 * A cursor-paged list from the API. Sorting and filtering are query parameters, done by the
 * server; pages are appended with "Load more".
 */
export function useList<E extends Endpoint & { list: true }>(
  endpoint: E,
  query: Partial<QueryOf<E>> = {},
): ListState<E> {
  const result = useInfiniteQuery({
    queryKey: [endpoint.id, query],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      browserCall(endpoint, {
        query: { ...query, ...(pageParam !== undefined && { cursor: pageParam }) },
      } as CallOptions<E>) as Promise<{ items: ItemOf<E>[]; nextCursor: string | null }>,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  return {
    items: result.data?.pages.flatMap((page) => page.items) ?? [],
    status: result.isPending ? 'loading' : result.isError ? 'error' : 'ready',
    error: result.error,
    hasMore: result.hasNextPage,
    loadingMore: result.isFetchingNextPage,
    loadMore: () => {
      void result.fetchNextPage();
    },
    refetch: () => {
      void result.refetch();
    },
  };
}

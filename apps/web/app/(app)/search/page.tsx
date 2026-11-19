import type { ReactNode } from 'react';

import { SearchPage } from '../../../features/search/search-page.tsx';

export default async function Page({
  searchParams,
}: {
  readonly searchParams: Promise<{ q?: string | string[] }>;
}): Promise<ReactNode> {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q : '';
  // The key resets the form when a new search comes from the header.
  return <SearchPage key={query} initialQuery={query} />;
}

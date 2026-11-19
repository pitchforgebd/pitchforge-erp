'use client';

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setNonce } from 'get-nonce';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { ToasterProvider } from '@pitchforge/ui';

import { ApiError } from '../lib/api/client.ts';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        // A session that ended while the page was open.
        if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
          window.location.assign('/session-expired');
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => !(error instanceof ApiError) && count < 2,
      },
    },
  });
}

export interface AppProvidersProps {
  /** The CSP nonce of this response: Radix's scroll lock adds a <style> element with it. */
  readonly nonce: string | undefined;
  readonly children: ReactNode;
}

export function AppProviders({ nonce, children }: AppProvidersProps): ReactNode {
  const t = useTranslations('common');
  const [queryClient] = useState(makeQueryClient);
  if (nonce !== undefined) setNonce(nonce);

  return (
    <QueryClientProvider client={queryClient}>
      <ToasterProvider regionLabel={t('notifications')} closeLabel={t('close')}>
        {children}
      </ToasterProvider>
    </QueryClientProvider>
  );
}

'use client';

import { useTranslations } from 'next-intl';

import type { ErrorCode } from '@pitchforge/contracts';

import { ApiError } from '../../lib/api/client.ts';

/** The stable code of a failed call, or null for a network or programming error. */
export function errorCodeOf(error: unknown): ErrorCode | null {
  return error instanceof ApiError ? error.code : null;
}

/** The translated message for a failed call, by stable error code. */
export function useErrorMessage(): (error: unknown) => string {
  const t = useTranslations('errors');
  return (error) => {
    const code = errorCodeOf(error) ?? 'unknown';
    return t.has(code) ? t(code) : t('unknown');
  };
}

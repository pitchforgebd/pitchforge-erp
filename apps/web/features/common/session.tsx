'use client';

import { createContext, use } from 'react';
import type { ReactNode } from 'react';

import type { CurrentSession } from '@pitchforge/contracts';

const SessionContext = createContext<CurrentSession | null>(null);

/** The signed-in user, read once by the app layout on the server. */
export function SessionProvider({
  session,
  children,
}: {
  readonly session: CurrentSession;
  readonly children: ReactNode;
}): ReactNode {
  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession(): CurrentSession {
  const session = use(SessionContext);
  if (session === null) throw new Error('useSession needs a SessionProvider');
  return session;
}

/** Navigation only: the API still refuses anything the role may not do. */
export function useCanRead(area: string): boolean {
  return useSession().permissions.includes(`${area}.read`);
}

/**
 * Whether to offer a collection action such as "New employee" (ADR-0018). Like useCanRead it
 * only shapes the screen; the API refuses anything the role may not do.
 */
export function useCan(capability: string): boolean {
  return useSession().permissions.includes(capability);
}

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

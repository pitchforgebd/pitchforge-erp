import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { coreEndpoints as core } from '@pitchforge/contracts';

import { AppShell } from '../../features/shell/app-shell.tsx';
import { ApiError } from '../../lib/api/client.ts';
import { serverCall } from '../../lib/api/server.ts';

async function currentSession() {
  try {
    return await serverCall(core.getSession, {});
  } catch (error) {
    if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
      redirect('/session-expired');
    }
    throw error;
  }
}

export default async function AppLayout({
  children,
}: {
  readonly children: ReactNode;
}): Promise<ReactNode> {
  const session = await currentSession();
  return (
    <AppShell userName={session.name} permissions={session.permissions}>
      {children}
    </AppShell>
  );
}

'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { coreEndpoints as core } from '@pitchforge/contracts';
import { Button, Dialog } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';

/** The server ends a session after 60 idle minutes (cookie policy); warn five minutes before. */
export const IDLE_LIMIT_MS = 60 * 60 * 1000;
export const WARN_BEFORE_MS = 5 * 60 * 1000;

const ACTIVITY = ['pointerdown', 'keydown'] as const;

/**
 * Warns before the idle timeout. The timer here only predicts the server's: the server still
 * ends the session, and any call after that sends the user to sign in again.
 */
export function IdleWarning(): ReactNode {
  const t = useTranslations('idle');
  const common = useTranslations('common');
  const [open, setOpen] = useState(false);
  const timers = useRef<{ warn?: number; end?: number }>({});

  const schedule = useCallback(() => {
    window.clearTimeout(timers.current.warn);
    window.clearTimeout(timers.current.end);
    timers.current.warn = window.setTimeout(() => {
      setOpen(true);
    }, IDLE_LIMIT_MS - WARN_BEFORE_MS);
    timers.current.end = window.setTimeout(() => {
      window.location.assign('/session-expired');
    }, IDLE_LIMIT_MS);
  }, []);

  useEffect(() => {
    const current = timers.current;
    schedule();
    const onActivity = () => {
      if (!open) schedule();
    };
    for (const name of ACTIVITY) window.addEventListener(name, onActivity, { passive: true });
    return () => {
      for (const name of ACTIVITY) window.removeEventListener(name, onActivity);
      window.clearTimeout(current.warn);
      window.clearTimeout(current.end);
    };
  }, [open, schedule]);

  // Any authenticated call counts as activity on the server.
  const stay = useMutation({
    mutationFn: () => browserCall(core.getSession, {}),
    onSuccess: () => {
      setOpen(false);
      schedule();
    },
  });

  const signOut = useMutation({
    mutationFn: () => browserCall(core.logout, {}),
    onSettled: () => {
      window.location.assign('/login');
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) stay.mutate();
      }}
      title={t('title')}
      description={t('description')}
      closeLabel={common('close')}
      footer={
        <>
          <Button
            variant="secondary"
            loading={signOut.isPending}
            onClick={() => {
              signOut.mutate();
            }}
          >
            {t('signOut')}
          </Button>
          <Button
            loading={stay.isPending}
            onClick={() => {
              stay.mutate();
            }}
          >
            {t('stay')}
          </Button>
        </>
      }
    />
  );
}

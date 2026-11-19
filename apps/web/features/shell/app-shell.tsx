'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { coreEndpoints as core } from '@pitchforge/contracts';
import { Button, Dialog, EmptyState, IconButton, cn } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { visibleSections } from '../../lib/navigation.ts';

function NavLinks({
  permissions,
  onNavigate,
}: {
  readonly permissions: readonly string[];
  readonly onNavigate?: () => void;
}): ReactNode {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const links = ['home', ...visibleSections(permissions)] as const;

  return (
    <ul className="flex flex-col gap-0.5">
      {links.map((section) => {
        const href = `/${section}`;
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={section}>
            <Link
              href={href}
              {...(onNavigate !== undefined && { onClick: onNavigate })}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'block rounded-control px-3 py-2 text-sm text-rail-fg hover:bg-rail-2',
                current && 'bg-rail-active font-medium text-rail-head',
              )}
            >
              {t(section)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NotificationsDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}): ReactNode {
  const t = useTranslations('notifications');
  const common = useTranslations('common');
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => browserCall(core.listNotifications, { query: {} }),
    enabled: open,
  });

  let body: ReactNode;
  if (notifications.isPending) {
    body = <p className="text-sm text-muted">{t('loading')}</p>;
  } else if (notifications.isError) {
    body = <EmptyState title={t('errorTitle')} />;
  } else if (notifications.data.items.length === 0) {
    body = <EmptyState title={t('emptyTitle')} />;
  } else {
    body = (
      <ul className="flex flex-col gap-3">
        {notifications.data.items.map((item) => (
          <li key={item.id} className={cn(item.readAt === null && 'font-medium')}>
            <p className="text-sm">{item.title}</p>
            <p className="text-xs font-normal text-muted">{item.body}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={common('notifications')}
      closeLabel={common('close')}
    >
      {body}
    </Dialog>
  );
}

export interface AppShellProps {
  readonly userName: string;
  readonly permissions: readonly string[];
  readonly children: ReactNode;
}

export function AppShell({ userName, permissions, children }: AppShellProps): ReactNode {
  const t = useTranslations('shell');
  const app = useTranslations('app');
  const common = useTranslations('common');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const logout = useMutation({
    mutationFn: () => browserCall(core.logout, {}),
    onSuccess: () => {
      // A full load drops every cached response from this session.
      window.location.assign('/login');
    },
  });

  return (
    <div className="min-h-dvh bg-bg md:grid md:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-4 overflow-y-auto bg-rail p-3 md:flex">
        <p className="px-3 pt-1 font-display text-lg font-bold text-rail-head">{app('brand')}</p>
        <nav aria-label={t('mainNavigation')}>
          <NavLinks permissions={permissions} />
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface px-4">
          <IconButton
            className="md:hidden"
            label={t('openMenu')}
            icon={<Menu aria-hidden className="size-5" />}
            onClick={() => {
              setMenuOpen(true);
            }}
          />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{userName}</p>
          <IconButton
            label={common('notifications')}
            icon={<Bell aria-hidden className="size-5" />}
            onClick={() => {
              setNotificationsOpen(true);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            loading={logout.isPending}
            onClick={() => {
              logout.mutate();
            }}
          >
            <LogOut aria-hidden className="size-4" />
            {t('signOut')}
          </Button>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>

      <Dialog
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title={t('menu')}
        closeLabel={common('close')}
      >
        <nav aria-label={t('mainNavigation')} className="rounded-control bg-rail p-2">
          <NavLinks
            permissions={permissions}
            onNavigate={() => {
              setMenuOpen(false);
            }}
          />
        </nav>
      </Dialog>

      <NotificationsDialog open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </div>
  );
}

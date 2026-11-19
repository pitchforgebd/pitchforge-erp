'use client';

import { X } from 'lucide-react';
import { Dialog as DialogPrimitive, Tabs as TabsPrimitive, Toast } from 'radix-ui';
import { createContext, use, useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { uuidV7 } from '@pitchforge/shared-kernel';

import { cn } from '../lib/cn.ts';

import { IconButton } from './button.tsx';

export interface DialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly closeLabel: string;
  readonly children?: ReactNode;
  readonly footer?: ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  footer,
}: DialogProps): ReactNode {
  const returnFocusTo = useRef<Element | null>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <DialogPrimitive.Content
          {...(description === undefined && { 'aria-describedby': undefined })}
          onOpenAutoFocus={() => {
            returnFocusTo.current = document.activeElement;
          }}
          onCloseAutoFocus={(event) => {
            // Radix returns focus only to a Dialog.Trigger, and this dialog is controlled.
            event.preventDefault();
            if (returnFocusTo.current instanceof HTMLElement) returnFocusTo.current.focus();
          }}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border border-line bg-surface text-fg shadow-raised"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line p-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-base font-semibold">
                {title}
              </DialogPrimitive.Title>
              {description !== undefined && (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton
                size="sm"
                label={closeLabel}
                icon={<X aria-hidden className="size-4" />}
              />
            </DialogPrimitive.Close>
          </div>
          {children !== undefined && <div className="overflow-y-auto p-4">{children}</div>}
          {footer !== undefined && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line p-4">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface TabItem {
  readonly value: string;
  readonly label: string;
  readonly content: ReactNode;
}

export interface TabsProps {
  readonly label: string;
  readonly items: readonly TabItem[];
  readonly defaultValue?: string;
}

export function Tabs({ label, items, defaultValue }: TabsProps): ReactNode {
  const initial = defaultValue ?? items.at(0)?.value;
  return (
    <TabsPrimitive.Root {...(initial !== undefined && { defaultValue: initial })}>
      <TabsPrimitive.List
        aria-label={label}
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className="border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-muted data-[state=active]:border-accent data-[state=active]:font-medium data-[state=active]:text-fg"
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value} className="pt-4">
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export type ToastTone = 'info' | 'good' | 'crit';

export interface ToastMessage {
  readonly title: string;
  readonly description?: string;
  readonly tone?: ToastTone;
}

const ToastContext = createContext<((message: ToastMessage) => void) | null>(null);

/** Show a toast from inside a ToasterProvider. */
export function useToast(): (message: ToastMessage) => void {
  const show = use(ToastContext);
  if (show === null) throw new Error('useToast needs a ToasterProvider');
  return show;
}

const TOAST_BORDER: Readonly<Record<ToastTone, string>> = {
  info: 'border-l-info',
  good: 'border-l-good',
  crit: 'border-l-crit',
};

export interface ToasterProviderProps {
  /** Landmark name for the notifications region. */
  readonly regionLabel: string;
  readonly closeLabel: string;
  readonly children: ReactNode;
}

/**
 * Toasts on Radix, which injects no <style> element. Libraries that do (sonner) would be
 * blocked by the strict Content-Security-Policy.
 */
export function ToasterProvider({
  regionLabel,
  closeLabel,
  children,
}: ToasterProviderProps): ReactNode {
  const [toasts, setToasts] = useState<readonly (ToastMessage & { id: string })[]>([]);

  const show = useCallback((message: ToastMessage) => {
    setToasts((current) => [...current, { ...message, id: uuidV7() }]);
  }, []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext value={value}>
      <Toast.Provider label={regionLabel}>
        {children}
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            onOpenChange={(open) => {
              if (!open) setToasts((current) => current.filter((t) => t.id !== toast.id));
            }}
            className={cn(
              'flex items-start justify-between gap-3 rounded-card border border-l-4 border-line bg-surface p-3 text-fg shadow-raised',
              TOAST_BORDER[toast.tone ?? 'info'],
            )}
          >
            <div className="min-w-0">
              <Toast.Title className="text-sm font-medium">{toast.title}</Toast.Title>
              {toast.description !== undefined && (
                <Toast.Description className="text-sm text-muted">
                  {toast.description}
                </Toast.Description>
              )}
            </div>
            <Toast.Close asChild>
              <IconButton
                size="sm"
                label={closeLabel}
                icon={<X aria-hidden className="size-4" />}
              />
            </Toast.Close>
          </Toast.Root>
        ))}
        {/* Only while there are toasts: rendered on the server, Radix's wrapper has a style
            attribute that the CSP blocks, and an empty viewport would sit over the page. */}
        {toasts.length > 0 && (
          <Toast.Viewport className="fixed right-0 bottom-0 z-50 flex w-full max-w-sm flex-col gap-2 p-4" />
        )}
      </Toast.Provider>
    </ToastContext>
  );
}

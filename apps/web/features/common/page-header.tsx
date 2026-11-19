import type { ReactNode } from 'react';

export interface PageHeaderProps {
  readonly title: string;
  readonly description?: string;
  /** Buttons on the right; they wrap below the title on a phone. */
  readonly actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps): ReactNode {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {description !== undefined && (
          <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>
        )}
      </div>
      {actions !== undefined && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** A titled panel; most screens are a stack of these. */
export function Card({
  title,
  description,
  actions,
  children,
}: {
  readonly title?: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <section className="rounded-card border border-line bg-surface">
      {title !== undefined && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold">{title}</h2>
            {description !== undefined && <p className="text-xs text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

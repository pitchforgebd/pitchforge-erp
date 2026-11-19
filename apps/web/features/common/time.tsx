import type { ReactNode } from 'react';

import { formatDateTime } from '@pitchforge/shared-kernel';

/** A UTC timestamp shown in Asia/Dhaka: 04 Nov 2026, 14:30. Same on server and browser. */
export function TimeText({ value }: { readonly value: string }): ReactNode {
  return (
    <time dateTime={value} className="whitespace-nowrap">
      {formatDateTime(new Date(value))}
    </time>
  );
}

import type { ReactNode } from 'react';

import { ProjectDetail } from '../../../../features/projects/project-detail.tsx';

export default async function Page({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  return <ProjectDetail id={id} />;
}

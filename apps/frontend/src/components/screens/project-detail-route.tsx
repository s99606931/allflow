'use client';

import { AppShell } from '@/components/shell/app-shell';
import { ProjectDetail } from '@/components/screens/project-detail';

interface Props {
  projectId: string;
}

export function ProjectDetailRoute({ projectId }: Props) {
  return (
    <AppShell title="프로젝트 상세" subtitle={`#${projectId}`}>
      <ProjectDetail projectId={projectId} />
    </AppShell>
  );
}

'use client';

import { AppShell } from '@/components/shell/app-shell';
import { ProjectsPage } from '@/components/screens/projects';

export function ProjectsRoute() {
  return (
    <AppShell title="프로젝트" subtitle="모든 프로젝트 한눈에 보기">
      <ProjectsPage />
    </AppShell>
  );
}

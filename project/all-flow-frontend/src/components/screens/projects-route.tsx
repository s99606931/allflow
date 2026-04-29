'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ProjectsPage } from '@/components/screens/projects';
import { TaskDetailDialog } from '@/components/screens/task-detail';
import { Button } from '@/components/ui/primitives';

export function ProjectsRoute() {
  const [openTask, setOpenTask] = useState<string | null>(null);

  return (
    <AppShell
      title="프로젝트"
      subtitle="모든 프로젝트 한눈에 보기"
      actions={<Button variant="ghost" size="sm" onClick={() => setOpenTask('T-1024')}>샘플 태스크 열기 →</Button>}
    >
      <ProjectsPage />
      <TaskDetailDialog taskId={openTask} onClose={() => setOpenTask(null)} />
    </AppShell>
  );
}

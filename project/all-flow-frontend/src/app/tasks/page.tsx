import { AppShell } from '@/components/shell/app-shell';
import { TasksPage } from '@/components/screens/tasks';

export default function Page() {
  return (
    <AppShell title="내 태스크" subtitle="리스트 · 보드 · 캘린더">
      <TasksPage />
    </AppShell>
  );
}

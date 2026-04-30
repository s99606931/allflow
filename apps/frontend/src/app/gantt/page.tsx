import { AppShell } from '@/components/shell/app-shell';
import { GanttPage } from '@/components/screens/gantt';

export default function Page() {
  return (
    <AppShell title="간트차트" subtitle="포트폴리오 일정 관리">
      <GanttPage />
    </AppShell>
  );
}

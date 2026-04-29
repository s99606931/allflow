import { AppShell } from '@/components/shell/app-shell';
import { CalendarPage } from '@/components/screens/calendar';

export default function Page() {
  return (
    <AppShell title="캘린더" subtitle="회의 · 마감 · 마일스톤">
      <CalendarPage />
    </AppShell>
  );
}

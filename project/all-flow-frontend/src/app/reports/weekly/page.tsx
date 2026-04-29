import { AppShell } from '@/components/shell/app-shell';
import { ReportWeeklyPage } from '@/components/screens/report-weekly';

export default function Page() {
  return (
    <AppShell title="주간 보고" subtitle="AI가 자동으로 작성한 16주차 보고">
      <ReportWeeklyPage />
    </AppShell>
  );
}

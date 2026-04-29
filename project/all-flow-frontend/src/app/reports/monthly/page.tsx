import { AppShell } from '@/components/shell/app-shell';
import { ReportMonthlyPage } from '@/components/screens/report-monthly';

export default function Page() {
  return (
    <AppShell title="월간 보고" subtitle="임원진 발송용 · 2026년 4월">
      <ReportMonthlyPage />
    </AppShell>
  );
}

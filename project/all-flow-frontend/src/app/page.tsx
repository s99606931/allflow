import { AppShell } from '@/components/shell/app-shell';
import { DashboardPage } from '@/components/screens/dashboard';

export default function Page() {
  return (
    <AppShell title="대시보드" subtitle="내 워크스페이스 한눈에 보기">
      <DashboardPage />
    </AppShell>
  );
}

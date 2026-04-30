import { AppShell } from '@/components/shell/app-shell';
import { HRPage } from '@/components/screens/hr';

export default function Page() {
  return (
    <AppShell title="인사 / HR" subtitle="휴가 · 근태 · 평가 · 1:1 미팅">
      <HRPage />
    </AppShell>
  );
}

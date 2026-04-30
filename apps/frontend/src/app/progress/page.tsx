import { AppShell } from '@/components/shell/app-shell';
import { ProgressPage } from '@/components/screens/progress';

export default function Page() {
  return (
    <AppShell title="진행률 관리" subtitle="포트폴리오 · 간트 · 헬스체크">
      <ProgressPage />
    </AppShell>
  );
}

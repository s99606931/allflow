import { AppShell } from '@/components/shell/app-shell';
import { AdminPage } from '@/components/screens/admin';

export default function Page() {
  return (
    <AppShell title="관리자 콘솔" subtitle="시스템 헬스 · 보안 · 감사">
      <AdminPage />
    </AppShell>
  );
}

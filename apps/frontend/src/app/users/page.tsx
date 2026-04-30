import { AppShell } from '@/components/shell/app-shell';
import { UsersPage } from '@/components/screens/users';

export default function Page() {
  return (
    <AppShell title="사용자 관리" subtitle="역할 · MFA · 감사 로그">
      <UsersPage />
    </AppShell>
  );
}

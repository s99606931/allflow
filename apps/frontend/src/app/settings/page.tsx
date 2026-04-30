import { AppShell } from '@/components/shell/app-shell';
import { SettingsPage } from '@/components/screens/settings';

export default function Page() {
  return (
    <AppShell title="개인 설정" subtitle="프로필 · 알림 · 보안 · 연동">
      <SettingsPage />
    </AppShell>
  );
}

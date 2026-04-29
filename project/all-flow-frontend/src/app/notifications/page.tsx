import { AppShell } from '@/components/shell/app-shell';
import { NotificationsPage } from '@/components/screens/notifications';

export default function Page() {
  return (
    <AppShell title="알림 센터" subtitle="@멘션 · SLA · AI 제안">
      <NotificationsPage />
    </AppShell>
  );
}

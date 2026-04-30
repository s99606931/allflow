import { AppShell } from '@/components/shell/app-shell';
import { ResourcesPage } from '@/components/screens/resources';

export default function Page() {
  return (
    <AppShell title="회의실 / 리소스" subtitle="회의실 · 장비 · 예약 현황">
      <ResourcesPage />
    </AppShell>
  );
}

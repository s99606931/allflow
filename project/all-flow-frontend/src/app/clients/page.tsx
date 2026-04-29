import { AppShell } from '@/components/shell/app-shell';
import { ClientsPage } from '@/components/screens/clients';

export default function Page() {
  return (
    <AppShell title="고객사 (CRM)" subtitle="MRR · ARR · 헬스 스코어">
      <ClientsPage />
    </AppShell>
  );
}

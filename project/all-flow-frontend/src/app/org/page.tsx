import { AppShell } from '@/components/shell/app-shell';
import { OrgPage } from '@/components/screens/org';

export default function Page() {
  return (
    <AppShell title="조직도" subtitle="부서 · 팀장 · 멤버">
      <OrgPage />
    </AppShell>
  );
}

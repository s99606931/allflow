import { AppShell } from '@/components/shell/app-shell';
import { IssuesPageFull } from '@/components/screens/issues-full';

export default function Page() {
  return (
    <AppShell title="이슈 관리" subtitle="버그 · SLA · 운영 이슈">
      <IssuesPageFull />
    </AppShell>
  );
}

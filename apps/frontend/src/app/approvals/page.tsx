import { AppShell } from '@/components/shell/app-shell';
import { ApprovalsPage } from '@/components/screens/approvals';

export default function Page() {
  return (
    <AppShell title="결재함" subtitle="전자결재 · 휴가 · 경비 · 구매 · 출장 · 문서">
      <ApprovalsPage />
    </AppShell>
  );
}

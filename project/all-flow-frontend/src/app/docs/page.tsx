import { AppShell } from '@/components/shell/app-shell';
import { DocsPage } from '@/components/screens/docs';

export default function Page() {
  return (
    <AppShell title="문서 / 위키" subtitle="공유 지식 + AI 요약">
      <DocsPage />
    </AppShell>
  );
}

import { AppShell } from '@/components/shell/app-shell';
import { NotionPage } from '@/components/screens/notion';

export default function Page() {
  return (
    <AppShell title="Notion 연동" subtitle="양방향 동기화 · 6개 데이터베이스">
      <NotionPage />
    </AppShell>
  );
}

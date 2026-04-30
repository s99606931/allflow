import { AppShell } from '@/components/shell/app-shell';
import { AIAutoPage } from '@/components/screens/ai-auto';

export default function Page() {
  return (
    <AppShell title="AI 자동 등록" subtitle="회의록 · 이메일 · 음성 → 액션 아이템">
      <AIAutoPage />
    </AppShell>
  );
}

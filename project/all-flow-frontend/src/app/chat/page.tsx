import { AppShell } from '@/components/shell/app-shell';
import { ChatPage } from '@/components/screens/chat';

export default function Page() {
  return (
    <AppShell title="팀 채팅" subtitle="채널 · DM · AI 어시스턴트">
      <ChatPage />
    </AppShell>
  );
}

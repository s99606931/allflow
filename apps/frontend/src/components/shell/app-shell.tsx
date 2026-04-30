import { AIPanel } from '@/components/shell/ai-panel';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { TweaksFloating } from '@/components/screens/_stub';
import { CommandPalette } from '@/components/shell/command-palette';

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <AIPanel />
      <TweaksFloating />
      <CommandPalette />
    </div>
  );
}

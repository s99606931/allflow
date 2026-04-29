'use client';

import { Avatar, IconButton } from '@/components/ui/primitives';
import { ME } from '@/lib/fixtures';
import { useUIStore } from '@/store/ui-store';
import { useRealtime } from '@/lib/realtime';
import { Bell, HelpCircle, Moon, Sparkles, Sun } from 'lucide-react';

export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  const theme = useUIStore(s => s.theme);
  const setTheme = useUIStore(s => s.setTheme);
  const toggleAI = useUIStore(s => s.toggleAIPanel);
  const { status: rtStatus } = useRealtime();

  const rtColor =
    rtStatus === 'open' ? 'bg-success'
    : rtStatus === 'connecting' ? 'bg-warning animate-pulse'
    : 'bg-fg-3';
  const rtLabel =
    rtStatus === 'open' ? '실시간 연결됨'
    : rtStatus === 'connecting' ? '연결 중...'
    : '오프라인';

  return (
    <header className="h-14 sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-border flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[15px] font-semibold text-fg truncate tracking-tight">{title}</h1>
          {subtitle && <span className="text-[12px] text-fg-3 truncate">· {subtitle}</span>}
        </div>
      </div>

      {actions}

      <div
        className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full bg-bg-1 border border-border"
        title={rtLabel}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${rtColor}`} />
        <span className="text-[10px] text-fg-3 tabular-nums">{rtLabel}</span>
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          size="sm"
          aria-label="AI 어시스턴트"
          onClick={toggleAI}
          className="text-accent-strong hover:bg-accent-soft"
        >
          <Sparkles size={15} />
        </IconButton>
        <IconButton size="sm" aria-label="알림" className="relative">
          <Bell size={15} />
          <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-danger" />
        </IconButton>
        <IconButton size="sm" aria-label="도움말">
          <HelpCircle size={15} />
        </IconButton>
        <IconButton
          size="sm"
          aria-label="테마"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </IconButton>
        <div className="ml-1.5">
          <Avatar user={ME} size={28} />
        </div>
      </div>
    </header>
  );
}

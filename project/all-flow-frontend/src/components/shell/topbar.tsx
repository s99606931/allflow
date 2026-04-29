'use client';

import { Avatar, IconButton } from '@/components/ui/primitives';
import { ME } from '@/lib/fixtures';
import { useMe } from '@/lib/hooks/use-data';
import { useRealtime } from '@/lib/realtime';
import { useUIStore } from '@/store/ui-store';
import { Bell, HelpCircle, LogOut, Moon, Sparkles, Sun, UserCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  const theme = useUIStore(s => s.theme);
  const setTheme = useUIStore(s => s.setTheme);
  const toggleAI = useUIStore(s => s.toggleAIPanel);
  const { status: rtStatus } = useRealtime();
  const meQuery = useMe();
  // Live data가 도착하면 그것을 사용, 아니면 ME fixture로 graceful fallback.
  const me = meQuery.data ?? ME;

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
          <UserMenu user={me} />
        </div>
      </div>
    </header>
  );
}

interface UserMenuUser {
  id: string;
  name: string;
  role: string;
  dept: string;
  initials: string;
  color: string;
  email?: string;
}

function UserMenu({ user }: { user: UserMenuUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="사용자 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <Avatar user={user} size={28} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-bg-1 shadow-lg z-30 py-1 text-[13px]"
        >
          <div className="px-3 py-2 border-b border-border">
            <div className="font-medium text-fg truncate">{user.name}</div>
            <div className="text-fg-3 text-[11px] truncate">
              {user.role} · {user.dept}
            </div>
            {user.email && (
              <div className="text-fg-3 text-[11px] truncate" title={user.email}>
                {user.email}
              </div>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-2 text-left"
            onClick={() => setOpen(false)}
          >
            <UserCircle size={14} />
            프로필
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-2 text-left text-danger"
            onClick={() => setOpen(false)}
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

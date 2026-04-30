'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/fixtures';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  AlertCircle,
  Calendar,
  FileText,
  MessageSquare,
  TrendingUp,
  Building2,
  Sparkles,
  Database,
  FileBarChart,
  BarChart3,
  Network,
  Users,
  Shield,
  Bell,
  FileCheck2,
  BadgeCheck,
  CalendarRange,
  Settings,
  ChevronsLeft,
  Plus,
  Search,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, FolderKanban, CheckSquare, AlertCircle, Calendar,
  FileText, MessageSquare, TrendingUp, Building2, Sparkles, Database,
  FileBarChart, BarChart3, Network, Users, Shield, Bell,
  FileCheck2, BadgeCheck, CalendarRange, Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore(s => s.sidebarCollapsed);
  const toggle = useUIStore(s => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'shrink-0 border-r border-border bg-bg-1 flex flex-col h-screen sticky top-0',
        collapsed ? 'w-[64px]' : 'w-[248px]',
      )}
    >
      {/* Workspace switcher */}
      <div className="h-14 px-3 border-b border-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-accent text-accent-fg grid place-items-center font-bold text-[14px] shrink-0">
          오
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-fg truncate">오믈렛 워크스페이스</div>
              <div className="text-[11px] text-fg-3">123명 · Pro</div>
            </div>
            <button
              className="text-fg-3 hover:text-fg-1 -mr-1"
              onClick={toggle}
              aria-label="사이드바 접기"
            >
              <ChevronsLeft size={16} />
            </button>
          </>
        )}
      </div>

      {/* Search + new */}
      {!collapsed && (
        <div className="p-3 space-y-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('allflow:cmdk'))}
            className="w-full h-9 px-2.5 rounded-md bg-bg-2 hover:bg-hover border border-border text-[12.5px] text-fg-3 flex items-center gap-2 transition-colors"
          >
            <Search size={14} />
            <span className="flex-1 text-left">검색...</span>
            <kbd className="text-[10px] mono px-1.5 py-0.5 rounded bg-bg-elev border border-border text-fg-2">⌘K</kbd>
          </button>
          <button className="w-full h-9 px-2.5 rounded-md bg-accent text-accent-fg text-[12.5px] font-medium flex items-center gap-1.5 hover:bg-accent-strong transition-colors">
            <Plus size={14} />
            <span>새로 만들기</span>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll px-2 pb-4">
        {NAV.map((sect) => (
          <div key={sect.sect} className="mb-1">
            {!collapsed && (
              <div className="px-2.5 pt-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-fg-3">
                {sect.sect}
              </div>
            )}
            {sect.items.map((it) => {
              const Icon = ICONS[it.icon] ?? LayoutDashboard;
              const active = pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href));
              return (
                <Link
                  key={it.id}
                  href={it.href}
                  className={cn(
                    'group flex items-center gap-2.5 mx-1 px-2 h-8 rounded-md text-[12.5px] transition-colors',
                    active
                      ? 'bg-accent-soft text-accent-strong font-semibold'
                      : 'text-fg-1 hover:bg-hover hover:text-fg',
                    collapsed && 'justify-center',
                  )}
                  title={collapsed ? it.label : undefined}
                >
                  <Icon size={15} className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.count !== undefined && it.count > 0 && (
                        <span
                          className={cn(
                            'text-[10.5px] mono font-semibold px-1.5 rounded',
                            active ? 'bg-accent text-accent-fg' : 'bg-bg-2 text-fg-2',
                          )}
                        >
                          {it.count}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

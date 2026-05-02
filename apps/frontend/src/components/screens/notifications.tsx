'use client';

import { useMemo, useState, useCallback } from 'react';
import { Card, Badge, Button, IconButton } from '@/components/ui/primitives';
import { useNotifications, useNotificationMutations } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import {
  AlertCircle, AtSign, Bell, Sparkles,
  Filter, Settings2, MessageSquare, X as XIcon,
} from 'lucide-react';

type FilterKey = 'all' | 'mention' | 'sla' | 'ai' | 'comment';

const DEFAULT_PREFS: Record<string, boolean> = {
  mention: true, sla: true, ai: true, comment: true, system: true,
};

const PREF_LABELS: Record<string, string> = {
  mention: '@멘션 알림', sla: 'SLA 경고', ai: 'AI 제안', comment: '코멘트', system: '시스템 공지',
};

const TYPE_ICON: Record<string, typeof AtSign> = {
  mention: AtSign, sla: AlertCircle, ai: Sparkles, system: Bell,
  comment: MessageSquare,
};

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'mention', label: '@멘션' },
  { id: 'sla', label: 'SLA' },
  { id: 'ai', label: 'AI 제안' },
  { id: 'comment', label: '코멘트' },
];

export function NotificationsPage() {
  const { data: notifs = [], isLoading } = useNotifications();
  const { markRead, markAll } = useNotificationMutations();
  const userMap = useUserMap();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const togglePref = useCallback((key: string) => setPrefs(p => ({ ...p, [key]: !p[key] })), []);

  const filtered = useMemo(
    () => notifs.filter(n => filter === 'all' || n.kind === filter),
    [notifs, filter],
  );
  const unread = notifs.filter(n => !n.read);

  return (
    <div className="p-6 max-w-[920px] mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-bold text-fg">알림 센터</h2>
        <Badge tone="danger">{unread.length}건 미확인</Badge>
        <div className="flex-1" />
        <Button variant={filterOpen ? 'primary' : 'secondary'} size="sm" onClick={() => setFilterOpen(v => !v)}><Filter size={13} /> 필터</Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={markAll.isPending || unread.length === 0}
          onClick={() => markAll.mutate({ ids: unread.map(n => n.id) })}
        >
          {markAll.isPending ? '처리 중...' : '모두 읽음'}
        </Button>
        <IconButton size="sm" aria-label="알림 설정" onClick={() => setSettingsOpen(v => !v)}><Settings2 size={14} /></IconButton>
      </div>

      {filterOpen && (
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border w-fit">
          {FILTERS.map(c => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors ${
                filter === c.id ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2 hover:text-fg-1'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {settingsOpen && (
        <div className="rounded-lg border border-border bg-bg-elev p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-fg">알림 유형 설정</span>
            <button type="button" onClick={() => setSettingsOpen(false)} className="text-fg-3 hover:text-fg-1">
              <XIcon size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PREF_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!prefs[key]}
                  onChange={() => togglePref(key)}
                  className="w-4 h-4 rounded accent-accent"
                />
                <span className="text-[12.5px] text-fg-1">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <Card>
        {isLoading && <div className="px-5 py-6 text-[12.5px] text-fg-2">불러오는 중...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="px-5 py-6 text-[12.5px] text-fg-2">알림이 없습니다.</div>
        )}
        {filtered.map(n => {
          const Icon = TYPE_ICON[n.kind] ?? Bell;
          const u = n.actor ? userMap.get(n.actor) : null;
          return (
            <button
              key={n.id}
              type="button"
              disabled={n.read || markRead.isPending}
              onClick={() => !n.read && markRead.mutate(n.id)}
              className={`w-full text-left flex items-start gap-3 px-5 py-3.5 border-b border-border last:border-0 hover:bg-hover transition-colors ${
                !n.read && 'bg-accent-soft/30'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-md grid place-items-center shrink-0 ${
                  n.kind === 'sla'
                    ? 'bg-danger-soft text-danger'
                    : n.kind === 'ai'
                    ? 'bg-warning-soft text-warning'
                    : 'bg-bg-2 text-fg-2'
                }`}
              >
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  {u && <span className="text-[12.5px] font-semibold text-fg">{u.name}</span>}
                  <span className="text-[10.5px] text-fg-3 ml-auto mono">
                    {new Date(n.time).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div className="text-[13px] text-fg-1 mt-0.5 leading-relaxed">{n.title}</div>
                {n.body && (
                  <div className="text-[12px] text-fg-2 mt-1 leading-relaxed">{n.body}</div>
                )}
                {!n.read && (
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-fg-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>새 알림</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </Card>
    </div>
  );
}

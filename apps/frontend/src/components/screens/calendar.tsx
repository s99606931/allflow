'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, Avatar, Button } from '@/components/ui/primitives';
import { ChevronLeft, ChevronRight, Plus, Video, Sparkles } from 'lucide-react';
import { EventCreateDialog } from '@/components/dialogs/event-create-dialog';
import { EventDetailPopover, type EventLike } from '@/components/dialogs/event-detail-popover';
import { CalendarLinkCard } from '@/components/dialogs/calendar-link-card';
import { useEvents } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';

const TYPE_COLOR_DEFAULT = 'oklch(0.62 0.18 255)';
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** Compute Monday-based 5-day window centered on today. */
function computeWeekWindow(): { from: string; to: string; days: { label: string; date: string }[] } {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label: DAY_LABELS[d.getDay()]!, date: String(d.getDate()).padStart(2, '0') };
  });
  const from = monday.toISOString().slice(0, 10);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59);
  return { from, to: friday.toISOString().slice(0, 10), days };
}

export function CalendarPage() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<EventLike | null>(null);

  const [weekWindow, setWeekWindow] = useState<ReturnType<typeof computeWeekWindow> | null>(null);
  useEffect(() => { setWeekWindow(computeWeekWindow()); }, []);
  const window = weekWindow;
  const { data: events = [], isLoading, error } = useEvents({ from: window?.from ?? '', to: window?.to ?? '' });
  const userMap = useUserMap();

  const isoEvents: EventLike[] = events.map(e => ({
    title: e.title,
    start: e.start.slice(0, 16),
    end: e.end.slice(0, 16),
    attendees: e.attendees,
    source: e.source,
  }));

  /** Compute grid placement for an event (gridRow + gridColumn + length). */
  const placed = events.map(e => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    const monday = new Date((window?.from ?? '') + 'T00:00:00');
    const dayIdx = Math.floor((start.getTime() - monday.getTime()) / (24 * 3600 * 1000));
    const hour = start.getHours();
    const len = Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600_000));
    return { ...e, dayIdx, hour, len };
  }).filter(p => p.dayIdx >= 0 && p.dayIdx < 5 && p.hour >= 8 && p.hour <= 18);

  return (
    <div className="p-6 space-y-4 max-w-[1440px] mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm">오늘</Button>
        <div className="flex">
          <Button variant="ghost" size="sm"><ChevronLeft size={14} /></Button>
          <Button variant="ghost" size="sm"><ChevronRight size={14} /></Button>
        </div>
        <h2 className="text-[16px] font-bold text-fg ml-1">{window ? `${window.from} — ${window.to}` : '...'}</h2>
        <div className="flex-1" />
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
          {(['week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors ${view === v ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2'}`}>
              {v === 'week' ? '주' : '월'}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm">캘린더 동기화</Button>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={13} /> 일정 추가
        </Button>
        <EventCreateDialog open={createOpen} onOpenChange={setCreateOpen} existingEvents={isoEvents} />
        {detail && <EventDetailPopover event={detail} onClose={() => setDetail(null)} />}
      </div>

      <CalendarLinkCard />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border">
          <div />
          {(window?.days ?? []).map((d, i) => (
            <div key={`${d.label}-${i}`} className="px-3 py-3 text-center border-l border-border">
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">{d.label}</div>
              <div className="text-[20px] font-bold mt-0.5 mono text-fg">{d.date}</div>
            </div>
          ))}
        </div>
        {isLoading && <div className="px-4 py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>}
        {error && <div className="px-4 py-12 text-center text-[12px] text-danger">일정을 불러오지 못했습니다.</div>}
        {!isLoading && !error && (
          <div className="grid grid-cols-[60px_repeat(5,1fr)] relative" style={{ gridTemplateRows: `repeat(${HOURS.length}, 56px)` }}>
            {HOURS.map(h => (
              <div key={`h-${h}`} className="border-b border-border text-[10.5px] mono text-fg-3 px-2 py-1 text-right" style={{ gridColumn: 1 }}>
                {h}:00
              </div>
            ))}
            {HOURS.map(h => (window?.days ?? []).map((_, di) => (
              <div key={`c-${h}-${di}`} className="border-b border-l border-border" style={{ gridRow: h - 7, gridColumn: di + 2 }} />
            )))}
            {placed.map((ev, i) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setDetail(isoEvents[i] ?? null)}
                aria-label={`${ev.title} ${ev.hour}:00`}
                className="m-1 rounded-md p-2 cursor-pointer text-white shadow-sm hover:shadow-md transition-shadow text-left"
                style={{
                  gridRow: `${ev.hour - 7} / span ${ev.len}`,
                  gridColumn: ev.dayIdx + 2,
                  background: TYPE_COLOR_DEFAULT,
                }}>
                <div className="text-[11px] font-semibold leading-tight">{ev.title}</div>
                <div className="text-[10px] opacity-85 mono mt-0.5">{ev.hour}:00 — {ev.hour + ev.len}:00</div>
                <div className="flex items-center gap-1 mt-1.5">
                  {ev.attendees.slice(0, 3).map(id => {
                    const u = userMap.get(id);
                    return u ? <Avatar key={id} user={u} size={14} className="!ring-white/30" /> : null;
                  })}
                  {ev.attendees.length > 3 && <span className="text-[9px] opacity-80">+{ev.attendees.length - 3}</span>}
                  <Video size={10} className="ml-auto opacity-80" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* AI summary */}
      <Card className="!bg-accent-soft border-accent/20">
        <CardBody className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-accent text-accent-fg grid place-items-center shrink-0"><Sparkles size={14} /></div>
          <div className="flex-1 text-[12.5px] text-fg-1">
            <strong className="text-fg">이번 주 회의 14건</strong> · 딥워크 4시간 확보됨 · 수요일 14시 CEO 보고 준비 시간 2시간 부족합니다. 화요일 오후 1:1을 30분 단축 권장.
          </div>
          <Button variant="primary" size="sm">자동 조정</Button>
        </CardBody>
      </Card>
    </div>
  );
}

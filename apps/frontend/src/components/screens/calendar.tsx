'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardBody, Avatar, Button } from '@/components/ui/primitives';
import { ChevronLeft, ChevronRight, Plus, Video, Sparkles, X } from 'lucide-react';
import { EventCreateDialog } from '@/components/dialogs/event-create-dialog';
import { EventDetailPopover, type EventLike } from '@/components/dialogs/event-detail-popover';
import { CalendarLinkCard } from '@/components/dialogs/calendar-link-card';
import { useEvents } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';
import { api } from '@/lib/api';

const TYPE_COLOR_DEFAULT = 'oklch(0.62 0.18 255)';
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** Compute Monday-based 5-day window centered on a given date. */
function computeWeekWindow(anchor?: Date): { from: string; to: string; days: { label: string; date: string }[] } {
  const now = anchor ?? new Date();
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

/** Build a 6-row × 7-col month grid (Mon first) and return {from, to, weeks}. */
function computeMonthWindow(anchor?: Date) {
  const now = anchor ?? new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // align to Monday
  const startDow = (firstDay.getDay() + 6) % 7; // 0=Mon
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startDow);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + w * 7 + d);
      row.push(day);
    }
    weeks.push(row);
  }
  return {
    label: `${year}년 ${month + 1}월`,
    year, month,
    from: new Date(year, month, 1).toISOString().slice(0, 10),
    to: lastDay.toISOString().slice(0, 10),
    weeks,
  };
}

export function CalendarPage() {
  const router = useRouter();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<EventLike | null>(null);
  const [autoAdjusting, setAutoAdjusting] = useState(false);
  const [autoAdjustResult, setAutoAdjustResult] = useState<string | null>(null);

  const [weekAnchor, setWeekAnchor] = useState<Date | null>(null);
  const [weekWindow, setWeekWindow] = useState<ReturnType<typeof computeWeekWindow> | null>(null);
  const [monthWindow, setMonthWindow] = useState<ReturnType<typeof computeMonthWindow> | null>(null);
  useEffect(() => {
    const now = new Date();
    setWeekAnchor(now);
    setWeekWindow(computeWeekWindow(now));
    setMonthWindow(computeMonthWindow(now));
  }, []);

  function shiftWeek(delta: number) {
    const base = weekAnchor ?? new Date();
    const next = new Date(base);
    if (view === 'month') {
      next.setMonth(base.getMonth() + delta);
    } else {
      next.setDate(base.getDate() + delta * 7);
    }
    setWeekAnchor(next);
    setWeekWindow(computeWeekWindow(next));
    setMonthWindow(computeMonthWindow(next));
  }
  const window = weekWindow;
  const activeFrom = view === 'month' ? (monthWindow?.from ?? '') : (window?.from ?? '');
  const activeTo = view === 'month' ? (monthWindow?.to ?? '') : (window?.to ?? '');
  const { data: events = [], isLoading, error } = useEvents({ from: activeFrom, to: activeTo });
  const userMap = useUserMap();

  const isoEvents: EventLike[] = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start.slice(0, 16),
    end: e.end.slice(0, 16),
    attendees: e.attendees,
    source: e.source,
  }));

  const totalMeetingHours = events.reduce((acc, e) => {
    const len = (new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600_000;
    return acc + Math.max(0, len);
  }, 0);
  const workHoursInWeek = 5 * 8;
  const freeWorkHours = Math.max(0, workHoursInWeek - totalMeetingHours);

  const runAutoAdjust = async () => {
    setAutoAdjusting(true);
    setAutoAdjustResult(null);
    try {
      const summary = events.map(e => `• ${e.title} (${e.start.slice(11, 16)}~${e.end.slice(11, 16)})`).join('\n');
      const result = await api.aiComplete(
        `이번 주 캘린더 일정:\n${summary || '(일정 없음)'}\n총 회의 ${Math.round(totalMeetingHours)}시간, 여유 ${Math.round(freeWorkHours)}시간.\n\n이 일정을 분석하여 집중 시간 확보와 일정 최적화를 위한 구체적인 3가지 조정 제안을 간결하게 알려주세요.`,
      );
      setAutoAdjustResult(result.text);
    } catch {
      toast.error('AI 일정 조정 요청에 실패했습니다.');
    } finally {
      setAutoAdjusting(false);
    }
  };

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
      <AiGuideWidget
        systemContext={`캘린더 — 이번 주 ${events.length}건 일정, 총 ${Math.round(totalMeetingHours)}시간 회의, 집중 가능 ${Math.round(freeWorkHours)}시간`}
        hints={[
          totalMeetingHours > 20 ? `회의 ${Math.round(totalMeetingHours)}시간 — 집중 시간 확보 방법 알려줘` : '이번 주 일정 요약해줘',
          freeWorkHours < 10 ? `집중 가능 ${Math.round(freeWorkHours)}시간 — 일정 최적화 방법` : '일정 충돌 확인해줘',
          '바쁜 시간대 분석해줘',
        ]}
      />
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => { const now = new Date(); setWeekAnchor(now); setWeekWindow(computeWeekWindow(now)); }}>오늘</Button>
        <div className="flex">
          <Button variant="ghost" size="sm" onClick={() => shiftWeek(-1)}><ChevronLeft size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => shiftWeek(1)}><ChevronRight size={14} /></Button>
        </div>
        <h2 className="text-[16px] font-bold text-fg ml-1">
          {view === 'month' ? (monthWindow?.label ?? '...') : (window ? `${window.from} — ${window.to}` : '...')}
        </h2>
        <div className="flex-1" />
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
          {(['week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors ${view === v ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2'}`}>
              {v === 'week' ? '주' : '월'}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.push('/settings/integrations')}>캘린더 동기화</Button>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={13} /> 일정 추가
        </Button>
        <EventCreateDialog open={createOpen} onOpenChange={setCreateOpen} existingEvents={isoEvents} />
        {detail && <EventDetailPopover event={detail} onClose={() => setDetail(null)} />}
      </div>

      <CalendarLinkCard />

      {/* Month view grid */}
      {view === 'month' && monthWindow && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {['월', '화', '수', '목', '금', '토', '일'].map(d => (
              <div key={d} className="px-2 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wider text-fg-3 border-l first:border-l-0 border-border">{d}</div>
            ))}
          </div>
          {isLoading && <div className="py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>}
          {error && <div className="py-12 text-center text-[12px] text-danger">일정을 불러오지 못했습니다.</div>}
          {!isLoading && !error && monthWindow.weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-t border-border">
              {week.map((day, di) => {
                const isCurrentMonth = day.getMonth() === monthWindow.month;
                const isToday = day.toDateString() === new Date().toDateString();
                const dayStr = day.toISOString().slice(0, 10);
                const dayEvents = events.filter(e => e.start.slice(0, 10) === dayStr);
                return (
                  <div key={di} className={`min-h-[80px] p-1.5 border-l first:border-l-0 border-border ${isCurrentMonth ? '' : 'bg-bg-1'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11.5px] font-semibold mb-1 ${isToday ? 'bg-accent text-white' : isCurrentMonth ? 'text-fg' : 'text-fg-4'}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(ev => (
                        <button key={ev.id} type="button"
                          onClick={() => setDetail({ id: ev.id, title: ev.title, start: ev.start.slice(0, 16), end: ev.end.slice(0, 16), attendees: ev.attendees, source: ev.source })}
                          className="w-full text-left text-[10px] truncate px-1 py-0.5 rounded text-white leading-tight"
                          style={{ background: TYPE_COLOR_DEFAULT }}>
                          {ev.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 && <div className="text-[9.5px] text-fg-3 px-1">+{dayEvents.length - 3}건</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      )}

      {/* Week view grid */}
      {view === 'week' && <Card className="overflow-hidden">
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
            {placed.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setDetail({ id: ev.id, title: ev.title, start: ev.start.slice(0, 16), end: ev.end.slice(0, 16), attendees: ev.attendees, source: ev.source })}
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
      </Card>}

      {/* AI summary — computed from real events */}
      <Card className="!bg-accent-soft border-accent/20">
        <CardBody className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-accent text-accent-fg grid place-items-center shrink-0"><Sparkles size={14} /></div>
          <div className="flex-1 text-[12.5px] text-fg-1">
            {events.length === 0 ? (
              <span className="text-fg-2">이번 주 일정이 없습니다. 새 일정을 추가해 보세요.</span>
            ) : (
              <>
                <strong className="text-fg">이번 주 일정 {events.length}건</strong>
                {' · '}회의 {Math.round(totalMeetingHours)}시간
                {' · '}집중 가능 시간 <strong className="text-fg">{Math.round(freeWorkHours)}시간</strong>
                {freeWorkHours < 10 && <span className="text-warning-strong"> · 여유 시간이 부족합니다</span>}
              </>
            )}
          </div>
          <Button variant="primary" size="sm" disabled={autoAdjusting} onClick={runAutoAdjust}>
            {autoAdjusting ? 'AI 분석 중…' : '자동 조정'}
          </Button>
        </CardBody>
      </Card>
      {autoAdjustResult && (
        <Card className="border-accent/30 bg-accent-soft/20">
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-accent-strong">
                <Sparkles size={13} /> AI 일정 최적화 제안
              </div>
              <button type="button" onClick={() => setAutoAdjustResult(null)} className="text-fg-3 hover:text-fg"><X size={13} /></button>
            </div>
            <p className="text-[12.5px] text-fg-1 leading-relaxed whitespace-pre-line">{autoAdjustResult}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

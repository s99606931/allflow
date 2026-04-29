'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button } from '@/components/ui/primitives';
import { TEAM, userById } from '@/lib/fixtures';
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, Sparkles } from 'lucide-react';
import { EventCreateDialog } from '@/components/dialogs/event-create-dialog';
import { EventDetailPopover, type EventLike } from '@/components/dialogs/event-detail-popover';
import { CalendarLinkCard } from '@/components/dialogs/calendar-link-card';

const EVENTS: { day: number; hour: number; len: number; title: string; type: 'meeting' | 'focus' | 'review' | 'oncall'; attendees: string[] }[] = [
  { day: 1, hour: 10, len: 1, title: '주간 동기화', type: 'meeting', attendees: ['me', 'u1', 'u2', 'u4'] },
  { day: 1, hour: 14, len: 2, title: '디자인 리뷰', type: 'review', attendees: ['me', 'u1'] },
  { day: 2, hour: 11, len: 1, title: '1:1 박서연', type: 'meeting', attendees: ['me', 'u1'] },
  { day: 2, hour: 15, len: 2, title: '딥워크 - PRD 작성', type: 'focus', attendees: ['me'] },
  { day: 3, hour: 9, len: 1, title: '스탠드업', type: 'meeting', attendees: ['me', 'u1', 'u2', 'u3', 'u4'] },
  { day: 3, hour: 14, len: 1, title: 'CEO 보고', type: 'review', attendees: ['me', 'u6'] },
  { day: 4, hour: 10, len: 3, title: '온보딩 워크숍', type: 'meeting', attendees: ['me', 'u1', 'u2', 'u4', 'u5'] },
  { day: 5, hour: 13, len: 1, title: 'Q2 회고', type: 'review', attendees: TEAM.map(u => u.id) },
];

const TYPE_COLOR: Record<string, string> = {
  meeting: 'oklch(0.62 0.18 255)',
  focus: 'oklch(0.65 0.16 155)',
  review: 'oklch(0.7 0.15 70)',
  oncall: 'oklch(0.62 0.2 25)',
};

export function CalendarPage() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<EventLike | null>(null);

  // Map fixture events into ISO-shaped objects so the dialog conflict check
  // can compare them with the new event the user is creating.
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  const isoEvents: EventLike[] = EVENTS.map(ev => {
    const dayOffset = ev.day - 1; // demo "월=1"
    const start = new Date(baseDate);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(ev.hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + ev.len);
    return {
      title: ev.title,
      start: start.toISOString().slice(0, 16),
      end: end.toISOString().slice(0, 16),
      attendees: ev.attendees,
      source: 'internal' as const,
    };
  });
  const days = ['월', '화', '수', '목', '금'];
  const dates = ['28', '29', '30', '01', '02'];
  const hours = Array.from({ length: 11 }, (_, i) => 8 + i); // 8 ~ 18

  return (
    <div className="p-6 space-y-4 max-w-[1440px] mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm">오늘</Button>
        <div className="flex">
          <Button variant="ghost" size="sm"><ChevronLeft size={14} /></Button>
          <Button variant="ghost" size="sm"><ChevronRight size={14} /></Button>
        </div>
        <h2 className="text-[16px] font-bold text-fg ml-1">2026년 4월 28일 — 5월 2일</h2>
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
          {days.map((d, i) => (
            <div key={d} className="px-3 py-3 text-center border-l border-border">
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">{d}</div>
              <div className={`text-[20px] font-bold mt-0.5 mono ${i === 0 ? 'text-accent-strong' : 'text-fg'}`}>{dates[i]}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[60px_repeat(5,1fr)] relative" style={{ gridTemplateRows: `repeat(${hours.length}, 56px)` }}>
          {/* Hour column */}
          {hours.map(h => (
            <div key={`h-${h}`} className="border-b border-border text-[10.5px] mono text-fg-3 px-2 py-1 text-right" style={{ gridColumn: 1 }}>
              {h}:00
            </div>
          ))}
          {/* Day cells (background grid) */}
          {hours.map(h => days.map((_, di) => (
            <div key={`c-${h}-${di}`} className="border-b border-l border-border" style={{ gridRow: h - 7, gridColumn: di + 2 }} />
          )))}
          {/* Events */}
          {EVENTS.map((ev, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setDetail(isoEvents[i])}
              aria-label={`${ev.title} ${ev.hour}:00`}
              className="m-1 rounded-md p-2 cursor-pointer text-white shadow-sm hover:shadow-md transition-shadow text-left"
              style={{
                gridRow: `${ev.hour - 7} / span ${ev.len}`,
                gridColumn: ev.day + 1,
                background: TYPE_COLOR[ev.type],
              }}>
              <div className="text-[11px] font-semibold leading-tight">{ev.title}</div>
              <div className="text-[10px] opacity-85 mono mt-0.5">{ev.hour}:00 — {ev.hour + ev.len}:00</div>
              <div className="flex items-center gap-1 mt-1.5">
                {ev.attendees.slice(0, 3).map(id => {
                  const u = userById(id);
                  return u ? <Avatar key={id} user={u} size={14} className="!ring-white/30" /> : null;
                })}
                {ev.attendees.length > 3 && <span className="text-[9px] opacity-80">+{ev.attendees.length - 3}</span>}
                {ev.type === 'meeting' && <Video size={10} className="ml-auto opacity-80" />}
              </div>
            </button>
          ))}
        </div>
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

'use client';

import { Card, CardBody, Button, IconButton } from '@/components/ui/primitives';
import {
  Users, Monitor, MapPin, Mic, Plus, ChevronLeft, ChevronRight, Search, Sparkles, Car, Box,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ResourceBookDialog } from '@/components/dialogs/resource-book-dialog';
import { useResources, useBookings, useMe } from '@/lib/hooks/use-data';
import type { Resource } from '@/lib/schemas';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

type ResourceKind = Resource['kind'];

const TYPE_META: Record<string, { icon: typeof Users; label: string }> = {
  room:      { icon: Users,   label: '회의실' },
  equipment: { icon: Box,     label: '장비' },
  phone:     { icon: Mic,     label: '폰부스' },
  event:     { icon: Monitor, label: '이벤트' },
  parking:   { icon: Car,     label: '주차' },
};

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

const COLOR_BY_KIND: Record<ResourceKind, string> = {
  room:      'oklch(0.62 0.16 250)',
  equipment: 'oklch(0.65 0.18 30)',
};

export function ResourcesPage() {
  const { data: resources = [], isLoading, error } = useResources();
  const [kind, setKind] = useState<'all' | ResourceKind>('all');
  const [resourceSearch, setResourceSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d.toISOString().slice(0, 10);
  }, [weekOffset]);
  const { data: existingBookings = [] } = useBookings(today);
  const { data: me } = useMe();
  const myBookingsToday = existingBookings.filter(b => b.bookedBy === me?.id).length;
  const bookedResourceIds = new Set(existingBookings.map(b => b.resourceId));
  const utilizationRate = resources.length > 0
    ? Math.round((bookedResourceIds.size / resources.length) * 100)
    : 0;

  const filtered = useMemo(
    () => resources.filter(r =>
      (kind === 'all' || r.kind === kind) &&
      (!resourceSearch.trim() || r.name.toLowerCase().includes(resourceSearch.toLowerCase()) || r.location?.toLowerCase().includes(resourceSearch.toLowerCase())),
    ),
    [resources, kind, resourceSearch],
  );

  const displayDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  }, [weekOffset]);

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-5">
      <AiGuideWidget
        systemContext={`회의실·리소스 예약 — 총 ${resources.length}개 자원, 사용률 ${utilizationRate}%, 내 예약 ${myBookingsToday}건`}
        hints={[
          utilizationRate > 80 ? `사용률 ${utilizationRate}% — 자원 부족 해결 방법` : '예약 충돌 확인해줘',
          myBookingsToday > 0 ? `내 예약 ${myBookingsToday}건 일정 최적화` : '빈 자원 찾아줘',
          '이번 주 예약 현황 요약해줘',
        ]}
      />
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-bold text-fg">회의실 / 리소스 예약</h2>
        <span className="text-[12px] text-fg-3" suppressHydrationWarning>{displayDate}</span>
        <div className="flex-1" />
        <IconButton size="sm" onClick={() => setWeekOffset(n => n - 1)}><ChevronLeft size={14} /></IconButton>
        <Button size="sm" variant="secondary" onClick={() => setWeekOffset(0)}>오늘</Button>
        <IconButton size="sm" onClick={() => setWeekOffset(n => n + 1)}><ChevronRight size={14} /></IconButton>
        <Button size="sm" variant="primary" onClick={() => setBookOpen(true)} disabled={resources.length === 0}>
          <Plus size={13} /> 예약
        </Button>
        <ResourceBookDialog
          open={bookOpen}
          onOpenChange={setBookOpen}
          resources={resources.map(r => ({ id: r.id, name: r.name }))}
          existingBookings={existingBookings}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
          {(['all', 'room', 'equipment'] as const).map(t => (
            <button
              key={t}
              onClick={() => setKind(t)}
              className={`px-2.5 h-7 rounded text-[11.5px] font-medium ${kind === t ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2'}`}
            >
              {t === 'all' ? '전체 종류' : TYPE_META[t].label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {searchOpen ? (
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-3 pointer-events-none" />
            <input
              autoFocus
              value={resourceSearch}
              onChange={e => setResourceSearch(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && (setSearchOpen(false), setResourceSearch(''))}
              placeholder="이름·위치 검색..."
              className="h-7 w-44 pl-6 pr-2 rounded-md bg-bg-2 border border-border text-[11.5px] focus:outline-none focus:border-accent"
            />
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="h-7 px-2.5 rounded-md bg-bg-2 hover:bg-hover border border-border text-[11.5px] text-fg-2 flex items-center gap-1.5">
            <Search size={12} /><span>인원 / 장비 조건...</span>
          </button>
        )}
      </div>

      <Card className="bg-accent-soft/30 border-accent/30">
        <CardBody className="p-3.5">
          <div className="flex items-center gap-2.5">
            <Sparkles size={14} className="text-accent shrink-0" />
            <span className="text-[12.5px] text-fg-1">
              <span className="font-semibold text-accent-strong">AI 추천</span> · 조건에 맞는 리소스를 자동으로 찾아드립니다.
            </span>
          </div>
        </CardBody>
      </Card>

      {isLoading && <div className="py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>}
      {error && <div className="py-12 text-center text-[12px] text-danger">리소스를 불러오지 못했습니다.</div>}
      {!isLoading && !error && resources.length === 0 && (
        <div className="py-12 text-center space-y-2">
          <div className="text-[13px] font-semibold text-fg">리소스가 없습니다</div>
          <div className="text-[12px] text-fg-3">회의실·장비·차량 등 공유 자원을 추가하고 예약을 관리하세요.</div>
        </div>
      )}

      {filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
              <div className="flex border-b border-border bg-bg-1 sticky top-0 z-10">
                <div className="w-[220px] shrink-0 px-4 py-2.5 text-[11px] font-semibold text-fg-3 uppercase tracking-wider border-r border-border">
                  리소스
                </div>
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
                  {HOURS.map(h => (
                    <div key={h} className="px-1.5 py-2.5 text-[11px] font-semibold text-fg-3 mono text-center border-l border-border">
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>

              {filtered.map(r => {
                const meta = TYPE_META[r.kind] ?? TYPE_META.room!;
                const TypeIcon = meta.icon;
                return (
                  <div key={r.id} className="flex border-b border-border last:border-0 hover:bg-hover/40 transition-colors">
                    <div className="w-[220px] shrink-0 px-4 py-3 border-r border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded grid place-items-center text-white shrink-0" style={{ background: COLOR_BY_KIND[r.kind] }}>
                          <TypeIcon size={11} />
                        </div>
                        <span className="text-[12.5px] font-semibold text-fg truncate">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10.5px] text-fg-3">
                        {r.location && <><span className="flex items-center gap-0.5"><MapPin size={9} />{r.location}</span><span>·</span></>}
                        {r.capacity != null && <span className="flex items-center gap-0.5"><Users size={9} />{r.capacity}명</span>}
                      </div>
                    </div>

                    <div className="flex-1 relative grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
                      {HOURS.map(h => (
                        <div key={h} className="border-l border-border h-[64px] hover:bg-accent-soft/30 cursor-pointer" />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        {[
          { k: '등록 리소스', v: String(resources.length), sub: `회의실 ${resources.filter(r => r.kind === 'room').length} · 장비 ${resources.filter(r => r.kind === 'equipment').length}` },
          { k: '사용률 (오늘)', v: `${utilizationRate}%`, sub: `${bookedResourceIds.size}/${resources.length} 리소스` },
          { k: '내 예약', v: String(myBookingsToday), sub: '오늘 기준' },
          { k: '총 예약', v: String(existingBookings.length), sub: '오늘 기준' },
        ].map(s => (
          <Card key={s.k}>
            <CardBody>
              <div className="text-[11.5px] text-fg-3">{s.k}</div>
              <div className="text-[26px] font-bold text-fg mono mt-1">{s.v}</div>
              <div className="text-[10.5px] text-fg-3 mt-1">{s.sub}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

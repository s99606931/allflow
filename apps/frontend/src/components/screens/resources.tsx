'use client';

import { Card, CardBody, Button, IconButton } from '@/components/ui/primitives';
import {
  Users, Monitor, MapPin, Mic, Plus, ChevronLeft, ChevronRight, Search, Sparkles, Car, Box,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ResourceBookDialog } from '@/components/dialogs/resource-book-dialog';
import { useResources } from '@/lib/hooks/use-data';
import type { Resource } from '@/lib/schemas';

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
  const [bookOpen, setBookOpen] = useState(false);

  const filtered = useMemo(
    () => resources.filter(r => kind === 'all' || r.kind === kind),
    [resources, kind],
  );

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-bold text-fg">회의실 / 리소스 예약</h2>
        <span className="text-[12px] text-fg-3" suppressHydrationWarning>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
        <div className="flex-1" />
        <IconButton size="sm"><ChevronLeft size={14} /></IconButton>
        <Button size="sm" variant="secondary">오늘</Button>
        <IconButton size="sm"><ChevronRight size={14} /></IconButton>
        <Button size="sm" variant="primary" onClick={() => setBookOpen(true)} disabled={resources.length === 0}>
          <Plus size={13} /> 예약
        </Button>
        <ResourceBookDialog
          open={bookOpen}
          onOpenChange={setBookOpen}
          resources={resources.map(r => ({ id: r.id, name: r.name }))}
          existingBookings={[]}
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
        <button className="h-7 px-2.5 rounded-md bg-bg-2 hover:bg-hover border border-border text-[11.5px] text-fg-2 flex items-center gap-1.5">
          <Search size={12} /><span>인원 / 장비 조건...</span>
        </button>
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
        <div className="py-12 text-center text-[12px] text-fg-3">등록된 리소스가 없습니다.</div>
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
          { k: '평균 사용률', v: '—', sub: '데이터 수집 중' },
          { k: '내 예약', v: '—', sub: '연동 예정' },
          { k: 'No-show', v: '—', sub: '연동 예정' },
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

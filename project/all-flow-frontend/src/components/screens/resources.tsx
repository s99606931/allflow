'use client';

import { Card, CardHeader, CardTitle, CardBody, Avatar, AvatarStack, Badge, Button, IconButton } from '@/components/ui/primitives';
import { TEAM, ME, userById } from '@/lib/fixtures';
import {
  CalendarClock, Users, Monitor, Wifi, Coffee, MapPin, Mic, Camera,
  Plus, ChevronLeft, ChevronRight, Search, Sparkles, Car, Box,
} from 'lucide-react';
import { useState } from 'react';

interface Resource {
  id: string;
  name: string;
  type: 'meeting' | 'phone' | 'event' | 'parking' | 'equipment';
  capacity: number;
  floor: string;
  features: string[];
  color: string;
}

const RESOURCES: Resource[] = [
  { id: 'r1',  name: '대회의실 (오로라)',    type: 'meeting', capacity: 16, floor: '12F', features: ['프로젝터','화상회의','화이트보드'], color: 'oklch(0.62 0.16 250)' },
  { id: 'r2',  name: '중회의실 (노을)',      type: 'meeting', capacity: 8,  floor: '12F', features: ['TV','화상회의'],                 color: 'oklch(0.66 0.18 30)' },
  { id: 'r3',  name: '중회의실 (바람)',      type: 'meeting', capacity: 8,  floor: '11F', features: ['TV','화상회의','화이트보드'],   color: 'oklch(0.65 0.16 165)' },
  { id: 'r4',  name: '소회의실 (별)',        type: 'meeting', capacity: 4,  floor: '12F', features: ['TV'],                            color: 'oklch(0.7 0.15 60)' },
  { id: 'r5',  name: '소회의실 (달)',        type: 'meeting', capacity: 4,  floor: '11F', features: ['TV'],                            color: 'oklch(0.62 0.18 280)' },
  { id: 'r6',  name: '폰부스 #1',            type: 'phone',   capacity: 1,  floor: '12F', features: ['방음'],                          color: 'oklch(0.55 0.05 240)' },
  { id: 'r7',  name: '폰부스 #2',            type: 'phone',   capacity: 1,  floor: '11F', features: ['방음'],                          color: 'oklch(0.55 0.05 240)' },
  { id: 'r8',  name: '이벤트 라운지',        type: 'event',   capacity: 50, floor: '13F', features: ['음향','조명','케이터링'],         color: 'oklch(0.65 0.18 350)' },
];

interface Booking {
  resource: string;
  start: number; end: number;
  title: string;
  organizer: string;
  attendees: string[];
}

const BOOKINGS: Booking[] = [
  { resource: 'r1', start: 9,  end: 10, title: '주간 동기화',    organizer: 'me', attendees: ['me','u1','u2','u3','u4'] },
  { resource: 'r1', start: 14, end: 15.5, title: 'CJ ENM 미팅',  organizer: 'u5', attendees: ['u5','u6','me'] },
  { resource: 'r2', start: 10, end: 11, title: '디자인 리뷰',     organizer: 'u1', attendees: ['u1','me','u2'] },
  { resource: 'r2', start: 15, end: 16.5, title: '백엔드 아키텍처', organizer: 'u3', attendees: ['u3','u2','u6'] },
  { resource: 'r3', start: 11, end: 12, title: '제품 데모 리허설', organizer: 'u5', attendees: ['u5','me','u1'] },
  { resource: 'r4', start: 13, end: 14, title: '1:1 (지우 ↔ 재석)', organizer: 'me', attendees: ['me','u6'] },
  { resource: 'r5', start: 9,  end: 10, title: '인터뷰 — 백엔드',  organizer: 'u3', attendees: ['u3','u6'] },
  { resource: 'r5', start: 16, end: 17, title: '면접',           organizer: 'u3', attendees: ['u3','u2'] },
  { resource: 'r6', start: 11, end: 11.5, title: '고객 콜',       organizer: 'u5', attendees: ['u5'] },
  { resource: 'r7', start: 14, end: 14.5, title: '리쿠르팅 콜',   organizer: 'u6', attendees: ['u6'] },
];

const TYPE_META = {
  meeting:  { icon: Users,   label: '회의실' },
  phone:    { icon: Mic,     label: '폰부스' },
  event:    { icon: Monitor, label: '이벤트' },
  parking:  { icon: Car,     label: '주차' },
  equipment:{ icon: Box,     label: '장비' },
} as const;

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8 ~ 18

export function ResourcesPage() {
  const [floor, setFloor] = useState<'all' | '11F' | '12F' | '13F'>('all');
  const [type, setType] = useState<'all' | Resource['type']>('all');

  const filtered = RESOURCES.filter(r =>
    (floor === 'all' || r.floor === floor) &&
    (type === 'all' || r.type === type),
  );

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-bold text-fg">회의실 / 리소스 예약</h2>
        <span className="text-[12px] text-fg-3">2026년 4월 28일 · 월요일</span>
        <div className="flex-1" />
        <IconButton size="sm"><ChevronLeft size={14} /></IconButton>
        <Button size="sm" variant="secondary">오늘</Button>
        <IconButton size="sm"><ChevronRight size={14} /></IconButton>
        <Button size="sm" variant="primary"><Plus size={13} /> 예약</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
          {(['all','12F','11F','13F'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFloor(f)}
              className={`px-2.5 h-7 rounded text-[11.5px] font-medium ${floor === f ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2'}`}
            >
              {f === 'all' ? '전체 층' : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
          {(['all','meeting','phone','event'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-2.5 h-7 rounded text-[11.5px] font-medium ${type === t ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2'}`}
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

      {/* AI quick */}
      <Card className="bg-accent-soft/30 border-accent/30">
        <CardBody className="p-3.5">
          <div className="flex items-center gap-2.5">
            <Sparkles size={14} className="text-accent shrink-0" />
            <span className="text-[12.5px] text-fg-1">
              <span className="font-semibold text-accent-strong">AI 추천</span> · &ldquo;오후 2시, 8명, 화상회의 가능&rdquo; → <strong>중회의실 (노을) 14:00–15:00</strong> 예약 가능합니다.
            </span>
            <div className="flex-1" />
            <Button size="sm" variant="primary">바로 예약</Button>
          </div>
        </CardBody>
      </Card>

      {/* Timeline */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">
            {/* Header */}
            <div className="flex border-b border-border bg-bg-1 sticky top-0 z-10">
              <div className="w-[220px] shrink-0 px-4 py-2.5 text-[11px] font-semibold text-fg-3 uppercase tracking-wider border-r border-border">
                리소스
              </div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
                {HOURS.map(h => (
                  <div key={h} className="px-1.5 py-2.5 text-[11px] font-semibold text-fg-3 mono text-center border-l border-border">
                    {String(h).padStart(2,'0')}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {filtered.map(r => {
              const TypeIcon = TYPE_META[r.type].icon;
              const myBookings = BOOKINGS.filter(b => b.resource === r.id);

              return (
                <div key={r.id} className="flex border-b border-border last:border-0 hover:bg-hover/40 transition-colors">
                  <div className="w-[220px] shrink-0 px-4 py-3 border-r border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded grid place-items-center text-white shrink-0" style={{ background: r.color }}>
                        <TypeIcon size={11} />
                      </div>
                      <span className="text-[12.5px] font-semibold text-fg truncate">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-fg-3">
                      <span className="flex items-center gap-0.5"><MapPin size={9} />{r.floor}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Users size={9} />{r.capacity}명</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {r.features.slice(0, 2).map(f => (
                        <span key={f} className="text-[9px] px-1 py-0.5 rounded bg-bg-2 text-fg-3">{f}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 relative grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
                    {HOURS.map(h => (
                      <div key={h} className="border-l border-border h-[64px] hover:bg-accent-soft/30 cursor-pointer" />
                    ))}
                    {/* Bookings absolute */}
                    {myBookings.map((b, i) => {
                      const left = ((b.start - 8) / HOURS.length) * 100;
                      const width = ((b.end - b.start) / HOURS.length) * 100;
                      const isMine = b.attendees.includes('me');
                      return (
                        <div
                          key={i}
                          className={`absolute top-1.5 h-[52px] rounded-md px-2 py-1 cursor-pointer overflow-hidden text-[11px] transition-shadow hover:shadow-md ${
                            isMine ? 'ring-1 ring-accent' : ''
                          }`}
                          style={{
                            left: `calc(${left}% + 1px)`,
                            width: `calc(${width}% - 2px)`,
                            background: isMine ? r.color : `${r.color}22`,
                            color: isMine ? 'white' : 'inherit',
                            borderLeft: !isMine ? `3px solid ${r.color}` : undefined,
                          }}
                        >
                          <div className="font-semibold truncate">{b.title}</div>
                          <div className={`text-[9.5px] mono mt-0.5 ${isMine ? 'opacity-90' : 'text-fg-3'}`}>
                            {String(Math.floor(b.start)).padStart(2,'0')}:{b.start % 1 ? '30' : '00'}–{String(Math.floor(b.end)).padStart(2,'0')}:{b.end % 1 ? '30' : '00'}
                          </div>
                        </div>
                      );
                    })}

                    {/* Now line */}
                    <div className="absolute top-0 bottom-0 w-px bg-danger pointer-events-none z-20" style={{ left: `${((11.7 - 8) / HOURS.length) * 100}%` }}>
                      <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-danger" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { k: '오늘 예약', v: '32', sub: '회의 24 · 폰부스 8' },
          { k: '평균 사용률', v: '67%', sub: '전주 대비 +5%p' },
          { k: '내 예약', v: '4건', sub: '오전 2 · 오후 2' },
          { k: 'No-show', v: '1건', sub: '4월 누적 4건' },
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

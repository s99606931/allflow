'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button, Avatar, AvatarStack } from '@/components/ui/primitives';
import { TEAM, ME, userById } from '@/lib/fixtures';
import {
  CalendarRange, MapPin, Users, Clock, Plus, ChevronLeft, ChevronRight,
  Wifi, Monitor, Coffee, Tv, Mic, Sparkles, Filter, Search, Building2,
  Car, Laptop, Camera, X, CheckCircle2, AlertCircle,
} from 'lucide-react';

interface Room {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  amenities: string[];
  color: string;
}

interface Booking {
  roomId: string;
  start: number; // hour 0-23
  duration: number;
  title: string;
  by: string;
  attendees: string[];
  status?: 'confirmed' | 'pending';
}

const ROOMS: Room[] = [
  { id: 'r1', name: '소회의실 A',     floor: '5F', capacity: 4,  amenities: ['Monitor','Wifi'],                    color: '#5B6CFF' },
  { id: 'r2', name: '소회의실 B',     floor: '5F', capacity: 4,  amenities: ['Monitor','Wifi'],                    color: '#34B27D' },
  { id: 'r3', name: '대회의실 — 누리', floor: '7F', capacity: 16, amenities: ['Tv','Mic','Wifi','Camera'],          color: '#FF7A6B' },
  { id: 'r4', name: '워크숍룸 — 별',  floor: '7F', capacity: 12, amenities: ['Tv','Mic','Wifi','Coffee'],          color: '#A66CFF' },
  { id: 'r5', name: '미팅 부스 1',    floor: '5F', capacity: 2,  amenities: ['Wifi'],                              color: '#F2A93B' },
  { id: 'r6', name: '미팅 부스 2',    floor: '5F', capacity: 2,  amenities: ['Wifi'],                              color: '#2A86E0' },
  { id: 'r7', name: '임원 회의실',    floor: '7F', capacity: 8,  amenities: ['Tv','Mic','Wifi','Camera','Coffee'], color: '#E94B8A' },
];

const BOOKINGS: Booking[] = [
  { roomId: 'r1', start: 9,  duration: 1, title: '데일리 스탠드업',         by: 'me', attendees: ['me','u1','u2','u4'] },
  { roomId: 'r1', start: 14, duration: 2, title: '온보딩 디자인 리뷰',      by: 'u1', attendees: ['u1','me','u2'] },
  { roomId: 'r2', start: 10, duration: 1, title: '백엔드 1:1',             by: 'u3', attendees: ['u3','u6'] },
  { roomId: 'r2', start: 13, duration: 1, title: '결제 webhook 디버깅',    by: 'u3', attendees: ['u3','u4'] },
  { roomId: 'r3', start: 10, duration: 2, title: '주간 전체 회의',         by: 'u6', attendees: ['me','u1','u2','u3','u4','u5','u6'] },
  { roomId: 'r3', start: 15, duration: 3, title: 'Q2 OKR 워크숍',         by: 'me', attendees: ['me','u1','u2','u5','u6'] },
  { roomId: 'r4', start: 13, duration: 4, title: '디자인 시스템 정의 워크숍', by: 'u1', attendees: ['u1','u2','u4'] },
  { roomId: 'r5', start: 11, duration: 1, title: '클라이언트 콜 — CJ',     by: 'u5', attendees: ['u5'], status: 'pending' },
  { roomId: 'r5', start: 16, duration: 1, title: '면접 — FE 시니어',       by: 'u2', attendees: ['u2','me'] },
  { roomId: 'r7', start: 9,  duration: 2, title: '경영진 정기 회의',       by: 'u6', attendees: ['u6'] },
  { roomId: 'r7', start: 14, duration: 1, title: '투자자 미팅',           by: 'u6', attendees: ['u6'] },
];

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8 ~ 18

const AMENITY_ICON: Record<string, typeof Monitor> = {
  Monitor, Wifi, Tv, Mic, Camera, Coffee,
};

const RES_TABS = [
  { id: 'rooms',     label: '회의실',      icon: CalendarRange },
  { id: 'equipment', label: '장비 대여',   icon: Laptop },
  { id: 'parking',   label: '주차',        icon: Car },
] as const;

export default function ResourcesPage() {
  const [tab, setTab] = useState<typeof RES_TABS[number]['id']>('rooms');
  const [floor, setFloor] = useState<'ALL' | '5F' | '7F'>('ALL');
  const [showBook, setShowBook] = useState(false);

  return (
    <AppShell
      title="회의실 · 리소스"
      subtitle="실시간 회의실 / 장비 / 주차 예약"
      actions={
        <Button size="sm" variant="primary" onClick={() => setShowBook(true)}>
          <Plus size={13} /> 예약
        </Button>
      }
    >
      <div className="p-6 space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border -mt-2">
          {RES_TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 h-9 -mb-px border-b-2 text-[12.5px] transition-colors ${tab === t.id ? 'border-accent text-fg font-semibold' : 'border-transparent text-fg-2 hover:text-fg-1'}`}
              >
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'rooms' && <RoomsTab floor={floor} setFloor={setFloor} />}
        {tab === 'equipment' && <EquipmentTab />}
        {tab === 'parking' && <ParkingTab />}
      </div>

      {showBook && <BookingModal onClose={() => setShowBook(false)} />}
    </AppShell>
  );
}

/* Rooms tab — schedule grid ----------------------------------------- */
function RoomsTab({ floor, setFloor }: { floor: 'ALL' | '5F' | '7F'; setFloor: (f: 'ALL' | '5F' | '7F') => void }) {
  const rooms = floor === 'ALL' ? ROOMS : ROOMS.filter(r => r.floor === floor);
  const totalCap = rooms.reduce((s, r) => s + r.capacity, 0);
  const inUse = BOOKINGS.filter(b => {
    const now = 11; // pretend it's 11AM
    return b.start <= now && b.start + b.duration > now;
  });

  return (
    <>
      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        <KPI icon={Building2}    label="전체 회의실"     value={`${ROOMS.length}개`}     hint={`5F · 7F · ${totalCap}석`} />
        <KPI icon={CheckCircle2} label="현재 사용 중"    value={`${inUse.length}개`}     hint={`${ROOMS.length - inUse.length}개 사용 가능`} tone="success" />
        <KPI icon={Clock}        label="오늘 예약"       value={`${BOOKINGS.length}건`}  hint="평균 1.4시간" tone="info" />
        <KPI icon={Sparkles}     label="AI 점유율 예측"  value="78%"                     hint="이번 주 · 임원 회의실 부족 예상" tone="warning" />
      </div>

      {/* Date + filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <button className="text-fg-3 hover:text-fg-1"><ChevronLeft size={14} /></button>
            <CardTitle className="!text-[15px]">2026년 4월 28일 (월)</CardTitle>
            <button className="text-fg-3 hover:text-fg-1"><ChevronRight size={14} /></button>
            <Badge tone="accent" className="ml-1">오늘</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {(['ALL', '5F', '7F'] as const).map(f => (
              <button key={f} onClick={() => setFloor(f)}
                className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium border transition-colors ${floor === f ? 'bg-accent text-accent-fg border-accent' : 'bg-bg-elev border-border text-fg-1 hover:bg-hover'}`}
              >{f === 'ALL' ? '전체 층' : f}</button>
            ))}
          </div>
        </CardHeader>

        {/* Schedule grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Hour header */}
            <div className="grid border-b border-border bg-bg-1" style={{ gridTemplateColumns: `200px repeat(${HOURS.length}, 1fr)` }}>
              <div className="px-3 py-2 text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">회의실</div>
              {HOURS.map(h => (
                <div key={h} className="px-1 py-2 text-[10.5px] mono text-fg-3 text-center border-l border-border">{h}:00</div>
              ))}
            </div>

            {/* Rows */}
            {rooms.map(r => (
              <div key={r.id} className="grid border-b border-border last:border-b-0 hover:bg-bg-1/50" style={{ gridTemplateColumns: `200px repeat(${HOURS.length}, 1fr)` }}>
                {/* Room cell */}
                <div className="px-3 py-2.5 flex items-center gap-2">
                  <div className="w-1 h-8 rounded-full" style={{ background: r.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-fg truncate">{r.name}</div>
                    <div className="flex items-center gap-1 text-[10.5px] text-fg-3 mt-0.5">
                      <span>{r.floor}</span>
                      <span>·</span>
                      <Users size={10} /><span>{r.capacity}</span>
                      <div className="flex items-center gap-0.5 ml-1">
                        {r.amenities.slice(0, 4).map(a => {
                          const Ic = AMENITY_ICON[a];
                          return Ic ? <Ic key={a} size={9} className="text-fg-3" /> : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hour cells with bookings */}
                <div className="col-span-full relative" style={{ gridColumn: `2 / span ${HOURS.length}` }}>
                  <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
                    {HOURS.map(h => (
                      <button key={h} className="border-l border-border h-[52px] hover:bg-accent-soft/40 transition-colors" />
                    ))}
                  </div>
                  {/* Overlay bookings */}
                  {BOOKINGS.filter(b => b.roomId === r.id).map((b, i) => {
                    const left = ((b.start - 8) / HOURS.length) * 100;
                    const width = (b.duration / HOURS.length) * 100;
                    const u = userById(b.by) ?? ME;
                    return (
                      <div key={i}
                        className="absolute top-1 bottom-1 rounded px-2 py-1 text-[10.5px] text-white overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                        style={{ left: `${left}%`, width: `${width}%`, background: r.color }}
                        title={b.title}
                      >
                        <div className="font-semibold truncate flex items-center gap-1">
                          {b.status === 'pending' && <AlertCircle size={9} />}
                          {b.title}
                        </div>
                        <div className="text-[9.5px] opacity-90 truncate">
                          {b.start}:00 ~ {b.start + b.duration}:00 · {u.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* AI suggestion */}
      <Card>
        <CardBody className="!p-4 flex items-start gap-3 bg-accent-soft/30">
          <Sparkles size={16} className="text-accent shrink-0 mt-0.5" />
          <div className="flex-1 text-[12px] text-fg-1 leading-relaxed">
            <span className="font-semibold text-accent-strong">AI 추천 시간 </span>
            팀 4명 (당신 · 박서연 · 이도현 · 정태훈) 모두 가능한 시간대 — <span className="font-semibold text-fg mono">오늘 16:00 ~ 17:00</span> · <span className="font-semibold text-fg mono">내일 11:00 ~ 12:00</span>. 회의실 <span className="font-semibold text-fg">소회의실 A</span> 자동 예약 가능.
          </div>
          <Button size="sm" variant="primary">자동 예약</Button>
        </CardBody>
      </Card>
    </>
  );
}

/* Equipment tab ----------------------------------------------------- */
function EquipmentTab() {
  const equipment = [
    { id: 'eq1', name: 'MacBook Pro 16" M3 Max',  category: 'Laptop', avail: 2,  total: 5,  color: '#5B6CFF' },
    { id: 'eq2', name: 'iPad Pro 12.9" + Pencil', category: 'Tablet', avail: 4,  total: 6,  color: '#34B27D' },
    { id: 'eq3', name: '캠코더 — Sony FX3',       category: 'Camera', avail: 1,  total: 2,  color: '#FF7A6B' },
    { id: 'eq4', name: 'DJI Mic 2 (무선 마이크)', category: 'Audio',  avail: 3,  total: 4,  color: '#A66CFF' },
    { id: 'eq5', name: 'Meta Quest 3',            category: 'VR',     avail: 0,  total: 1,  color: '#F2A93B' },
    { id: 'eq6', name: '모바일 핫스팟 (5G)',      category: 'Network', avail: 5, total: 8,  color: '#2A86E0' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {equipment.map(e => (
        <Card key={e.id} hoverable>
          <CardBody className="!p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-md grid place-items-center text-white" style={{ background: e.color }}>
                <Laptop size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] uppercase tracking-wider text-fg-3">{e.category}</div>
                <div className="text-[13px] font-semibold text-fg truncate">{e.name}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11.5px] mb-2">
              <span className="text-fg-2">사용 가능</span>
              <span className="mono"><span className={`text-[14px] font-bold ${e.avail === 0 ? 'text-danger' : 'text-fg'}`}>{e.avail}</span><span className="text-fg-3"> / {e.total}</span></span>
            </div>
            <div className="h-1.5 bg-bg-2 rounded-full overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${(e.avail / e.total) * 100}%`, background: e.avail === 0 ? 'var(--color-danger)' : e.color }} />
            </div>
            <Button size="sm" variant={e.avail === 0 ? 'secondary' : 'primary'} className="!w-full mt-3" disabled={e.avail === 0}>
              {e.avail === 0 ? '대기열 등록' : '대여 신청'}
            </Button>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

/* Parking tab ------------------------------------------------------- */
function ParkingTab() {
  const slots = Array.from({ length: 24 }, (_, i) => {
    const used = [0, 2, 3, 5, 7, 9, 12, 13, 14, 17, 20, 22].includes(i);
    const mine = i === 7;
    return { id: i + 1, used, mine };
  });
  const available = slots.filter(s => !s.used).length;

  return (
    <div className="grid grid-cols-3 gap-5">
      <div className="col-span-2 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <KPI icon={Car} label="전체 자리" value={`${slots.length}개`} hint="지하 1층 · 임직원 전용" />
          <KPI icon={CheckCircle2} label="사용 가능" value={`${available}개`} hint={`${Math.round(((slots.length - available) / slots.length) * 100)}% 점유`} tone="success" />
          <KPI icon={MapPin} label="내 예약" value="A-08" hint="오늘 09:00 ~ 19:00" tone="info" />
        </div>

        <Card>
          <CardHeader><CardTitle>주차 자리 현황</CardTitle></CardHeader>
          <CardBody>
            <div className="grid grid-cols-8 gap-2">
              {slots.map(s => (
                <button key={s.id}
                  className={`aspect-[3/2] rounded-md border-2 flex items-center justify-center text-[11px] font-bold transition-all ${
                    s.mine ? 'border-accent bg-accent text-accent-fg' :
                    s.used ? 'border-border bg-bg-1 text-fg-3 cursor-not-allowed' :
                    'border-border bg-bg-elev text-fg-1 hover:border-accent hover:bg-accent-soft'
                  }`}
                  disabled={s.used && !s.mine}
                >
                  <div className="text-center">
                    <Car size={11} className="mx-auto mb-0.5 opacity-70" />
                    <div className="mono">A-{s.id.toString().padStart(2, '0')}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-fg-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-border bg-bg-elev" />사용 가능</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-border bg-bg-1" />사용 중</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-accent bg-accent" />내 자리</span>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>방문객 주차 신청</CardTitle></CardHeader>
          <CardBody className="space-y-2.5">
            <div className="space-y-1.5">
              <Label>방문자 성함</Label>
              <Input placeholder="홍길동" />
            </div>
            <div className="space-y-1.5">
              <Label>차량 번호</Label>
              <Input placeholder="12가 3456" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>방문 일시</Label>
                <Input value="2026-04-28 14:00" />
              </div>
              <div className="space-y-1.5">
                <Label>예상 시간</Label>
                <Input value="2시간" />
              </div>
            </div>
            <Button size="md" variant="primary" className="!w-full mt-2">방문객 등록</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>최근 이용</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-[11.5px]">
            {[
              { date: '4/26', slot: 'A-08', dur: '9h 30m' },
              { date: '4/25', slot: 'A-12', dur: '10h 12m' },
              { date: '4/24', slot: 'A-08', dur: '9h 45m' },
            ].map((l, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-border last:border-b-0">
                <span className="mono text-fg-3 w-12">{l.date}</span>
                <span className="font-semibold text-fg">{l.slot}</span>
                <span className="mono text-fg-2">{l.dur}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* Booking modal ----------------------------------------------------- */
function BookingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[oklch(0_0_0/0.5)] backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-[520px] rounded-xl bg-bg-elev border border-border shadow-pop" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-12 border-b border-border">
          <div className="text-[14px] font-semibold text-fg">새 회의실 예약</div>
          <button onClick={onClose} className="text-fg-3 hover:text-fg-1"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="space-y-1.5">
            <Label>회의 제목</Label>
            <Input placeholder="예: 디자인 시스템 리뷰" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5"><Label>날짜</Label><Input value="2026-04-28" /></div>
            <div className="space-y-1.5"><Label>시작</Label><Input value="14:00" /></div>
            <div className="space-y-1.5"><Label>종료</Label><Input value="15:00" /></div>
          </div>
          <div className="space-y-1.5">
            <Label>회의실</Label>
            <select className="w-full h-9 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] text-fg outline-none focus:border-accent">
              {ROOMS.map(r => <option key={r.id}>{r.name} · {r.floor} · {r.capacity}석</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>참석자</Label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-bg-1 border border-border min-h-9">
              {TEAM.slice(0, 4).map(u => (
                <div key={u.id} className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-bg-elev border border-border text-[11px]">
                  <Avatar user={u} size={14} /><span className="text-fg-1">{u.name}</span>
                  <button className="text-fg-3 hover:text-danger"><X size={9} /></button>
                </div>
              ))}
              <input className="flex-1 min-w-[120px] bg-transparent text-[11.5px] text-fg outline-none" placeholder="@이름 추가" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>메모</Label>
            <textarea rows={2} className="w-full px-2.5 py-2 rounded-md bg-bg-1 border border-border text-[12.5px] text-fg outline-none focus:border-accent resize-none" placeholder="안건, 준비물 등" />
          </div>
          <div className="p-3 rounded-md bg-accent-soft/40 flex items-start gap-2 text-[11.5px] text-fg-1">
            <Sparkles size={12} className="text-accent mt-0.5" />
            <span><span className="font-semibold text-accent-strong">AI</span> — 참석자 4명 모두 가능. 회의실 자동으로 캘린더 + Slack 채널에 동기화됩니다.</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 h-14 border-t border-border bg-bg-1 rounded-b-xl">
          <Button size="md" variant="ghost" onClick={onClose}>취소</Button>
          <Button size="md" variant="primary">예약 확정</Button>
        </div>
      </div>
    </div>
  );
}

/* Helpers ----------------------------------------------------------- */
function KPI({ icon: Icon, label, value, hint, tone }: { icon: typeof Building2; label: string; value: React.ReactNode; hint?: string; tone?: 'warning'|'success'|'info'|'danger' }) {
  const tint = tone === 'warning' ? 'text-warning bg-warning-soft' : tone === 'success' ? 'text-success bg-success-soft' : tone === 'info' ? 'text-info bg-bg-2' : tone === 'danger' ? 'text-danger bg-danger-soft' : 'text-fg-2 bg-bg-2';
  return (
    <Card>
      <CardBody className="!p-4 flex items-start gap-3">
        <div className={`w-9 h-9 rounded-md grid place-items-center ${tint}`}><Icon size={16} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-fg-3">{label}</div>
          <div className="text-[20px] font-bold text-fg leading-tight mt-0.5">{value}</div>
          {hint && <div className="text-[10.5px] text-fg-3 mt-0.5">{hint}</div>}
        </div>
      </CardBody>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10.5px] uppercase tracking-wider font-semibold text-fg-3">{children}</label>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full h-9 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] text-fg placeholder:text-fg-3 outline-none focus:border-accent" />;
}

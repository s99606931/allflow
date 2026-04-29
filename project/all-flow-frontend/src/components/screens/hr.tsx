'use client';

import { Card, CardHeader, CardTitle, CardBody, Avatar, AvatarStack, Badge, Button, IconButton, Progress } from '@/components/ui/primitives';
import { TEAM, ME, userById } from '@/lib/fixtures';
import {
  Plane, CalendarClock, Award, TrendingUp, Plus, ChevronLeft, ChevronRight,
  Briefcase, Heart, Baby, Stethoscope, Sparkles,
} from 'lucide-react';
import { useState } from 'react';

const TABS = ['휴가 / 연차', '근태', '평가 / OKR', '1:1 미팅'] as const;
type Tab = typeof TABS[number];

export function HRPage() {
  const [tab, setTab] = useState<Tab>('휴가 / 연차');
  return (
    <div className="p-6 max-w-[1280px] mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-bold text-fg">인사 / HR</h2>
        <span className="text-[12px] text-fg-3">개인 인사정보 · 휴가 · 평가</span>
      </div>

      <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 h-8 rounded text-[12.5px] font-medium transition-colors ${tab === t ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2 hover:text-fg-1'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === '휴가 / 연차' && <LeaveTab />}
      {tab === '근태' && <AttendanceTab />}
      {tab === '평가 / OKR' && <EvalTab />}
      {tab === '1:1 미팅' && <OneOnOneTab />}
    </div>
  );
}

/* 휴가 ----------------------------------------------------------------- */
function LeaveTab() {
  const balance = [
    { kind: '연차', used: 6, total: 15, icon: Plane, color: 'oklch(0.65 0.16 220)' },
    { kind: '병가', used: 1, total: 5,  icon: Stethoscope, color: 'oklch(0.66 0.18 30)' },
    { kind: '경조사', used: 0, total: 7,  icon: Heart, color: 'oklch(0.65 0.18 350)' },
    { kind: '출산/육아', used: 0, total: 90, icon: Baby, color: 'oklch(0.62 0.18 280)' },
  ];

  const upcoming = [
    { who: 'u1', kind: '연차', period: '5/6 ~ 5/7', days: 2, status: 'pending' as const },
    { who: 'u4', kind: '병가', period: '5/2', days: 1, status: 'approved' as const },
    { who: 'u5', kind: '연차 (반차)', period: '5/3 오후', days: 0.5, status: 'approved' as const },
    { who: 'u3', kind: '연차', period: '5/12 ~ 5/16', days: 5, status: 'pending' as const },
  ];

  return (
    <div className="grid grid-cols-12 gap-5">
      {/* My balance */}
      <div className="col-span-8 space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>내 잔여 휴가 — 2026년</CardTitle>
            <Button size="sm" variant="primary"><Plus size={13} /> 휴가 신청</Button>
          </CardHeader>
          <CardBody className="grid grid-cols-4 gap-3">
            {balance.map(b => {
              const Icon = b.icon;
              const remaining = b.total - b.used;
              return (
                <div key={b.kind} className="p-4 rounded-lg border border-border bg-bg-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md grid place-items-center text-white" style={{ background: b.color }}>
                      <Icon size={13} />
                    </div>
                    <span className="text-[12px] font-semibold text-fg-1">{b.kind}</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-[24px] font-bold text-fg leading-none mono">{remaining}</span>
                    <span className="text-[11px] text-fg-3">/ {b.total}일</span>
                  </div>
                  <div className="mt-2.5">
                    <Progress value={(b.used / b.total) * 100} />
                    <div className="text-[10.5px] text-fg-3 mt-1">{b.used}일 사용</div>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>팀 휴가 캘린더 — 5월</CardTitle></CardHeader>
          <CardBody className="p-0">
            <TeamLeaveCalendar />
          </CardBody>
        </Card>
      </div>

      {/* Upcoming */}
      <div className="col-span-4 space-y-5">
        <Card>
          <CardHeader><CardTitle>다가오는 휴가</CardTitle></CardHeader>
          <CardBody className="space-y-2.5">
            {upcoming.map((u, i) => {
              const user = userById(u.who);
              if (!user) return null;
              return (
                <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-md border border-border hover:bg-hover">
                  <Avatar user={user} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-fg">{user.name}</div>
                    <div className="text-[11px] text-fg-3">{u.kind} · {u.period}</div>
                  </div>
                  <Badge tone={u.status === 'approved' ? 'success' : 'warning'}>
                    {u.status === 'approved' ? `${u.days}일 확정` : '대기'}
                  </Badge>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card className="bg-accent-soft/30 border-accent/30">
          <CardBody className="p-4">
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
              <div className="text-[12px] text-fg-1 leading-relaxed">
                <div className="font-semibold text-accent-strong mb-1">AI 휴가 추천</div>
                5월 6일 (월) ~ 7일 (화) 연차 사용 시 어린이날 + 주말과 함께 <strong>5일 연휴</strong>가 됩니다. 팀 일정상 충돌도 없어요.
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function TeamLeaveCalendar() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const events: Record<number, { who: string; kind: string }[]> = {
    2: [{ who: 'u4', kind: '병가' }],
    3: [{ who: 'u5', kind: '반차' }],
    5: [{ who: 'all', kind: '어린이날' }],
    6: [{ who: 'u1', kind: '연차' }, { who: 'u2', kind: '연차' }],
    7: [{ who: 'u1', kind: '연차' }],
    12: [{ who: 'u3', kind: '연차' }],
    13: [{ who: 'u3', kind: '연차' }],
    14: [{ who: 'u3', kind: '연차' }],
    15: [{ who: 'u3', kind: '연차' }, { who: 'all', kind: '석탄일' }],
    16: [{ who: 'u3', kind: '연차' }],
  };
  const dow = ['일','월','화','수','목','금','토'];
  // 5/1 = 금
  const startDow = 4;
  const grid: (number | null)[] = [...Array(startDow).fill(null), ...days];

  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dow.map(d => (
          <div key={d} className="text-[11px] text-fg-3 text-center font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d, i) => (
          <div key={i} className={`min-h-[68px] p-1.5 rounded border ${d ? 'bg-bg-1 border-border' : 'bg-transparent border-transparent'}`}>
            {d && (
              <>
                <div className="text-[10.5px] text-fg-2 mono">{d}</div>
                <div className="space-y-0.5 mt-1">
                  {(events[d] ?? []).map((e, j) => {
                    if (e.who === 'all') {
                      return <div key={j} className="text-[9.5px] px-1 py-0.5 rounded bg-danger-soft text-danger truncate">{e.kind}</div>;
                    }
                    const u = userById(e.who);
                    return u ? (
                      <div key={j} className="text-[9.5px] px-1 py-0.5 rounded text-white truncate" style={{ background: u.color }}>
                        {u.initials} {e.kind}
                      </div>
                    ) : null;
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 근태 ----------------------------------------------------------------- */
function AttendanceTab() {
  const today = { in: '09:02', out: null, worked: '6시간 23분', target: '8시간', late: false };
  const week = [
    { day: '월', in: '08:58', out: '18:12', worked: 8.6 },
    { day: '화', in: '09:14', out: '18:40', worked: 8.8, late: true },
    { day: '수', in: '08:45', out: '19:30', worked: 9.7 },
    { day: '목', in: '09:01', out: '17:55', worked: 8.0 },
    { day: '금', in: '09:02', out: null, worked: 6.4, today: true },
  ];

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-4 space-y-5">
        <Card>
          <CardHeader><CardTitle>오늘 근태</CardTitle></CardHeader>
          <CardBody>
            <div className="text-center py-3">
              <div className="text-[36px] font-bold text-fg mono leading-none">{today.in}</div>
              <div className="text-[12px] text-fg-3 mt-1">출근 완료 · {today.worked}</div>
            </div>
            <div className="mt-3 space-y-2">
              <Progress value={(6.4 / 8) * 100} />
              <div className="flex justify-between text-[11px] text-fg-3">
                <span>{today.worked}</span>
                <span>목표 {today.target}</span>
              </div>
            </div>
            <Button className="w-full mt-4" variant="primary" size="md">퇴근 체크</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>이번 달 통계</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {[
              { k: '총 근무 시간', v: '147시간 30분', sub: '목표 160시간 · 92%' },
              { k: '평균 출근', v: '08:54', sub: '목표 09:00 이전' },
              { k: '지각', v: '1회', sub: '4월 16일' },
              { k: '연장 근무', v: '8시간', sub: '월 한도 52시간' },
            ].map(r => (
              <div key={r.k} className="flex items-center justify-between py-1.5">
                <div>
                  <div className="text-[12px] text-fg-2">{r.k}</div>
                  <div className="text-[10px] text-fg-3">{r.sub}</div>
                </div>
                <div className="text-[14px] font-bold text-fg mono">{r.v}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="col-span-8">
        <Card>
          <CardHeader><CardTitle>이번 주 근태</CardTitle></CardHeader>
          <CardBody>
            <div className="space-y-2">
              {week.map(w => (
                <div key={w.day} className={`flex items-center gap-3 p-3 rounded-md border ${w.today ? 'bg-accent-soft/30 border-accent/30' : 'border-border bg-bg-1'}`}>
                  <div className="w-10 text-center">
                    <div className="text-[14px] font-bold text-fg">{w.day}</div>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-[10.5px] text-fg-3">출근</div>
                      <div className="text-[13px] mono font-medium text-fg flex items-center gap-1.5">
                        {w.in}
                        {w.late && <Badge tone="warning">지각</Badge>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10.5px] text-fg-3">퇴근</div>
                      <div className="text-[13px] mono font-medium text-fg">{w.out ?? '— 진행 중'}</div>
                    </div>
                    <div>
                      <div className="text-[10.5px] text-fg-3">근무</div>
                      <div className="text-[13px] mono font-medium text-fg">{w.worked}h</div>
                    </div>
                  </div>
                  <div className="w-32">
                    <Progress value={(w.worked / 8) * 100} tone={w.worked >= 8 ? 'success' : 'accent'} />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* 평가 / OKR --------------------------------------------------------- */
function EvalTab() {
  const okrs = [
    { obj: '제품 만족도 NPS 50 달성', kr: [
      { name: 'NPS 측정', progress: 80, value: '42 → 47' },
      { name: '온보딩 이탈률 감소', progress: 60, value: '38% → 27%' },
      { name: '주간 사용자 인터뷰 4건', progress: 75, value: '12/16' },
    ]},
    { obj: '엔지니어링 속도 30% 향상', kr: [
      { name: 'PR 머지 평균 시간 24h 이내', progress: 50, value: '38h → 28h' },
      { name: '배포 빈도 주 5회', progress: 90, value: '4.5회/주' },
    ]},
  ];

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-8 space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>2026 Q2 OKR — 진행률</CardTitle>
            <Badge tone="accent">42일 남음</Badge>
          </CardHeader>
          <CardBody className="space-y-5">
            {okrs.map((o, i) => {
              const avg = Math.round(o.kr.reduce((a, b) => a + b.progress, 0) / o.kr.length);
              return (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={14} className="text-accent" />
                    <span className="text-[13.5px] font-semibold text-fg">{o.obj}</span>
                    <div className="flex-1" />
                    <span className="text-[11px] mono font-bold text-fg">{avg}%</span>
                  </div>
                  <div className="space-y-2 pl-5 border-l-2 border-border">
                    {o.kr.map((k, j) => (
                      <div key={j} className="space-y-1">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-fg-1">{k.name}</span>
                          <span className="mono text-fg-2">{k.value}</span>
                        </div>
                        <Progress value={k.progress} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <div className="col-span-4 space-y-5">
        <Card>
          <CardHeader><CardTitle>다음 평가</CardTitle></CardHeader>
          <CardBody>
            <div className="text-[16px] font-bold text-fg">2026 상반기 평가</div>
            <div className="text-[11.5px] text-fg-3 mt-1">평가 기간: 6/15 ~ 6/30</div>
            <div className="mt-3 space-y-1.5">
              {['셀프 평가', '동료 평가 (4명)', '상위자 평가', '최종 정렬'].map((s, i) => (
                <div key={s} className="flex items-center gap-2 text-[12px]">
                  <div className={`w-4 h-4 rounded-full ${i < 1 ? 'bg-success' : 'bg-bg-2 border border-border'}`} />
                  <span className={i < 1 ? 'text-fg-2 line-through' : 'text-fg-1'}>{s}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>지난 평가</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {[
              { p: '2025 하반기', grade: 'A', date: '2026-01-15' },
              { p: '2025 상반기', grade: 'A-', date: '2025-07-12' },
              { p: '2024 하반기', grade: 'B+', date: '2025-01-10' },
            ].map(r => (
              <div key={r.p} className="flex items-center justify-between p-2 rounded-md hover:bg-hover">
                <div>
                  <div className="text-[12.5px] font-medium text-fg">{r.p}</div>
                  <div className="text-[10.5px] text-fg-3">{r.date}</div>
                </div>
                <Badge tone="accent">{r.grade}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* 1:1 ------------------------------------------------------------ */
function OneOnOneTab() {
  const upcoming = [
    { with: 'u6', when: '5/2 (금) 14:00', topic: '커리어 패스 논의', recurring: '매주 금' },
    { with: 'u1', when: '5/5 (월) 11:00', topic: '온보딩 프로토타입 피드백', recurring: '격주' },
  ];
  const past = [
    { with: 'u6', when: '4/25', notes: '커리어 패스 · Q2 OKR 정렬 · 팀빌딩' },
    { with: 'u1', when: '4/22', notes: '디자인 시스템 v2 일정 · 디자인 리소스 확보' },
    { with: 'u3', when: '4/18', notes: '결제 시스템 리팩터 우선순위 · 백엔드 채용' },
  ];

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-7 space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>다가오는 1:1</CardTitle>
            <Button size="sm" variant="primary"><Plus size={13} /> 새 1:1 예약</Button>
          </CardHeader>
          <CardBody className="space-y-2">
            {upcoming.map((m, i) => {
              const u = userById(m.with);
              if (!u) return null;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-border bg-bg-1">
                  <Avatar user={u} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-fg">{u.name}</span>
                      <Badge tone="neutral">{m.recurring}</Badge>
                    </div>
                    <div className="text-[11.5px] text-fg-3 mt-0.5">{m.topic}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] mono font-medium text-fg">{m.when}</div>
                    <Button size="sm" variant="secondary" className="mt-1.5">참석 노트</Button>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>지난 1:1 노트</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {past.map((m, i) => {
              const u = userById(m.with);
              if (!u) return null;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-md hover:bg-hover">
                  <Avatar user={u} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12.5px] font-semibold text-fg">{u.name}</span>
                      <span className="text-[10.5px] text-fg-3">{m.when}</span>
                    </div>
                    <div className="text-[12px] text-fg-2 mt-0.5">{m.notes}</div>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <div className="col-span-5">
        <Card className="bg-accent-soft/30 border-accent/30">
          <CardBody>
            <div className="flex items-start gap-2 mb-3">
              <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
              <div>
                <div className="text-[13px] font-semibold text-accent-strong">AI 1:1 어시스턴트</div>
                <div className="text-[11.5px] text-fg-2 mt-0.5">지난 1:1 노트와 최근 활동 기반으로 다음 미팅 토픽을 제안합니다.</div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                'Q2 OKR 진척도 — KR2 (배포 빈도) 회복 방안',
                '결제 시스템 리팩터 — 일정 조정 필요',
                '신입 백엔드 채용 — 면접 일정 합의',
                '커리어 패스 — Tech Lead 역할 확장 논의',
              ].map((t, i) => (
                <button key={i} className="w-full text-left p-2.5 rounded-md bg-bg-elev border border-border hover:bg-hover text-[12px] text-fg-1">
                  + {t}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button, Avatar, AvatarStack, Progress } from '@/components/ui/primitives';
import { TEAM, ME, userById } from '@/lib/fixtures';
import {
  CalendarDays, Plane, Clock, TrendingUp, Award, GraduationCap, Heart,
  Plus, ChevronRight, ChevronLeft, Filter, Search, BadgeCheck, Sparkles,
  Coffee, AlertCircle, CheckCircle2, ArrowUpRight, Briefcase, Target,
} from 'lucide-react';

const TABS = [
  { id: 'overview',   label: '내 인사 요약',  icon: BadgeCheck },
  { id: 'leave',      label: '휴가',         icon: Plane },
  { id: 'attendance', label: '근태',         icon: Clock },
  { id: 'evaluation', label: '평가',         icon: Award },
  { id: 'payroll',    label: '급여',         icon: TrendingUp },
  { id: 'training',   label: '교육',         icon: GraduationCap },
] as const;

const LEAVE_BALANCE = [
  { type: '연차',     used: 4,  total: 15, color: '#5B6CFF', soon: '5/2 (금)' },
  { type: '반차',     used: 2,  total: 10, color: '#34B27D' },
  { type: '병가',     used: 0,  total: 5,  color: '#FF7A6B' },
  { type: '경조사',   used: 1,  total: 3,  color: '#A66CFF' },
  { type: '리프레시', used: 0,  total: 5,  color: '#F2A93B', hint: '근속 3년차' },
];

const TEAM_LEAVE_TODAY = [
  { who: 'u3', type: '연차', back: '4/29' },
  { who: 'u5', type: '반차 (오후)', back: '오늘 13:00 ~' },
];

const ATTENDANCE_WEEK = [
  { day: '월', date: '4/21', clockIn: '09:02', clockOut: '18:34', work: '8h 32m', state: 'normal' },
  { day: '화', date: '4/22', clockIn: '08:55', clockOut: '19:12', work: '9h 17m', state: 'overtime' },
  { day: '수', date: '4/23', clockIn: '09:08', clockOut: '18:20', work: '8h 12m', state: 'normal' },
  { day: '목', date: '4/24', clockIn: '08:48', clockOut: '20:05', work: '10h 17m', state: 'overtime' },
  { day: '금', date: '4/25', clockIn: '09:14', clockOut: '17:50', work: '7h 36m', state: 'short' },
  { day: '월', date: '4/28', clockIn: '08:59', clockOut: '—', work: '진행중', state: 'today' },
];

const EVAL_OKR = [
  { kr: '주간 활성 사용자 30% 증가',   prog: 78, target: '50,000', current: '46,400' },
  { kr: '온보딩 이탈률 15% 감소',      prog: 92, target: '12%',    current: '11.2%' },
  { kr: '결제 성공률 99.5% 유지',     prog: 64, target: '99.5%',  current: '99.1%' },
];

const TRAINING = [
  { id: 1, title: 'Notion AI 워크플로우 마스터 클래스', category: '필수', status: '진행중', prog: 60, due: '5/15', hours: '4h' },
  { id: 2, title: '정보보호 연간 교육',                  category: '필수', status: '미수강', prog: 0,  due: '6/30', hours: '2h' },
  { id: 3, title: '시니어 프로덕트 매니저 코칭',         category: '선택', status: '완료',   prog: 100, due: '—',    hours: '12h' },
  { id: 4, title: 'Figma 고급 — Auto Layout',           category: '선택', status: '진행중', prog: 35, due: '—',    hours: '6h' },
];

const PAYSLIPS = [
  { month: '2026년 4월', net: '₩4,892,140', gross: '₩5,820,000', paid: false },
  { month: '2026년 3월', net: '₩4,884,720', gross: '₩5,820,000', paid: true },
  { month: '2026년 2월', net: '₩4,884,720', gross: '₩5,820,000', paid: true },
  { month: '2026년 1월', net: '₩4,892,140', gross: '₩5,820,000', paid: true },
];

export default function HRPage() {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('overview');

  return (
    <AppShell
      title="인사 / HR"
      subtitle="휴가 · 근태 · 평가 · 급여 · 교육"
      actions={
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary"><Plane size={13} /> 휴가 신청</Button>
          <Button size="sm" variant="primary"><Plus size={13} /> 새 신청</Button>
        </div>
      }
    >
      <div className="p-6 space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border -mt-2">
          {TABS.map(t => {
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

        {tab === 'overview'   && <OverviewTab />}
        {tab === 'leave'      && <LeaveTab />}
        {tab === 'attendance' && <AttendanceTab />}
        {tab === 'evaluation' && <EvaluationTab />}
        {tab === 'payroll'    && <PayrollTab />}
        {tab === 'training'   && <TrainingTab />}
      </div>
    </AppShell>
  );
}

/* Overview ----------------------------------------------------------- */
function OverviewTab() {
  return (
    <>
      {/* My profile card */}
      <Card>
        <CardBody className="!p-5">
          <div className="flex items-center gap-4">
            <Avatar user={ME} size={64} />
            <div className="flex-1">
              <div className="text-[18px] font-bold text-fg">{ME.name} <span className="text-fg-3 font-normal text-[13px]">{ME.role}</span></div>
              <div className="text-[12.5px] text-fg-2 mt-0.5">{ME.dept} · 사번 EMP-2021-0142 · 입사일 2021-09-01 (4년 7개월)</div>
              <div className="flex items-center gap-2 mt-2.5">
                <Badge tone="accent">정규직</Badge>
                <Badge tone="success">재직 중</Badge>
                <Badge tone="info">팀 리드</Badge>
                <span className="text-[11.5px] text-fg-3 ml-2">다음 평가: 2026-06-30</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10.5px] text-fg-3 uppercase tracking-wider">근속</div>
              <div className="text-[24px] font-bold text-fg leading-none mono">4.6년</div>
              <button className="text-[11px] text-accent hover:underline mt-1 inline-flex items-center gap-1">상세 프로필 <ArrowUpRight size={11} /></button>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-3 gap-5">
        {/* Leave snapshot */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Plane size={14} /> 휴가 현황</CardTitle>
            <button className="text-[11px] text-accent hover:underline">전체</button>
          </CardHeader>
          <CardBody className="space-y-3">
            {LEAVE_BALANCE.slice(0, 3).map(l => (
              <div key={l.type}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-fg-1 font-medium">{l.type}</span>
                  <span className="mono text-fg-2"><span className="font-semibold text-fg">{l.total - l.used}</span> / {l.total}일</span>
                </div>
                <Progress value={(l.used / l.total) * 100} />
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-border text-[11.5px] text-fg-2 flex items-start gap-1.5">
              <Sparkles size={11} className="text-accent mt-0.5" />
              <span><span className="font-semibold text-accent-strong">AI 추천</span> — 잔여 연차 11일. 7월 둘째 주 팀 일정 한가, 휴가 사용 적기.</span>
            </div>
          </CardBody>
        </Card>

        {/* Attendance snapshot */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Clock size={14} /> 이번 주 근태</CardTitle>
            <Badge tone="success">정상</Badge>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Stat label="이번 주 근무" value="43h 54m" hint="목표 40h" />
              <Stat label="평균 출근" value="09:01" hint="유연근무 ~10:00" />
            </div>
            <div className="space-y-1">
              {ATTENDANCE_WEEK.slice(0, 4).map(a => (
                <div key={a.date} className="flex items-center gap-2 text-[11.5px] py-1 border-b border-border last:border-b-0">
                  <span className="w-7 text-fg-3 mono">{a.day}</span>
                  <span className="text-fg-3 mono text-[10.5px]">{a.date}</span>
                  <span className="flex-1" />
                  <span className="mono text-fg-1">{a.clockIn} → {a.clockOut}</span>
                  <span className={`mono text-[10.5px] w-14 text-right ${a.state === 'overtime' ? 'text-warning' : a.state === 'short' ? 'text-danger' : 'text-fg-2'}`}>{a.work}</span>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full h-8 rounded-md bg-accent text-accent-fg text-[12px] font-medium hover:bg-accent-strong inline-flex items-center justify-center gap-1.5">
              <CheckCircle2 size={12} /> 출근 체크인
            </button>
          </CardBody>
        </Card>

        {/* Eval & training */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Award size={14} /> Q2 OKR & 평가</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {EVAL_OKR.slice(0, 2).map(o => (
              <div key={o.kr}>
                <div className="text-[11.5px] text-fg-1 mb-1">{o.kr}</div>
                <div className="flex items-center gap-2">
                  <Progress value={o.prog} className="flex-1" tone={o.prog > 80 ? 'success' : o.prog > 50 ? 'accent' : 'warning'} />
                  <span className="text-[11px] mono font-semibold text-fg w-9 text-right">{o.prog}%</span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-fg-3 mt-0.5 mono">
                  <span>현재 {o.current}</span> · <span>목표 {o.target}</span>
                </div>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-border">
              <div className="text-[11.5px] text-fg-2 mb-1.5">진행중인 교육 2개</div>
              <div className="flex items-center gap-2 text-[11.5px]">
                <GraduationCap size={13} className="text-accent" />
                <span className="flex-1 truncate text-fg-1">Notion AI 워크플로우</span>
                <span className="mono text-fg-3">60%</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Team away today */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><Coffee size={14} /> 오늘 팀 근무 현황</CardTitle>
          <span className="text-[11px] text-fg-3">2026년 4월 28일 (월)</span>
        </CardHeader>
        <div className="grid grid-cols-7 divide-x divide-border">
          {TEAM.map(u => {
            const away = TEAM_LEAVE_TODAY.find(t => t.who === u.id);
            return (
              <div key={u.id} className={`p-3 ${away ? 'bg-warning-soft/50' : ''}`}>
                <Avatar user={u} size={32} className="mb-2" />
                <div className="text-[11.5px] font-medium text-fg truncate">{u.name}</div>
                <div className="text-[10.5px] text-fg-3 truncate">{away ? away.type : '근무 중'}</div>
                {away?.back && <div className="text-[10px] text-warning mt-0.5 mono">{away.back}</div>}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-2.5 rounded-md bg-bg-1 border border-border">
      <div className="text-[10.5px] text-fg-3">{label}</div>
      <div className="text-[15px] font-bold text-fg mono">{value}</div>
      {hint && <div className="text-[10px] text-fg-3 mt-0.5">{hint}</div>}
    </div>
  );
}

/* Leave -------------------------------------------------------------- */
function LeaveTab() {
  return (
    <div className="grid grid-cols-3 gap-5">
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>휴가 잔여</CardTitle>
          <Button size="sm" variant="primary"><Plus size={12} /> 휴가 신청</Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {LEAVE_BALANCE.map(l => (
            <div key={l.type}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-[13px] font-semibold text-fg">{l.type}</span>
                  {l.hint && <Badge tone="info" className="!h-[16px] !text-[9.5px]">{l.hint}</Badge>}
                  {l.soon && <span className="text-[10.5px] text-warning">예정: {l.soon}</span>}
                </div>
                <div className="mono text-[12.5px] text-fg-2"><span className="font-bold text-fg text-[14px]">{l.total - l.used}</span> / {l.total}일</div>
              </div>
              <div className="h-2 bg-bg-2 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(l.used / l.total) * 100}%`, background: l.color }} />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>지난 휴가 이력</CardTitle></CardHeader>
        <CardBody className="space-y-2.5">
          {[
            { date: '4/12 (금)', type: '연차', state: '사용' },
            { date: '3/14 (금)', type: '연차', state: '사용' },
            { date: '2/28 (금)', type: '반차 (오후)', state: '사용' },
            { date: '1/22~1/23', type: '경조사 (결혼)', state: '사용' },
          ].map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px] py-1 border-b border-border last:border-b-0">
              <CalendarDays size={13} className="text-fg-3" />
              <span className="mono text-fg-2 w-24">{h.date}</span>
              <span className="flex-1 text-fg-1">{h.type}</span>
              <Badge tone="success" className="!h-[16px] !text-[9.5px]">{h.state}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

/* Attendance --------------------------------------------------------- */
function AttendanceTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <Card><CardBody className="!p-4"><div className="text-[11px] text-fg-3">이번 주 누적</div><div className="text-[22px] font-bold text-fg mono">43h 54m</div><div className="text-[10.5px] text-fg-3">목표 40h · <span className="text-warning">+3h 54m</span></div></CardBody></Card>
        <Card><CardBody className="!p-4"><div className="text-[11px] text-fg-3">이번 달 평균</div><div className="text-[22px] font-bold text-fg mono">8h 47m</div><div className="text-[10.5px] text-fg-3">팀 평균 8h 32m</div></CardBody></Card>
        <Card><CardBody className="!p-4"><div className="text-[11px] text-fg-3">초과 근무</div><div className="text-[22px] font-bold text-warning mono">11h 24m</div><div className="text-[10.5px] text-fg-3">52h 한도까지 8h 36m</div></CardBody></Card>
        <Card><CardBody className="!p-4"><div className="text-[11px] text-fg-3">유연근무 사용</div><div className="text-[22px] font-bold text-fg mono">2회</div><div className="text-[10.5px] text-fg-3">월 5회 한도</div></CardBody></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>이번 주 근태 상세</CardTitle>
          <div className="flex items-center gap-1.5">
            <button className="text-fg-3 hover:text-fg-1"><ChevronLeft size={14} /></button>
            <span className="text-[12px] mono text-fg-2">2026년 4/21 ~ 4/28</span>
            <button className="text-fg-3 hover:text-fg-1"><ChevronRight size={14} /></button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wider text-fg-3 border-b border-border">
                <th className="text-left px-4 py-2">일자</th>
                <th className="text-left px-4 py-2">출근</th>
                <th className="text-left px-4 py-2">퇴근</th>
                <th className="text-left px-4 py-2">근무 시간</th>
                <th className="text-left px-4 py-2">초과</th>
                <th className="text-left px-4 py-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {ATTENDANCE_WEEK.map(a => (
                <tr key={a.date} className={`border-b border-border last:border-b-0 ${a.state === 'today' ? 'bg-accent-soft/30' : ''}`}>
                  <td className="px-4 py-2.5"><span className="font-semibold text-fg">{a.day}</span> <span className="text-fg-3 mono ml-1">{a.date}</span></td>
                  <td className="px-4 py-2.5 mono text-fg-1">{a.clockIn}</td>
                  <td className="px-4 py-2.5 mono text-fg-1">{a.clockOut}</td>
                  <td className="px-4 py-2.5 mono font-semibold text-fg">{a.work}</td>
                  <td className="px-4 py-2.5 mono text-warning">{a.state === 'overtime' ? '+1h~2h' : '—'}</td>
                  <td className="px-4 py-2.5">
                    {a.state === 'normal' && <Badge tone="success">정상</Badge>}
                    {a.state === 'overtime' && <Badge tone="warning">초과</Badge>}
                    {a.state === 'short' && <Badge tone="danger">미달</Badge>}
                    {a.state === 'today' && <Badge tone="info">진행 중</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* Evaluation --------------------------------------------------------- */
function EvaluationTab() {
  return (
    <div className="grid grid-cols-3 gap-5">
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>2026 Q2 OKR</CardTitle>
          <Badge tone="accent">진행 중 · 마감 6/30</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-fg-3 mb-1">목표 (Objective)</div>
            <div className="text-[14.5px] font-semibold text-fg">"모바일 앱 v3 출시 및 시장 정착"</div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-fg-3 mb-2">핵심 결과 (Key Results)</div>
            <div className="space-y-3">
              {EVAL_OKR.map(o => (
                <div key={o.kr} className="p-3 rounded-md bg-bg-1 border border-border">
                  <div className="flex items-start gap-2 mb-2">
                    <Target size={13} className="text-accent mt-0.5" />
                    <div className="flex-1 text-[12.5px] text-fg">{o.kr}</div>
                    <span className="text-[12px] mono font-bold text-fg">{o.prog}%</span>
                  </div>
                  <Progress value={o.prog} tone={o.prog > 80 ? 'success' : o.prog > 50 ? 'accent' : 'warning'} />
                  <div className="flex items-center gap-3 text-[10.5px] text-fg-3 mt-1.5 mono">
                    <span>현재 {o.current}</span><span>·</span><span>목표 {o.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle>최근 평가</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-fg-1">2025 Q4 종합</span>
              <Badge tone="success">A · 우수</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-fg-1">2025 Q3 종합</span>
              <Badge tone="accent">B+</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-fg-1">동료 평가 (5명)</span>
              <span className="mono text-[12px] font-semibold text-fg">4.6 / 5.0</span>
            </div>
            <div className="pt-2 border-t border-border text-[11.5px] text-fg-2 leading-relaxed">
              <span className="font-semibold text-fg">매니저 코멘트 </span>
              "프로젝트 리딩과 팀 빌딩에서 두드러진 성과. 다음 분기 시니어 PM 역할 확대 검토."
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Sparkles size={13} className="text-accent" /> AI 성장 인사이트</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-[11.5px]">
            <div className="flex items-start gap-2"><span className="text-success font-bold">+</span><span className="text-fg-1">크로스팀 협업 빈도 전 분기 대비 <span className="font-semibold text-fg">2.3배</span> 증가 — 리더십 영향력 확장 중</span></div>
            <div className="flex items-start gap-2"><span className="text-success font-bold">+</span><span className="text-fg-1">문서화 양 <span className="font-semibold text-fg">팀 평균 1.8배</span> — 지식 자산화에 기여</span></div>
            <div className="flex items-start gap-2"><span className="text-warning font-bold">!</span><span className="text-fg-1">기술 학습 시간 <span className="font-semibold text-fg">월 4h</span> — 권장 12h 대비 부족</span></div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* Payroll ------------------------------------------------------------ */
function PayrollTab() {
  return (
    <div className="grid grid-cols-3 gap-5">
      <Card className="col-span-2">
        <CardHeader><CardTitle>급여 명세 이력</CardTitle></CardHeader>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wider text-fg-3 border-b border-border">
              <th className="text-left px-5 py-2">지급 월</th>
              <th className="text-right px-5 py-2">실 지급액</th>
              <th className="text-right px-5 py-2">총 지급액</th>
              <th className="text-left px-5 py-2">상태</th>
              <th className="px-5 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {PAYSLIPS.map(p => (
              <tr key={p.month} className="border-b border-border last:border-b-0 hover:bg-hover">
                <td className="px-5 py-3 font-semibold text-fg">{p.month}</td>
                <td className="px-5 py-3 mono font-semibold text-fg text-right">{p.net}</td>
                <td className="px-5 py-3 mono text-fg-2 text-right">{p.gross}</td>
                <td className="px-5 py-3">{p.paid ? <Badge tone="success">지급 완료</Badge> : <Badge tone="warning">예정 5/10</Badge>}</td>
                <td className="px-5 py-3 text-right"><button className="text-[11px] text-accent hover:underline">명세서 PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader><CardTitle>급여 구성</CardTitle></CardHeader>
        <CardBody className="space-y-2.5 text-[12px]">
          <Row label="기본급"     value="₩4,200,000" />
          <Row label="직책수당"   value="₩400,000" />
          <Row label="식대"       value="₩200,000" />
          <Row label="자기개발비" value="₩100,000" />
          <Row label="성과급 (분기)" value="₩920,000" hint="Q1 평가 반영" />
          <div className="border-t border-border pt-2 mt-2">
            <Row label="총 지급액" value="₩5,820,000" bold />
            <Row label="공제 (4대보험·세금)" value="-₩927,860" sub />
            <Row label="실 지급액" value="₩4,892,140" bold accent />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value, bold, sub, accent, hint }: { label: string; value: string; bold?: boolean; sub?: boolean; accent?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${bold ? 'font-semibold text-fg' : sub ? 'text-fg-3 text-[11.5px]' : 'text-fg-1'}`}>
        {label}
        {hint && <span className="text-[10.5px] text-fg-3 ml-1.5">· {hint}</span>}
      </span>
      <span className={`mono ${accent ? 'text-accent-strong font-bold' : bold ? 'font-bold text-fg' : sub ? 'text-fg-3' : 'text-fg-1'}`}>{value}</span>
    </div>
  );
}

/* Training ----------------------------------------------------------- */
function TrainingTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardBody className="!p-4"><div className="text-[11px] text-fg-3">이수 시간 (연간)</div><div className="text-[22px] font-bold text-fg mono">28h</div><div className="text-[10.5px] text-fg-3">목표 40h · 70%</div><Progress value={70} className="mt-1.5" tone="accent" /></CardBody></Card>
        <Card><CardBody className="!p-4"><div className="text-[11px] text-fg-3">필수 교육</div><div className="text-[22px] font-bold text-fg mono">3 / 5</div><div className="text-[10.5px] text-warning">2건 미수강 (마감 임박)</div></CardBody></Card>
        <Card><CardBody className="!p-4"><div className="text-[11px] text-fg-3">자기개발비 잔액</div><div className="text-[22px] font-bold text-fg mono">₩620K</div><div className="text-[10.5px] text-fg-3">연간 ₩1,200K · 4월 사용 ₩580K</div></CardBody></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>교육 과정</CardTitle>
          <Button size="sm" variant="secondary"><Plus size={12} /> 교육 신청</Button>
        </CardHeader>
        <div>
          {TRAINING.map(t => (
            <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-b-0 hover:bg-hover">
              <div className={`w-10 h-10 rounded-md grid place-items-center ${t.category === '필수' ? 'bg-warning-soft text-warning' : 'bg-accent-soft text-accent-strong'}`}>
                <GraduationCap size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge tone={t.category === '필수' ? 'warning' : 'accent'} className="!h-[16px] !text-[9.5px]">{t.category}</Badge>
                  <span className="text-[13px] font-semibold text-fg truncate">{t.title}</span>
                </div>
                <div className="flex items-center gap-3 text-[10.5px] text-fg-3 mono">
                  <span>{t.hours}</span>
                  <span>·</span>
                  <span>마감 {t.due}</span>
                </div>
              </div>
              <div className="w-32">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-fg-2">{t.status}</span>
                  <span className="mono font-semibold text-fg">{t.prog}%</span>
                </div>
                <Progress value={t.prog} tone={t.prog === 100 ? 'success' : t.prog > 0 ? 'accent' : 'warning'} />
              </div>
              <Button size="sm" variant="secondary">
                {t.status === '완료' ? '수료증' : t.status === '미수강' ? '시작' : '계속'} <ChevronRight size={11} />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

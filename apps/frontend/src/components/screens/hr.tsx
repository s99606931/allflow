'use client';

import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/primitives';
import { useMe, useOrgUnits } from '@/lib/hooks/use-data';
import { Briefcase, CalendarClock, Plane, Award, Users } from 'lucide-react';
import { useState } from 'react';

const TABS = ['휴가 / 연차', '근태', '평가 / OKR', '1:1 미팅'] as const;
type Tab = typeof TABS[number];

/**
 * HR 화면 — 백엔드 HR 모듈 미연결.
 * 휴가/근태/OKR/1:1 데이터는 별도 BE 모듈 도입 후 연결.
 * 기본 정체성(이름/부서)과 조직 구조는 useMe / useOrgUnits 훅으로 실연결.
 */
export function HRPage() {
  const [tab, setTab] = useState<Tab>('휴가 / 연차');
  return (
    <div className="p-6 max-w-[1280px] mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-bold text-fg">인사 / HR</h2>
        <span className="text-[12px] text-fg-3">개인 인사정보 · 휴가 · 평가</span>
      </div>

      <ProfileBanner />

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

function ProfileBanner() {
  const meQuery = useMe();
  const orgQuery = useOrgUnits();
  const me = meQuery.data;
  const orgUnits = orgQuery.data ?? [];
  const myUnit = orgUnits.find(u => u.members.includes(me?.id ?? ''));

  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full grid place-items-center text-white font-bold text-[16px]"
             style={{ background: me?.color ?? '#5B6CFF' }}>
          {meQuery.isLoading ? '...' : (me?.initials ?? '—')}
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-bold text-fg">
            {meQuery.isLoading ? '로딩 중...' : (me?.name ?? '미인증')}
          </div>
          <div className="text-[12px] text-fg-2 mt-0.5">
            {me?.role ?? '—'} · {myUnit?.name ?? me?.dept ?? '소속 미정'}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-fg-3">
          <Users size={13} />
          <span>{orgQuery.isLoading ? '...' : `${orgUnits.length}개 조직 단위`}</span>
        </div>
      </CardBody>
    </Card>
  );
}

/* 휴가 ----------------------------------------------------------------- */
function LeaveTab() {
  return (
    <Card>
      <CardHeader><CardTitle>휴가 / 연차</CardTitle></CardHeader>
      <CardBody>
        <EmptyState
          icon={<Plane size={36} className="text-fg-3 opacity-50 mx-auto" />}
          title="휴가 모듈 백엔드 미연결"
          description="연차·병가·경조사 잔여 휴가, 팀 캘린더, 신청/결재 흐름은 별도 HR 백엔드 모듈 도입 후 활성화됩니다."
        />
      </CardBody>
    </Card>
  );
}

/* 근태 ----------------------------------------------------------------- */
function AttendanceTab() {
  return (
    <Card>
      <CardHeader><CardTitle>근태</CardTitle></CardHeader>
      <CardBody>
        <EmptyState
          icon={<CalendarClock size={36} className="text-fg-3 opacity-50 mx-auto" />}
          title="근태 모듈 백엔드 미연결"
          description="출퇴근 체크, 주간/월간 근무 시간, 지각·연장 통계는 BE 모듈 도입 후 노출됩니다."
        />
      </CardBody>
    </Card>
  );
}

/* 평가 / OKR --------------------------------------------------------- */
function EvalTab() {
  return (
    <Card>
      <CardHeader><CardTitle>평가 / OKR</CardTitle></CardHeader>
      <CardBody>
        <EmptyState
          icon={<Award size={36} className="text-fg-3 opacity-50 mx-auto" />}
          title="OKR / 평가 모듈 백엔드 미연결"
          description="분기별 OKR 진척도, 평가 일정, 셀프/동료/상위자 평가 흐름은 별도 모듈에서 다룹니다."
        />
      </CardBody>
    </Card>
  );
}

/* 1:1 ------------------------------------------------------------ */
function OneOnOneTab() {
  return (
    <Card>
      <CardHeader><CardTitle>1:1 미팅</CardTitle></CardHeader>
      <CardBody>
        <EmptyState
          icon={<Briefcase size={36} className="text-fg-3 opacity-50 mx-auto" />}
          title="1:1 모듈 백엔드 미연결"
          description="1:1 일정, 노트, AI 토픽 추천은 캘린더·문서 모듈과 연동 후 활성화됩니다."
        />
      </CardBody>
    </Card>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      {icon}
      <div className="text-[13px] font-semibold text-fg mt-3">{title}</div>
      <div className="text-[11.5px] text-fg-3 mt-1.5 max-w-md mx-auto">{description}</div>
    </div>
  );
}

'use client';

import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@/components/ui/primitives';
import { DateInput } from '@/components/ui/dialog';
import { useCancelLeave, useCreateLeave, useLeaveRequests, useUpdateLeave, type LeaveRequest } from '@/lib/hooks/use-hr';
import { useMe, useOrgUnits } from '@/lib/hooks/use-data';
import { Award, Briefcase, CalendarClock, Plane, Plus, Users, X, Pencil, Check } from 'lucide-react';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';
import { useState } from 'react';
import { toast } from 'sonner';

const TABS = ['휴가 / 연차', '근태', '평가 / OKR', '1:1 미팅'] as const;
type Tab = (typeof TABS)[number];

/**
 * HR 화면 — 휴가/연차 탭은 BE hrRoutes 실연결.
 * 근태/OKR/1:1 탭은 별도 모듈 도입 후 활성화.
 */
export function HRPage() {
  const [tab, setTab] = useState<Tab>('휴가 / 연차');
  const { data: leaves = [] } = useLeaveRequests();
  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;
  const approvedLeaves = leaves.filter(l => l.status === 'APPROVED').length;
  return (
    <div className="p-6 max-w-[1280px] mx-auto space-y-5">
      <AiGuideWidget
        systemContext={`HR — 휴가 신청 대기 ${pendingLeaves}건, 승인 ${approvedLeaves}건, 총 ${leaves.length}건`}
        hints={[
          pendingLeaves > 0 ? `휴가 승인 대기 ${pendingLeaves}건 처리 방법` : '연차 현황 알려줘',
          'OKR 달성률 점검해줘',
          '1:1 미팅 준비 도와줘',
        ]}
      />
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-bold text-fg">인사 / HR</h2>
        <span className="text-[12px] text-fg-3">개인 인사정보 · 휴가 · 평가</span>
      </div>

      <ProfileBanner />

      <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border w-fit">
        {TABS.map((t) => (
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
  const myUnit = orgUnits.find((u) => u.members.includes(me?.id ?? ''));

  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full grid place-items-center text-white font-bold text-[16px]"
          style={{ background: me?.color ?? '#5B6CFF' }}
        >
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

type LeaveType = LeaveRequest['type'];
type LeaveStatus = LeaveRequest['status'];

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ANNUAL: '연차',
  SICK: '병가',
  PERSONAL: '경조사',
  OTHER: '기타',
};

const STATUS_TONE: Record<LeaveStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

const STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELLED: '취소',
};

interface LeaveFormState {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

const INITIAL_FORM: LeaveFormState = {
  type: 'ANNUAL',
  startDate: '',
  endDate: '',
  reason: '',
};

function LeaveTab() {
  const { data: leaves, isLoading } = useLeaveRequests();
  const createLeave = useCreateLeave();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<LeaveFormState>(INITIAL_FORM);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createLeave.mutate(
      {
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setForm(INITIAL_FORM);
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>휴가 / 연차</CardTitle>
        <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? '취소' : '신청'}
        </Button>
      </CardHeader>
      <CardBody className="space-y-4">
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="border border-border rounded-md p-4 space-y-3 bg-bg-2"
          >
            <div className="text-[13px] font-semibold text-fg">휴가 신청</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11.5px] text-fg-2">유형</label>
                <select
                  className="h-8 px-2 rounded-md border border-border bg-bg-elev text-[12.5px] text-fg"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LeaveType }))}
                >
                  {(Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]).map((t) => (
                    <option key={t} value={t}>
                      {LEAVE_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11.5px] text-fg-2">시작일</label>
                <DateInput
                  required
                  aria-label="시작일"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11.5px] text-fg-2">종료일</label>
                <DateInput
                  required
                  aria-label="종료일"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[11.5px] text-fg-2">사유 (선택)</label>
                <textarea
                  rows={2}
                  className="px-2 py-1.5 rounded-md border border-border bg-bg-elev text-[12.5px] text-fg resize-none"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={createLeave.isPending}>
                {createLeave.isPending ? '제출 중...' : '제출'}
              </Button>
            </div>
            {createLeave.isError && (
              <div className="text-[11.5px] text-danger">{String(createLeave.error)}</div>
            )}
          </form>
        )}

        {isLoading && (
          <div className="py-8 text-center text-[12.5px] text-fg-3">로딩 중...</div>
        )}

        {!isLoading && (!leaves || leaves.length === 0) && !showForm && (
          <EmptyState
            icon={<Plane size={36} className="text-fg-3 opacity-50 mx-auto" />}
            title="휴가 신청 내역이 없습니다"
            description="위의 신청 버튼을 눌러 연차·병가·경조사 휴가를 신청하세요."
          />
        )}

        {!isLoading && leaves && leaves.length > 0 && (
          <LeaveList
            leaves={leaves}
            onReapply={(leave) => {
              setForm({ type: leave.type, startDate: leave.startDate.slice(0, 10), endDate: leave.endDate.slice(0, 10), reason: leave.reason ?? '' });
              setShowForm(true);
            }}
          />
        )}
      </CardBody>
    </Card>
  );
}

function LeaveList({ leaves, onReapply }: { leaves: LeaveRequest[]; onReapply: (leave: LeaveRequest) => void }) {
  const cancelLeave = useCancelLeave();
  return (
    <div className="space-y-2">
      {leaves.map((leave) => (
        <LeaveRow key={leave.id} leave={leave} cancelLeave={cancelLeave} onReapply={onReapply} />
      ))}
    </div>
  );
}

interface LeaveRowProps {
  leave: LeaveRequest;
  cancelLeave: ReturnType<typeof useCancelLeave>;
  onReapply: (leave: LeaveRequest) => void;
}

function LeaveRow({ leave, cancelLeave, onReapply }: LeaveRowProps) {
  const updateLeave = useUpdateLeave();
  const [editing, setEditing] = useState(false);
  const [editStart, setEditStart] = useState(leave.startDate.slice(0, 10));
  const [editEnd, setEditEnd] = useState(leave.endDate.slice(0, 10));
  const [editReason, setEditReason] = useState(leave.reason ?? '');
  const start = leave.startDate.slice(0, 10);
  const end = leave.endDate.slice(0, 10);

  if (editing) {
    return (
      <div className="rounded-md border border-accent/40 bg-accent-soft/20 px-3 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-semibold text-fg">{LEAVE_TYPE_LABEL[leave.type]} 수정</span>
          <button type="button" onClick={() => setEditing(false)} className="ml-auto text-fg-3 hover:text-fg"><X size={12} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10.5px] text-fg-3 mb-1">시작일</div>
            <DateInput value={editStart} onChange={e => setEditStart(e.target.value)} className="w-full" />
          </div>
          <div>
            <div className="text-[10.5px] text-fg-3 mb-1">종료일</div>
            <DateInput value={editEnd} onChange={e => setEditEnd(e.target.value)} className="w-full" />
          </div>
        </div>
        <input
          type="text"
          value={editReason}
          onChange={e => setEditReason(e.target.value)}
          placeholder="사유 (선택)"
          className="w-full h-8 px-2.5 rounded border border-border bg-bg text-[12px] text-fg focus:outline-none focus:border-accent"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>취소</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={updateLeave.isPending}
            onClick={async () => {
              try {
                await updateLeave.mutateAsync({ id: leave.id, data: { startDate: editStart, endDate: editEnd, reason: editReason || undefined } });
                setEditing(false);
              } catch {
                toast.error('휴가 수정에 실패했습니다');
              }
            }}
          >
            <Check size={12} /> 저장
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-bg-2">
      <Badge tone={STATUS_TONE[leave.status]}>{STATUS_LABEL[leave.status]}</Badge>
      <span className="text-[12.5px] font-medium text-fg">{LEAVE_TYPE_LABEL[leave.type]}</span>
      <span className="text-[12px] text-fg-2">
        {start} ~ {end}
      </span>
      {leave.reason && (
        <span className="text-[11.5px] text-fg-3 truncate flex-1">{leave.reason}</span>
      )}
      {leave.approver && (
        <span className="text-[11px] text-fg-3 ml-auto shrink-0">
          승인자: {leave.approver.name}
        </span>
      )}
      {leave.status === 'PENDING' && (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] text-accent hover:underline flex items-center gap-1"
          >
            <Pencil size={10} /> 수정
          </button>
          <button
            onClick={() => cancelLeave.mutate(leave.id)}
            disabled={cancelLeave.isPending}
            className="text-[11px] text-danger hover:underline"
          >
            취소
          </button>
        </>
      )}
      {leave.status === 'REJECTED' && (
        <button
          onClick={() => onReapply(leave)}
          className="text-[11px] text-accent hover:underline"
        >
          재신청
        </button>
      )}
    </div>
  );
}

/* 근태 ----------------------------------------------------------------- */
function AttendanceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>근태</CardTitle>
      </CardHeader>
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
      <CardHeader>
        <CardTitle>평가 / OKR</CardTitle>
      </CardHeader>
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
      <CardHeader>
        <CardTitle>1:1 미팅</CardTitle>
      </CardHeader>
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

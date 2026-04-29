'use client';

import { Card, CardHeader, CardTitle, CardBody, Avatar, AvatarStack, Badge, Button, IconButton, StatusDot } from '@/components/ui/primitives';
import { userById, TEAM } from '@/lib/fixtures';
import {
  FileSignature, Plus, Filter, Search, Inbox, Send, CheckCircle2, XCircle, Clock,
  Plane, Receipt, ShoppingCart, FileText, Stamp, ChevronRight, Sparkles, MoreHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { ApprovalForm } from '@/components/dialogs/approval-form';
import { useApprovalMutations } from '@/lib/hooks/use-data';
import { toast } from 'sonner';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'draft' | 'recalled';
type ApprovalKind = 'leave' | 'expense' | 'purchase' | 'general' | 'overtime';

interface Approval {
  id: string;
  kind: ApprovalKind;
  title: string;
  requester: string;
  amount?: string;
  period?: string;
  status: ApprovalStatus;
  current: number;          // 현재 결재 단계 인덱스
  approvers: string[];      // 결재 라인
  submitted: string;
  urgent?: boolean;
  attachments?: number;
}

const APPROVALS: Approval[] = [
  { id: 'AP-2614', kind: 'expense', title: '4월 출장비 정산 (부산 — 고객사 미팅)', requester: 'u5', amount: '342,500원', status: 'pending', current: 1, approvers: ['u5','me','u6'], submitted: '오늘 09:32', urgent: true, attachments: 3 },
  { id: 'AP-2613', kind: 'leave', title: '연차 휴가 (5/6 ~ 5/7)', requester: 'u1', period: '2일', status: 'pending', current: 0, approvers: ['u1','me','u6'], submitted: '오늘 08:45' },
  { id: 'AP-2611', kind: 'purchase', title: '디자인팀 모니터 32" 4K 2대 구매', requester: 'u1', amount: '1,580,000원', status: 'pending', current: 1, approvers: ['u1','me','u6','admin'], submitted: '어제 17:20', attachments: 2 },
  { id: 'AP-2610', kind: 'overtime', title: '4/27 야간 근무 사전 신청', requester: 'u3', period: '4시간', status: 'pending', current: 0, approvers: ['u3','me'], submitted: '어제 14:15' },
  { id: 'AP-2607', kind: 'general', title: 'GPT-4o API 사용량 한도 상향 요청', requester: 'u2', amount: '월 $200', status: 'approved', current: 3, approvers: ['u2','me','u6','admin'], submitted: '4/26' },
  { id: 'AP-2603', kind: 'expense', title: '팀 회식 비용 (디자인팀 5명)', requester: 'u1', amount: '480,000원', status: 'approved', current: 2, approvers: ['u1','me','u6'], submitted: '4/25' },
  { id: 'AP-2598', kind: 'leave', title: '경조사 휴가 (모친상)', requester: 'u4', period: '5일', status: 'approved', current: 2, approvers: ['u4','me','u6'], submitted: '4/22' },
  { id: 'AP-2595', kind: 'purchase', title: 'Figma Organization 플랜 업그레이드', requester: 'u1', amount: '$45/seat × 12', status: 'rejected', current: 2, approvers: ['u1','me','u6'], submitted: '4/20' },
];

const KIND_META: Record<ApprovalKind, { icon: typeof Plane; label: string; color: string }> = {
  leave:    { icon: Plane,        label: '휴가',     color: 'oklch(0.65 0.16 220)' },
  expense:  { icon: Receipt,      label: '경비',     color: 'oklch(0.66 0.18 30)' },
  purchase: { icon: ShoppingCart, label: '구매',     color: 'oklch(0.62 0.18 280)' },
  general:  { icon: FileText,     label: '일반',     color: 'oklch(0.55 0.05 240)' },
  overtime: { icon: Clock,        label: '연장근무', color: 'oklch(0.68 0.16 60)' },
};

const STATUS_META: Record<ApprovalStatus, { tone: 'neutral' | 'warning' | 'success' | 'danger' | 'accent'; label: string }> = {
  draft:    { tone: 'neutral', label: '임시저장' },
  pending:  { tone: 'warning', label: '결재 대기' },
  approved: { tone: 'success', label: '승인 완료' },
  rejected: { tone: 'danger',  label: '반려' },
  recalled: { tone: 'neutral', label: '회수' },
};

const TABS = [
  { id: 'inbox',   label: '결재 대기',     icon: Inbox,  count: APPROVALS.filter(a => a.status === 'pending').length },
  { id: 'sent',    label: '내가 올린 결재', icon: Send,   count: APPROVALS.filter(a => a.requester === 'u5').length },
  { id: 'cc',      label: '참조 / 합의',   icon: FileText, count: 0 },
  { id: 'history', label: '처리 내역',     icon: CheckCircle2, count: 0 },
] as const;

type TabId = typeof TABS[number]['id'];

export function ApprovalsPage() {
  const [tab, setTab] = useState<TabId>('inbox');
  const [selected, setSelected] = useState<Approval | null>(APPROVALS[0]);
  const [createOpen, setCreateOpen] = useState(false);

  const list = tab === 'inbox' ? APPROVALS.filter(a => a.status === 'pending') :
               tab === 'history' ? APPROVALS.filter(a => a.status === 'approved' || a.status === 'rejected') :
               APPROVALS;

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Left — list */}
      <div className="w-[440px] border-r border-border flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <FileSignature size={18} className="text-accent" />
            <h2 className="text-[15px] font-bold text-fg">전자결재</h2>
            <div className="flex-1" />
            <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}><Plus size={13} /> 새 결재</Button>
            <ApprovalForm open={createOpen} onOpenChange={setCreateOpen} />
          </div>
          <button className="w-full h-8 px-2.5 rounded-md bg-bg-2 hover:bg-hover border border-border text-[12px] text-fg-3 flex items-center gap-2 transition-colors">
            <Search size={13} /><span className="flex-1 text-left">결재 검색...</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-bg-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 h-10 px-2 text-[11.5px] font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  active ? 'border-accent text-fg bg-bg' : 'border-transparent text-fg-2 hover:text-fg-1'
                }`}
              >
                <Icon size={12} />
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-[10px] mono px-1 rounded ${active ? 'bg-accent text-accent-fg' : 'bg-bg-2 text-fg-2'}`}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto scroll">
          {list.map(a => {
            const Icon = KIND_META[a.kind].icon;
            const requester = userById(a.requester);
            const isActive = selected?.id === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className={`w-full text-left px-5 py-3.5 border-b border-border hover:bg-hover transition-colors ${isActive ? 'bg-accent-soft/40' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-md grid place-items-center shrink-0 text-white"
                    style={{ background: KIND_META[a.kind].color }}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] mono text-fg-3">{a.id}</span>
                      <Badge tone={STATUS_META[a.status].tone}>{STATUS_META[a.status].label}</Badge>
                      {a.urgent && <Badge tone="danger">긴급</Badge>}
                    </div>
                    <div className="text-[13px] font-semibold text-fg mt-1 line-clamp-2">{a.title}</div>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-fg-3">
                      {requester && <Avatar user={requester} size={16} />}
                      <span>{requester?.name}</span>
                      <span>·</span>
                      <span className="mono">{a.amount ?? a.period ?? '—'}</span>
                      <span className="ml-auto">{a.submitted}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right — detail */}
      {selected && <ApprovalDetail approval={selected} />}
    </div>
  );
}

function ApprovalDetail({ approval }: { approval: Approval }) {
  const Icon = KIND_META[approval.kind].icon;
  const requester = userById(approval.requester);
  const { decide } = useApprovalMutations();
  const [comment, setComment] = useState('');

  const onDecide = async (decision: 'approved' | 'rejected') => {
    try {
      await decide.mutateAsync({ id: approval.id, input: { decision, comment: comment || undefined } });
      setComment('');
    } catch {
      toast.error('처리에 실패했습니다');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scroll bg-bg">
      <div className="max-w-[820px] mx-auto p-8 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4 pb-5 border-b border-border">
          <div
            className="w-12 h-12 rounded-lg grid place-items-center shrink-0 text-white"
            style={{ background: KIND_META[approval.kind].color }}
          >
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[11.5px] text-fg-3 mb-1">
              <span className="mono">{approval.id}</span>
              <span>·</span>
              <span>{KIND_META[approval.kind].label}</span>
              <Badge tone={STATUS_META[approval.status].tone}>{STATUS_META[approval.status].label}</Badge>
              {approval.urgent && <Badge tone="danger">긴급</Badge>}
            </div>
            <h1 className="text-[20px] font-bold text-fg leading-tight">{approval.title}</h1>
            <div className="flex items-center gap-2 mt-2.5 text-[12px] text-fg-2">
              {requester && <Avatar user={requester} size={20} />}
              <span className="font-medium text-fg-1">{requester?.name}</span>
              <span>·</span>
              <span>{requester?.dept}</span>
              <span>·</span>
              <span>{approval.submitted}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton size="sm"><MoreHorizontal size={14} /></IconButton>
          </div>
        </div>

        {/* AI summary */}
        <Card className="bg-accent-soft/30 border-accent/30">
          <CardBody className="p-4">
            <div className="flex items-start gap-2.5">
              <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
              <div className="text-[12.5px] text-fg-1 leading-relaxed">
                <span className="font-semibold text-accent-strong">AI 요약</span> · 이번 분기 동일 신청자 누적 {approval.kind === 'leave' ? '연차 6일 사용 (잔여 9일)' : '경비 84만원 (예산 65% 소진)'}.
                회사 정책 위배 사항 없음. 유사 결재는 평균 <strong>4.2시간</strong> 내 처리되었습니다.
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Approval line */}
        <Card>
          <CardHeader><CardTitle>결재 라인</CardTitle></CardHeader>
          <CardBody>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {approval.approvers.map((aid, i) => {
                const u = aid === 'admin' ? { id: 'admin', name: '관리팀', initials: '관', color: '#A66CFF', dept: '관리' } as const : userById(aid);
                if (!u) return null;
                const isCurrent = i === approval.current && approval.status === 'pending';
                const isDone = i < approval.current || (approval.status === 'approved' && i <= approval.current);
                const isRejected = approval.status === 'rejected' && i === approval.current;
                const role = i === 0 ? '신청' : i === approval.approvers.length - 1 ? '최종' : `${i}차`;

                return (
                  <div key={aid} className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <Avatar user={u} size={36} />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full grid place-items-center ring-2 ring-bg ${
                          isDone ? 'bg-success text-white' :
                          isRejected ? 'bg-danger text-white' :
                          isCurrent ? 'bg-warning text-white animate-pulse' :
                          'bg-bg-2 text-fg-3'
                        }`}>
                          {isDone ? <CheckCircle2 size={10} /> : isRejected ? <XCircle size={10} /> : isCurrent ? <Clock size={10} /> : null}
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold text-fg mt-1.5">{u.name}</div>
                      <div className="text-[9px] text-fg-3">{role} · {('dept' in u ? u.dept : '') ?? ''}</div>
                    </div>
                    {i < approval.approvers.length - 1 && (
                      <ChevronRight size={14} className="text-fg-3 mt-[-22px]" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Body */}
        <Card>
          <CardHeader><CardTitle>신청 내용</CardTitle></CardHeader>
          <CardBody className="space-y-4 text-[13px] leading-relaxed">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                ['금액 / 기간', approval.amount ?? approval.period ?? '—'],
                ['신청 유형', KIND_META[approval.kind].label],
                ['프로젝트', '모바일 앱 v3.0 리뉴얼'],
                ['예상 처리일', approval.urgent ? '오늘 (긴급)' : '1영업일'],
                ['귀속 부서', requester?.dept ?? '—'],
                ['예산 코드', 'OPS-MKT-2026-Q2'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[11px] text-fg-3 mb-1">{k}</div>
                  <div className="text-[13px] font-medium text-fg">{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[11px] text-fg-3 mb-1.5">상세 내용</div>
              <div className="p-3 rounded-md bg-bg-1 border border-border text-fg-1">
                4월 25일 부산 출장 — CJ ENM 미팅 참석 (KTX 왕복 + 1박 숙박 + 식대). 영수증 3건 첨부했습니다. 미팅 결과는 <a className="text-accent underline">회의록 #DOC-204</a> 참조.
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        {approval.status === 'pending' && (
          <div className="sticky bottom-4 flex items-center gap-2 p-3 rounded-lg border border-border bg-bg-elev shadow-pop">
            <textarea
              aria-label="결재 의견"
              placeholder="의견 (선택)..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="flex-1 h-9 px-3 py-2 rounded-md bg-bg-1 border border-border text-[12.5px] resize-none focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <Button variant="secondary" size="md" onClick={() => onDecide('rejected')} disabled={decide.isPending}>
              <XCircle size={13} /> 반려
            </Button>
            <Button variant="secondary" size="md">보류</Button>
            <Button variant="primary" size="md" onClick={() => onDecide('approved')} disabled={decide.isPending}>
              <Stamp size={13} /> 승인
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

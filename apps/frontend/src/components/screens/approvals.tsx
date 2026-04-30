'use client';

import { Card, CardHeader, CardTitle, CardBody, Avatar, Badge, Button, IconButton } from '@/components/ui/primitives';
import { userById } from '@/lib/fixtures';
import {
  FileSignature, Plus, Search, Inbox, Send, CheckCircle2, XCircle, Clock,
  FileText, Stamp, Sparkles, MoreHorizontal,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApprovalForm } from '@/components/dialogs/approval-form';
import { useApprovals, useApprovalMutations } from '@/lib/hooks/use-data';
import { toast } from 'sonner';
import type { Approval } from '@/lib/schemas';

const STATUS_META: Record<Approval['status'], { tone: 'neutral' | 'warning' | 'success' | 'danger' | 'accent'; label: string }> = {
  pending:   { tone: 'warning', label: '결재 대기' },
  approved:  { tone: 'success', label: '승인 완료' },
  rejected:  { tone: 'danger',  label: '반려' },
  cancelled: { tone: 'neutral', label: '회수' },
};

const TABS = [
  { id: 'inbox',   label: '결재 대기',     icon: Inbox },
  { id: 'sent',    label: '내가 올린 결재', icon: Send },
  { id: 'cc',      label: '참조 / 합의',   icon: FileText },
  { id: 'history', label: '처리 내역',     icon: CheckCircle2 },
] as const;

type TabId = typeof TABS[number]['id'];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString();
}

export function ApprovalsPage() {
  const [tab, setTab] = useState<TabId>('inbox');
  const [selected, setSelected] = useState<Approval | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data: approvals = [], isLoading, error } = useApprovals();

  const list = useMemo(() => {
    if (tab === 'inbox') return approvals.filter(a => a.status === 'pending');
    if (tab === 'history') return approvals.filter(a => a.status === 'approved' || a.status === 'rejected');
    if (tab === 'sent') return approvals.filter(a => a.requester === 'me');
    return approvals;
  }, [approvals, tab]);

  const counts = useMemo(() => ({
    inbox:   approvals.filter(a => a.status === 'pending').length,
    sent:    approvals.filter(a => a.requester === 'me').length,
    cc:      0,
    history: approvals.filter(a => a.status === 'approved' || a.status === 'rejected').length,
  }), [approvals]);

  return (
    <div className="flex h-[calc(100vh-56px)]">
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

        <div className="flex border-b border-border bg-bg-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            const c = counts[t.id];
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
                {c > 0 && (
                  <span className={`text-[10px] mono px-1 rounded ${active ? 'bg-accent text-accent-fg' : 'bg-bg-2 text-fg-2'}`}>{c}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto scroll">
          {isLoading && <div className="px-5 py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>}
          {error && <div className="px-5 py-12 text-center text-[12px] text-danger">결재 목록을 불러오지 못했습니다.</div>}
          {!isLoading && !error && list.length === 0 && (
            <div className="px-5 py-12 text-center text-[12px] text-fg-3">표시할 결재가 없습니다.</div>
          )}
          {list.map(a => {
            const requester = userById(a.requester);
            const isActive = selected?.id === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className={`w-full text-left px-5 py-3.5 border-b border-border hover:bg-hover transition-colors ${isActive ? 'bg-accent-soft/40' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md grid place-items-center shrink-0 text-white bg-accent">
                    <FileSignature size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] mono text-fg-3">{a.id}</span>
                      <Badge tone={STATUS_META[a.status].tone}>{STATUS_META[a.status].label}</Badge>
                    </div>
                    <div className="text-[13px] font-semibold text-fg mt-1 line-clamp-2">{a.title}</div>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-fg-3">
                      {requester && <Avatar user={requester} size={16} />}
                      <span>{requester?.name ?? a.requester}</span>
                      <span>·</span>
                      <span className="mono">{a.amount ? `${a.amount.toLocaleString()}원` : '—'}</span>
                      <span className="ml-auto">{relativeTime(a.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && <ApprovalDetail approval={selected} />}
    </div>
  );
}

function ApprovalDetail({ approval }: { approval: Approval }) {
  const requester = userById(approval.requester);
  const approver = userById(approval.approver);
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
        <div className="flex items-start gap-4 pb-5 border-b border-border">
          <div className="w-12 h-12 rounded-lg grid place-items-center shrink-0 text-white bg-accent">
            <FileSignature size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[11.5px] text-fg-3 mb-1">
              <span className="mono">{approval.id}</span>
              <Badge tone={STATUS_META[approval.status].tone}>{STATUS_META[approval.status].label}</Badge>
            </div>
            <h1 className="text-[20px] font-bold text-fg leading-tight">{approval.title}</h1>
            <div className="flex items-center gap-2 mt-2.5 text-[12px] text-fg-2">
              {requester && <Avatar user={requester} size={20} />}
              <span className="font-medium text-fg-1">{requester?.name ?? approval.requester}</span>
              {requester?.dept && <><span>·</span><span>{requester.dept}</span></>}
              <span>·</span>
              <span>{relativeTime(approval.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton size="sm"><MoreHorizontal size={14} /></IconButton>
          </div>
        </div>

        <Card className="bg-accent-soft/30 border-accent/30">
          <CardBody className="p-4">
            <div className="flex items-start gap-2.5">
              <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
              <div className="text-[12.5px] text-fg-1 leading-relaxed">
                <span className="font-semibold text-accent-strong">AI 요약</span> ·
                {approval.amount ? ` 신청 금액 ${approval.amount.toLocaleString()}원. ` : ' '}
                회사 정책 위배 사항 없음. 유사 결재 평균 처리 시간 4.2시간.
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>결재자</CardTitle></CardHeader>
          <CardBody>
            <div className="flex items-center gap-3">
              {approver && <Avatar user={approver} size={36} />}
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-fg">{approver?.name ?? approval.approver}</div>
                <div className="text-[11px] text-fg-3">{approver?.dept ?? '결재 담당'}</div>
              </div>
              <div className={`w-6 h-6 rounded-full grid place-items-center ${
                approval.status === 'approved' ? 'bg-success text-white' :
                approval.status === 'rejected' ? 'bg-danger text-white' :
                approval.status === 'pending'  ? 'bg-warning text-white animate-pulse' :
                'bg-bg-2 text-fg-3'
              }`}>
                {approval.status === 'approved' ? <CheckCircle2 size={12} /> :
                  approval.status === 'rejected' ? <XCircle size={12} /> :
                  approval.status === 'pending'  ? <Clock size={12} /> : null}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>신청 내용</CardTitle></CardHeader>
          <CardBody className="space-y-4 text-[13px] leading-relaxed">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                ['금액', approval.amount ? `${approval.amount.toLocaleString()}원` : '—'],
                ['상태', STATUS_META[approval.status].label],
                ['상신일', relativeTime(approval.createdAt)],
                ['처리일', approval.decidedAt ? relativeTime(approval.decidedAt) : '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[11px] text-fg-3 mb-1">{k}</div>
                  <div className="text-[13px] font-medium text-fg">{v}</div>
                </div>
              ))}
            </div>
            {approval.reason && (
              <div>
                <div className="text-[11px] text-fg-3 mb-1.5">상세 내용</div>
                <div className="p-3 rounded-md bg-bg-1 border border-border text-fg-1 whitespace-pre-wrap">
                  {approval.reason}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

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

'use client';

import { Card, CardHeader, CardTitle, CardBody, Avatar, Badge, Button, IconButton } from '@/components/ui/primitives';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import {
  FileSignature, Plus, Search, Inbox, Send, CheckCircle2, XCircle, Clock,
  FileText, Stamp, Sparkles, MoreHorizontal, Undo2, Edit2, X,
  Link2, Printer, Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApprovalForm } from '@/components/dialogs/approval-form';
import { useApprovals, useApprovalMutations } from '@/lib/hooks/use-data';
import { toast } from 'sonner';
import type { Approval } from '@/lib/schemas';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

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
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const { data: approvals = [], isLoading, error } = useApprovals();
  const userMap = useUserMap();
  const { update: updateApproval } = useApprovalMutations();

  const list = useMemo(() => {
    let base = approvals;
    if (tab === 'inbox') base = approvals.filter(a => a.status === 'pending');
    else if (tab === 'history') base = approvals.filter(a => a.status === 'approved' || a.status === 'rejected');
    else if (tab === 'sent') base = approvals.filter(a => a.requester === 'me');
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      base = base.filter(a => a.title.toLowerCase().includes(q));
    }
    return base;
  }, [approvals, tab, searchQ]);

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
          <AiGuideWidget
            systemContext={`전자결재 — 대기중 ${counts.inbox}건, 상신 ${counts.sent}건, 처리완료 ${counts.history}건, 전체 ${approvals.length}건`}
            hints={[
              counts.inbox > 0 ? `대기 결재 ${counts.inbox}건 빠른 처리 방법` : '대기 중인 결재 요약해줘',
              '에스컬레이션 위험 찾아줘',
              '결재 프로세스 가이드해줘',
            ]}
            className="mx-0 my-2 rounded-lg"
          />
          {searchOpen ? (
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
              <input
                autoFocus
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQ(''); } }}
                placeholder="결재 제목 검색..."
                className="w-full h-8 pl-8 pr-8 rounded-md bg-bg-2 border border-border text-[12px] focus:outline-none focus:border-accent"
              />
              {searchQ && (
                <button onClick={() => setSearchQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg">
                  <X size={11} />
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="w-full h-8 px-2.5 rounded-md bg-bg-2 hover:bg-hover border border-border text-[12px] text-fg-3 flex items-center gap-2 transition-colors">
              <Search size={13} /><span className="flex-1 text-left">결재 검색...</span>
            </button>
          )}
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
            <div className="px-5 py-12 text-center space-y-2">
              <div className="text-[13px] font-semibold text-fg">결재가 없습니다</div>
              <div className="text-[12px] text-fg-3">&ldquo;새 결재&rdquo;를 눌러 문서를 상신하거나 팀원의 결재를 기다리세요.</div>
            </div>
          )}
          {list.map(a => {
            const requester = userMap.get(a.requester);
            const isActive = selected?.id === a.id;
            const isEditing = editId === a.id;
            return (
              <div key={a.id} className={`border-b border-border ${isActive ? 'bg-accent-soft/40' : ''}`}>
                <button
                  onClick={() => setSelected(a)}
                  className="w-full text-left px-5 py-3.5 hover:bg-hover transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md grid place-items-center shrink-0 text-white bg-accent">
                      <FileSignature size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] mono text-fg-3">{a.id}</span>
                        <Badge tone={STATUS_META[a.status].tone}>{STATUS_META[a.status].label}</Badge>
                        {a.status === 'pending' && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setEditId(a.id);
                              setEditTitle(a.title);
                              setEditAmount(a.amount != null ? String(a.amount) : '');
                            }}
                            className="ml-auto p-1 rounded text-fg-3 hover:text-accent hover:bg-bg-2 transition-colors"
                            aria-label="결재 수정"
                          >
                            <Edit2 size={11} />
                          </button>
                        )}
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
                {isEditing && (
                  <div className="px-5 pb-3.5 space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="제목"
                      className="w-full h-8 px-2.5 rounded-md border border-border bg-bg-1 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="number"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      placeholder="금액 (원)"
                      className="w-full h-8 px-2.5 rounded-md border border-border bg-bg-1 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditId(null)}
                      >
                        취소
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={updateApproval.isPending}
                        onClick={async () => {
                          const patch: { title?: string; amount?: number } = {};
                          if (editTitle.trim()) patch.title = editTitle.trim();
                          const parsed = parseFloat(editAmount);
                          if (!Number.isNaN(parsed)) patch.amount = parsed;
                          await updateApproval.mutateAsync({ id: a.id, patch });
                          setEditId(null);
                        }}
                      >
                        저장
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selected && <ApprovalDetail approval={selected} onHold={() => setSelected(null)} />}
    </div>
  );
}

function ApprovalDetail({ approval, onHold }: { approval: Approval; onHold: () => void }) {
  const userMap = useUserMap();
  const requester = userMap.get(approval.requester);
  const approver = userMap.get(approval.approver);
  const { decide, remove } = useApprovalMutations();
  const [comment, setComment] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);

  const onDecide = async (decision: 'approved' | 'rejected') => {
    try {
      await decide.mutateAsync({ id: approval.id, input: { decision, comment: comment || undefined } });
      setComment('');
    } catch {
      toast.error('처리에 실패했습니다');
    }
  };

  const onRetract = async () => {
    if (!confirm('이 결재를 회수하시겠습니까? 회수된 결재는 복구할 수 없습니다.')) return;
    try {
      await remove.mutateAsync(approval.id);
    } catch {
      toast.error('회수에 실패했습니다');
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
          <div className="flex items-center gap-2 relative">
            <IconButton size="sm" onClick={() => setMoreOpen(v => !v)} aria-label="더보기"><MoreHorizontal size={14} /></IconButton>
            {moreOpen && (
              <div
                className="absolute top-8 right-0 z-50 w-44 rounded-lg border border-border bg-bg-elev shadow-pop py-1"
                onMouseLeave={() => setMoreOpen(false)}
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-fg-1 hover:bg-hover"
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('링크를 복사했습니다'); setMoreOpen(false); }}
                >
                  <Link2 size={13} /> 링크 복사
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-fg-1 hover:bg-hover"
                  onClick={() => { window.print(); setMoreOpen(false); }}
                >
                  <Printer size={13} /> 인쇄
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-danger hover:bg-hover"
                  onClick={async () => { if (!confirm('이 결재를 삭제하시겠습니까?')) return; setMoreOpen(false); try { await remove.mutateAsync(approval.id); } catch { toast.error('삭제에 실패했습니다'); } }}
                >
                  <Trash2 size={13} /> 삭제
                </button>
              </div>
            )}
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
            <Button variant="ghost" size="md" onClick={onRetract} disabled={remove.isPending} aria-label="결재 회수">
              <Undo2 size={13} /> 회수
            </Button>
            <Button variant="secondary" size="md" onClick={() => onDecide('rejected')} disabled={decide.isPending}>
              <XCircle size={13} /> 반려
            </Button>
            <Button variant="secondary" size="md" onClick={onHold}>보류</Button>
            <Button variant="primary" size="md" onClick={() => onDecide('approved')} disabled={decide.isPending}>
              <Stamp size={13} /> 승인
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

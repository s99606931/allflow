'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button, Avatar, AvatarStack, Progress } from '@/components/ui/primitives';
import { ApprovalForm } from '@/components/dialogs/approval-form';
import { TEAM, ME, userById } from '@/lib/fixtures';
import {
  Inbox, Send, Archive, FileCheck2, Filter, Search, Plus, ChevronRight, Paperclip,
  Calendar, DollarSign, ShoppingCart, FileText, Plane, Sparkles, Clock,
  CheckCircle2, XCircle, MoreHorizontal, ArrowRight, AlertCircle, MessageSquare,
} from 'lucide-react';

type ApprovalKind = 'leave' | 'expense' | 'purchase' | 'document' | 'business-trip' | 'overtime';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'in-progress' | 'returned';

interface ApprovalDoc {
  id: string;
  kind: ApprovalKind;
  title: string;
  drafter: string;
  date: string;
  status: ApprovalStatus;
  amount?: string;
  duration?: string;
  urgent?: boolean;
  /** my position in the chain. 0 = my turn, 1 = next, -1 = already passed */
  myStep?: number;
  steps: { who: string; role: string; state: 'done' | 'current' | 'pending'; at?: string; comment?: string }[];
  attachments?: number;
  comments?: number;
  description?: string;
}

const APPROVALS: ApprovalDoc[] = [
  {
    id: 'AP-2041', kind: 'expense', title: '4월 출장비 정산 — 부산 클라이언트 미팅',
    drafter: 'u1', date: '2026-04-26', status: 'pending', amount: '₩342,500', urgent: true, myStep: 0,
    steps: [
      { who: 'u1', role: '기안', state: 'done', at: '04-26 09:30' },
      { who: 'me', role: '팀장 결재', state: 'current' },
      { who: 'u6', role: 'CTO 승인', state: 'pending' },
      { who: 'u2', role: '재무팀 처리', state: 'pending' },
    ],
    attachments: 5, comments: 2, description: 'KTX 왕복 (₩119,200) + 호텔 1박 (₩158,000) + 식대 (₩65,300)',
  },
  {
    id: 'AP-2040', kind: 'leave', title: '연차 휴가 신청 — 5/2 (금)', drafter: 'u4',
    date: '2026-04-26', status: 'pending', duration: '1일 (8시간)', myStep: 0,
    steps: [
      { who: 'u4', role: '기안', state: 'done', at: '04-26 14:12' },
      { who: 'me', role: '팀장 결재', state: 'current' },
      { who: 'u6', role: 'HR 처리', state: 'pending' },
    ],
    attachments: 0, comments: 0, description: '잔여 연차 12일 → 사용 후 11일',
  },
  {
    id: 'AP-2039', kind: 'purchase', title: '디자인팀 Figma Enterprise 좌석 5개 구매',
    drafter: 'u1', date: '2026-04-25', status: 'in-progress', amount: '$225/월', myStep: 1,
    steps: [
      { who: 'u1', role: '기안', state: 'done', at: '04-25 11:08' },
      { who: 'u5', role: '팀장 결재', state: 'done', at: '04-25 16:40', comment: '디자이너 추가 채용에 따른 합리적 요청' },
      { who: 'me', role: '재무 검토', state: 'current' },
      { who: 'u6', role: 'CTO 최종', state: 'pending' },
    ],
    attachments: 2, comments: 4, description: '연 환산 ₩3,580,000 (할인가). 기존 Pro 좌석 → Enterprise로 업그레이드.',
  },
  {
    id: 'AP-2038', kind: 'business-trip', title: '서울 → 도쿄 출장 — Notion 컨퍼런스 참가',
    drafter: 'u2', date: '2026-04-24', status: 'pending', duration: '3일 (5/14~5/16)', amount: '₩1,820,000', myStep: 0,
    steps: [
      { who: 'u2', role: '기안', state: 'done', at: '04-24 17:22' },
      { who: 'me', role: '팀장 결재', state: 'current' },
      { who: 'u6', role: 'CTO 승인', state: 'pending' },
    ],
    attachments: 3, comments: 1,
  },
  {
    id: 'AP-2037', kind: 'document', title: 'Q2 OKR 합의서 — 프로덕트팀',
    drafter: 'me', date: '2026-04-22', status: 'approved', myStep: -1,
    steps: [
      { who: 'me', role: '기안', state: 'done', at: '04-22 10:00' },
      { who: 'u6', role: 'CEO 승인', state: 'done', at: '04-23 09:14', comment: '동의합니다. 마일스톤 별 진척도 주간 리뷰 부탁드려요.' },
    ],
    attachments: 1, comments: 3,
  },
  {
    id: 'AP-2036', kind: 'overtime', title: '4월 셋째 주 야간 근무 신청',
    drafter: 'u3', date: '2026-04-22', status: 'rejected', duration: '12시간', myStep: -1,
    steps: [
      { who: 'u3', role: '기안', state: 'done', at: '04-22 18:30' },
      { who: 'me', role: '팀장', state: 'done', at: '04-23 09:00', comment: '주 52시간 한도 초과. 다음 스프린트로 이관 권장.' },
    ],
    attachments: 0, comments: 1,
  },
  {
    id: 'AP-2035', kind: 'leave', title: '반차 신청 — 4/30 (오후)', drafter: 'u5',
    date: '2026-04-22', status: 'approved', duration: '0.5일', myStep: -1,
    steps: [
      { who: 'u5', role: '기안', state: 'done', at: '04-22 11:42' },
      { who: 'me', role: '팀장 결재', state: 'done', at: '04-22 13:05' },
      { who: 'u6', role: 'HR 처리', state: 'done', at: '04-22 15:18' },
    ],
  },
];

const KIND_META: Record<ApprovalKind, { label: string; icon: typeof FileCheck2; color: string }> = {
  leave:           { label: '휴가',       icon: Plane,        color: '#5B6CFF' },
  expense:         { label: '경비 정산',   icon: DollarSign,   color: '#34B27D' },
  purchase:        { label: '구매 요청',   icon: ShoppingCart, color: '#F2A93B' },
  document:        { label: '문서 결재',   icon: FileText,     color: '#A66CFF' },
  'business-trip': { label: '출장',       icon: Plane,        color: '#2A86E0' },
  overtime:        { label: '야근/특근',   icon: Clock,        color: '#FF7A6B' },
};

const STATUS_TONE = {
  pending:        { tone: 'warning' as const, label: '대기 중' },
  approved:       { tone: 'success' as const, label: '승인됨' },
  rejected:       { tone: 'danger'  as const, label: '반려됨' },
  'in-progress':  { tone: 'info'    as const, label: '진행 중' },
  returned:       { tone: 'neutral' as const, label: '회수' },
};

const TABS = [
  { id: 'inbox',     label: '받은 결재',  icon: Inbox },
  { id: 'sent',      label: '보낸 결재',  icon: Send },
  { id: 'cc',        label: '참조',       icon: MessageSquare },
  { id: 'archived',  label: '결재 완료',  icon: Archive },
] as const;

export default function ApprovalsPage() {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('inbox');
  const [active, setActive] = useState<ApprovalDoc>(APPROVALS[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const filtered = APPROVALS.filter(a => {
    if (tab === 'inbox')    return a.myStep === 0 || a.myStep === 1;
    if (tab === 'sent')     return a.drafter === 'me';
    if (tab === 'cc')       return false;
    if (tab === 'archived') return a.status === 'approved' || a.status === 'rejected';
    return true;
  });

  const counts = {
    inbox:    APPROVALS.filter(a => a.myStep === 0 || a.myStep === 1).length,
    pending:  APPROVALS.filter(a => a.status === 'pending').length,
    today:    3,
    avg:      '4.2시간',
  };

  return (
    <AppShell
      title="결재함"
      subtitle="전자결재 · 휴가 · 경비 · 구매 · 출장 · 문서"
      actions={
        <>
          <Button size="sm" variant="primary" onClick={() => { setCreateOpen(true); setSubmitted(false); }}>
            <Plus size={14} /> 새 결재
          </Button>
          <ApprovalForm open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => setSubmitted(true)} />
          {submitted && <span className="text-[12px] text-success ml-2">상신 완료</span>}
        </>
      }
    >
      <div className="p-6 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3">
          <KPI icon={Inbox}         label="내 결재 대기"   value={counts.inbox}   tone="warning" hint="2건은 1순위" />
          <KPI icon={Clock}         label="평균 결재 시간" value={counts.avg}                 hint="이번 달, 팀장 평균 6.8h" />
          <KPI icon={CheckCircle2}  label="이번 주 승인"   value="14건"           tone="success" hint="전주 대비 +3" />
          <KPI icon={Sparkles}      label="AI 자동 분류"   value="98%"            tone="info"   hint="기안 자동 분류 정확도" />
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Sidebar tabs */}
          <Card className="col-span-3 self-start">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
                <input placeholder="기안 검색" className="w-full h-8 pl-8 pr-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] text-fg placeholder:text-fg-3 outline-none focus:border-accent" />
              </div>
            </div>
            <div className="p-2">
              {TABS.map(t => {
                const Icon = t.icon;
                const sel = tab === t.id;
                const c = t.id === 'inbox' ? counts.inbox : null;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[12.5px] transition-colors ${sel ? 'bg-accent-soft text-accent-strong font-semibold' : 'text-fg-1 hover:bg-hover'}`}
                  >
                    <Icon size={14} /> <span className="flex-1 text-left">{t.label}</span>
                    {c !== null && c > 0 && <span className={`text-[10.5px] mono px-1.5 rounded ${sel ? 'bg-accent text-accent-fg' : 'bg-bg-2 text-fg-2'}`}>{c}</span>}
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-border">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-3 mb-2">템플릿</div>
              <div className="space-y-1">
                {(['leave','expense','purchase','business-trip','document','overtime'] as ApprovalKind[]).map(k => {
                  const m = KIND_META[k];
                  const Icon = m.icon;
                  return (
                    <button key={k} className="w-full flex items-center gap-2 px-2 h-7 rounded-md text-[12px] text-fg-1 hover:bg-hover transition-colors">
                      <span className="w-5 h-5 rounded grid place-items-center" style={{ background: m.color, color: 'white' }}>
                        <Icon size={10} />
                      </span>
                      <span className="flex-1 text-left">{m.label}</span>
                      <Plus size={11} className="text-fg-3" />
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* List */}
          <Card className="col-span-5 self-start">
            <CardHeader>
              <CardTitle>{TABS.find(t => t.id === tab)?.label} <span className="text-fg-3 mono ml-1">{filtered.length}</span></CardTitle>
              <button className="text-[11.5px] text-fg-3 hover:text-fg-1 inline-flex items-center gap-1"><Filter size={12} /> 필터</button>
            </CardHeader>
            <div>
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-fg-3 text-[13px]"><Archive size={24} className="mx-auto mb-2 opacity-40" />결재 문서가 없습니다.</div>
              ) : filtered.map(a => {
                const m = KIND_META[a.kind];
                const Icon = m.icon;
                const isActive = active.id === a.id;
                const drafter = userById(a.drafter);
                return (
                  <button key={a.id} onClick={() => setActive(a)} className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors ${isActive ? 'bg-accent-soft' : 'hover:bg-hover'}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded grid place-items-center shrink-0" style={{ background: m.color, color: 'white' }}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10.5px] mono text-fg-3">{a.id}</span>
                          {a.urgent && <Badge tone="danger" className="!h-[16px] !text-[9.5px]">긴급</Badge>}
                          <span className="text-[10.5px] text-fg-3 ml-auto">{a.date.slice(5)}</span>
                        </div>
                        <div className="text-[12.5px] font-medium text-fg truncate mb-1">{a.title}</div>
                        <div className="flex items-center gap-2 text-[11px] text-fg-3">
                          {drafter && <Avatar user={drafter} size={16} />}
                          <span>{drafter?.name}</span>
                          <span>·</span>
                          <Badge tone={STATUS_TONE[a.status].tone} className="!h-[16px] !text-[9.5px]">{STATUS_TONE[a.status].label}</Badge>
                          {a.amount && <><span>·</span><span className="mono">{a.amount}</span></>}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Detail */}
          <Card className="col-span-4 self-start sticky top-[72px]">
            <ApprovalDetail doc={active} />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function KPI({ icon: Icon, label, value, hint, tone }: { icon: typeof Inbox; label: string; value: React.ReactNode; hint?: string; tone?: 'warning'|'success'|'info'|'danger' }) {
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

function ApprovalDetail({ doc }: { doc: ApprovalDoc }) {
  const m = KIND_META[doc.kind];
  const Icon = m.icon;
  const drafter = userById(doc.drafter);

  return (
    <>
      <div className="p-5 border-b border-border">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded grid place-items-center shrink-0" style={{ background: m.color, color: 'white' }}>
            <Icon size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[10.5px] mono text-fg-3 mb-0.5">
              {doc.id}
              <span>·</span>
              <span>{m.label}</span>
              {doc.urgent && <Badge tone="danger" className="!h-[16px] !text-[9.5px]">긴급</Badge>}
            </div>
            <div className="text-[14.5px] font-semibold text-fg leading-snug">{doc.title}</div>
          </div>
          <button className="text-fg-3 hover:text-fg-1"><MoreHorizontal size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-4 text-[11.5px]">
          <Field label="기안자"><span className="flex items-center gap-1.5">{drafter && <Avatar user={drafter} size={16} />}{drafter?.name}</span></Field>
          <Field label="상태"><Badge tone={STATUS_TONE[doc.status].tone}>{STATUS_TONE[doc.status].label}</Badge></Field>
          <Field label="기안일">{doc.date}</Field>
          {doc.amount && <Field label="금액"><span className="mono font-semibold text-fg">{doc.amount}</span></Field>}
          {doc.duration && <Field label="기간"><span className="mono">{doc.duration}</span></Field>}
        </div>

        {doc.description && (
          <div className="mt-4 p-3 rounded-md bg-bg-1 border border-border text-[12px] text-fg-1 leading-relaxed">
            {doc.description}
          </div>
        )}
      </div>

      {/* Approval chain */}
      <div className="p-5 border-b border-border">
        <div className="text-[11.5px] font-semibold text-fg-2 mb-3 flex items-center gap-1.5">
          <FileCheck2 size={12} /> 결재 라인
        </div>
        <div className="space-y-2.5">
          {doc.steps.map((s, i) => {
            const u = s.who === 'me' ? ME : userById(s.who);
            const isCurrent = s.state === 'current';
            const isDone = s.state === 'done';
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center pt-0.5">
                  <div className={`w-5 h-5 rounded-full grid place-items-center text-[9.5px] font-bold border-2 ${isDone ? 'bg-success border-success text-white' : isCurrent ? 'bg-accent border-accent text-accent-fg animate-pulse' : 'bg-bg-1 border-border text-fg-3'}`}>
                    {isDone ? <CheckCircle2 size={11} /> : i + 1}
                  </div>
                  {i < doc.steps.length - 1 && <div className={`w-0.5 flex-1 mt-1 ${isDone ? 'bg-success' : 'bg-border'}`} style={{ minHeight: 18 }} />}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-1.5 text-[12px]">
                    {u && <Avatar user={u} size={18} />}
                    <span className="font-semibold text-fg">{u?.name}</span>
                    <span className="text-fg-3">· {s.role}</span>
                    {s.at && <span className="ml-auto text-[10.5px] mono text-fg-3">{s.at}</span>}
                  </div>
                  {s.comment && <div className="mt-1 text-[11.5px] text-fg-1 px-2 py-1.5 rounded bg-bg-1 border-l-2 border-accent">{s.comment}</div>}
                  {isCurrent && doc.steps[i].who === 'me' && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Button size="sm" variant="primary"><CheckCircle2 size={12} /> 승인</Button>
                      <Button size="sm" variant="secondary"><XCircle size={12} /> 반려</Button>
                      <Button size="sm" variant="ghost"><ArrowRight size={12} /> 회수</Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI insight */}
      <div className="p-4 border-b border-border bg-accent-soft/30 mx-5 my-4 rounded-md">
        <div className="flex items-start gap-2">
          <Sparkles size={13} className="text-accent mt-0.5" />
          <div className="text-[11.5px] text-fg-1 leading-relaxed">
            <span className="font-semibold text-accent-strong">AI 검토 </span>
            동일 항목 평균 결재 시간 <span className="mono font-semibold">3.8h</span>. 첨부 영수증 5건 모두 자동 OCR 검증 통과. 정책 위반 사항 없음.
          </div>
        </div>
      </div>

      {/* Attachments */}
      {(doc.attachments ?? 0) > 0 && (
        <div className="p-5 border-b border-border">
          <div className="text-[11.5px] font-semibold text-fg-2 mb-2 flex items-center gap-1.5">
            <Paperclip size={12} /> 첨부 파일 <span className="text-fg-3 mono">{doc.attachments}</span>
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: doc.attachments ?? 0 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 text-[11.5px] p-2 rounded-md bg-bg-1 border border-border">
                <div className="w-7 h-7 rounded bg-bg-2 grid place-items-center text-fg-2"><FileText size={12} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-fg-1 truncate">영수증_{(i + 1).toString().padStart(2, '0')}.pdf</div>
                  <div className="text-[10px] text-fg-3 mono">2{i + 1}4 KB · OCR 완료</div>
                </div>
                <button className="text-fg-3 hover:text-fg-1 text-[10.5px]">미리보기</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] text-fg-3 uppercase tracking-wider">{label}</span>
      <span className="text-fg-1">{children}</span>
    </div>
  );
}

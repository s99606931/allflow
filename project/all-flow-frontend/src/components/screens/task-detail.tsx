'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Avatar, Badge, Button, IconButton, StatusDot } from '@/components/ui/primitives';
import { CommentThread } from '@/components/comments/comment-thread';
import { PROJECTS, TASKS, userById } from '@/lib/fixtures';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Circle,
  Flag,
  Link2,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';

interface TaskDetailProps {
  taskId: string | null;
  onClose: () => void;
}

const SUB_TASKS = [
  { id: 1, text: '회원가입 단계별 화면 정의', done: true, who: 'u1' },
  { id: 2, text: '인터랙션 프로토타입 (Framer)', done: true, who: 'u1' },
  { id: 3, text: '디자인 QA + 다크모드 검수', done: false, who: 'u1' },
  { id: 4, text: '개발자 핸드오프 노트', done: false, who: 'me' },
];

const ACTIVITY_FEED = [
  { who: 'ai', kind: 'ai-summary', time: '방금 전',
    text: 'AI 요약: 이 태스크는 모바일 앱 v3.0 의 핵심 경로 중 하나로, 디자인 단계 80% 완료. 프론트엔드 의존성 1건(T-1029)이 차단 상태입니다.' },
  { who: 'u1', kind: 'attach', time: '12분 전', text: '디자인 시안 v2 를 첨부했습니다 (Figma)' },
  { who: 'u2', kind: 'comment', time: '38분 전', text: '@박서연 5번째 화면 motion easing 을 더 부드럽게 가능할까요?' },
  { who: 'me', kind: 'status', time: '2시간 전', text: '상태를 진행중으로 변경했습니다' },
];

export function TaskDetailDialog({ taskId, onClose }: TaskDetailProps) {
  const task = TASKS.find(t => t.id === taskId);

  if (!task) return null;
  const proj = PROJECTS.find(p => p.id === task.proj);
  const assignee = userById(task.assignee);

  return (
    <Dialog.Root open={!!taskId} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 fade-in" />
        <Dialog.Content className="fixed top-0 right-0 h-screen w-[720px] max-w-[100vw] bg-bg-elev border-l border-border z-50 shadow-pop flex flex-col fade-in">
          {/* Header */}
          <div className="h-14 px-5 border-b border-border flex items-center gap-2.5 shrink-0">
            <span className="px-1.5 h-5 rounded text-[10px] mono font-bold text-white" style={{ background: proj?.color }}>
              {proj?.code}
            </span>
            <span className="mono text-[12px] text-fg-3">{task.id}</span>
            <div className="flex-1" />
            <IconButton size="sm" aria-label="링크 복사"><Link2 size={14} /></IconButton>
            <IconButton size="sm" aria-label="외부 열기"><ArrowUpRight size={14} /></IconButton>
            <Dialog.Close asChild>
              <IconButton size="sm" aria-label="닫기"><X size={14} /></IconButton>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto scroll p-6 space-y-6">
            {/* Title */}
            <div>
              <h2 className="text-[20px] font-bold text-fg leading-tight">{task.title}</h2>
              <div className="flex items-center gap-3 mt-3">
                <StatusDot status={task.status} />
                <span className="text-fg-3">·</span>
                {task.priority === 'high' && <Badge tone="danger"><Flag size={10} /> 높음</Badge>}
                {task.priority === 'med' && <Badge tone="warning"><Flag size={10} /> 중간</Badge>}
                {task.priority === 'low' && <Badge tone="neutral"><Flag size={10} /> 낮음</Badge>}
                {task.tags.map(t => (
                  <span key={t} className="text-[11px] px-1.5 py-0.5 rounded bg-bg-2 text-fg-2 inline-flex items-center gap-1">
                    <Tag size={9} /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* AI summary */}
            <div className="rounded-lg bg-accent-soft border border-accent/20 p-3.5">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-accent text-accent-fg grid place-items-center shrink-0">
                  <Sparkles size={13} />
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-accent-strong mb-1">AI 컨텍스트 요약</div>
                  <p className="text-[12.5px] text-fg-1 leading-relaxed">
                    이 태스크는 <strong>모바일 앱 v3.0 리뉴얼</strong>의 핵심 경로 중 하나로, 디자인 단계 80% 완료.
                    프론트엔드 의존성 <strong className="mono">T-1029</strong>(iOS 푸시 알림)이 차단 상태이며,
                    해당 이슈가 풀리면 <strong>5/4 마감</strong> 안에 충분히 가능합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Properties */}
            <div className="grid grid-cols-2 gap-3">
              <Prop label="담당자" value={assignee && (
                <span className="flex items-center gap-2"><Avatar user={assignee} size={20} /><span className="text-[13px] text-fg">{assignee.name}</span></span>
              )} />
              <Prop label="마감" icon={Calendar} value={<span className="text-[13px] text-fg mono">{task.due}</span>} />
              <Prop label="프로젝트" value={
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: proj?.color }} />{proj?.name}</span>
              } />
              <Prop label="추정 공수" value={<span className="text-[13px] text-fg mono">8h</span>} />
            </div>

            {/* Description */}
            <Section title="설명">
              <p className="text-[13px] text-fg-1 leading-relaxed">
                온보딩 첫 진입 시 보여줄 5단계 인터랙션 프로토타입을 Framer 로 제작.
                각 단계는 좌→우 슬라이드 + 페이드 트랜지션, 마지막 화면에서 메인 대시보드로 자연스럽게 연결되도록 합니다.
                저사양 Android 디바이스 fallback 도 검토.
              </p>
            </Section>

            {/* Sub-tasks */}
            <Section title={`하위 태스크 (${SUB_TASKS.filter(s => s.done).length}/${SUB_TASKS.length})`}>
              <div className="space-y-1.5">
                {SUB_TASKS.map(s => {
                  const u = userById(s.who);
                  return (
                    <div key={s.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-hover">
                      {s.done ? <CheckCircle2 size={15} className="text-success" /> : <Circle size={15} className="text-fg-3" />}
                      <span className={`flex-1 text-[12.5px] ${s.done ? 'text-fg-3 line-through' : 'text-fg-1'}`}>{s.text}</span>
                      {u && <Avatar user={u} size={18} />}
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Activity */}
            <Section title="활동 + 댓글">
              <div className="space-y-3.5">
                {ACTIVITY_FEED.map((a, i) => {
                  const u = a.who === 'ai' ? null : userById(a.who);
                  return (
                    <div key={i} className="flex gap-2.5">
                      {u ? <Avatar user={u} size={26} /> : (
                        <div className="w-[26px] h-[26px] rounded-full bg-accent-soft text-accent-strong grid place-items-center shrink-0">
                          <Sparkles size={12} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[12.5px] font-semibold text-fg">{u?.name ?? 'AI 어시스턴트'}</span>
                          <span className="text-[10.5px] text-fg-3">{a.time}</span>
                        </div>
                        <div className={`text-[12.5px] mt-0.5 leading-relaxed ${a.kind === 'ai-summary' ? 'text-fg-1 italic' : 'text-fg-1'}`}>
                          {a.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="댓글">
              <CommentThread kind="task" parentId={task.id} />
            </Section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Prop({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="rounded-md border border-border bg-bg-1 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10.5px] text-fg-3 uppercase tracking-wider font-semibold mb-1">
        {Icon && <Icon size={11} />}
        {label}
      </div>
      <div className="text-[13px] text-fg">{value}</div>
    </div>
  );
}

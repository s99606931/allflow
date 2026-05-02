'use client';

import { Card, CardBody, CardHeader, CardTitle, Avatar, AvatarStack, Badge, Button, IconButton, Progress, StatusDot } from '@/components/ui/primitives';
import { useMe, useProjects, useTasks } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { CheckCircle2, Circle, MoreHorizontal, Sparkles, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TaskCreateDialog } from '@/components/dialogs/task-create-dialog';

export function DashboardPage() {
  const { data: me } = useMe();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const userMap = useUserMap();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const router = useRouter();

  const todoCount = tasks.filter(t => t.status !== 'done').length;
  const doneToday = tasks.filter(t => t.status === 'done').length;
  const doingCount = tasks.filter(t => t.status === 'doing').length;
  const reviewCount = tasks.filter(t => t.status === 'review').length;

  const greetingName = me?.name ?? '';

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">
      {/* Hero greeting */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-[22px] font-bold text-fg tracking-tight">
            안녕하세요{greetingName ? `, ${greetingName}님` : ''} 👋
          </h2>
          <p className="text-[13px] text-fg-2 mt-1">
            오늘 처리할 태스크 <strong className="text-fg">{todoCount}개</strong>,
            진행 중 <strong className="text-fg">{doingCount}건</strong>,
            검토 대기 <strong className="text-fg">{reviewCount}건</strong>이 있어요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setTaskDialogOpen(true)}><Plus size={14} /> 태스크 추가</Button>
          <Button variant="primary" onClick={() => router.push('/ai-auto')}><Sparkles size={14} /> AI에게 요청</Button>
        </div>
        <TaskCreateDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '오늘 완료', value: String(doneToday) },
          { label: '진행 중', value: String(doingCount) },
          { label: '리뷰 대기', value: String(reviewCount) },
          { label: '전체 프로젝트', value: String(projects.length) },
        ].map(m => (
          <Card key={m.label}>
            <CardBody>
              <div className="text-[12px] text-fg-2">{m.label}</div>
              <div className="flex items-end gap-2 mt-1">
                <div className="text-[28px] font-bold text-fg leading-none mono">{m.value}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Today's tasks */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>오늘 할 일</CardTitle>
            <Link href="/tasks" className="text-[12px] text-accent-strong hover:underline">전체 보기 →</Link>
          </CardHeader>
          <CardBody className="!p-0">
            {tasksLoading && (
              <div className="px-5 py-6 flex items-center gap-2 text-fg-3 text-[12.5px]">
                <Loader2 size={14} className="animate-spin" /> 불러오는 중…
              </div>
            )}
            {!tasksLoading && tasks.length === 0 && (
              <div className="px-5 py-8 text-center text-fg-3 text-[12.5px]">표시할 태스크가 없습니다.</div>
            )}
            {tasks.slice(0, 5).map(t => {
              const proj = projects.find(p => p.id === t.proj);
              const u = userMap.get(t.assignee);
              return (
                <div key={t.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-border last:border-0 hover:bg-hover transition-colors">
                  {t.status === 'done' ? <CheckCircle2 size={16} className="text-success" /> : <Circle size={16} className="text-fg-3" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-fg truncate">{t.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-fg-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: proj?.color }} />
                        {proj?.name ?? '—'}
                      </span>
                      <span>·</span>
                      <span className="mono">{t.id}</span>
                    </div>
                  </div>
                  {t.priority === 'high' && <Badge tone="danger">높음</Badge>}
                  <div className="text-[11.5px] text-fg-2 mono w-12 text-right">{t.due}</div>
                  {u && <Avatar user={u} size={22} />}
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* AI insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Sparkles size={14} className="text-accent" /> AI 인사이트</CardTitle>
            <IconButton size="sm"><MoreHorizontal size={14} /></IconButton>
          </CardHeader>
          <CardBody className="space-y-3">
            <Insight tone="warning" title="결제 시스템 진척 둔화" body="지난 주 대비 진행률이 8%p 감소했어요. 차단된 태스크 2개가 원인입니다." cta="자세히 보기" onCta={() => router.push('/projects')} />
            <Insight tone="accent" title="회의록 5개 미정리" body="이번 주 미팅 중 5건이 액션 아이템으로 변환되지 않았어요." cta="자동 정리" onCta={() => router.push('/ai-auto')} />
            <Insight tone="success" title="Q2 캠페인 91% 달성" body="목표 일정보다 3일 빠르게 마감 임박이에요. 좋은 흐름!" cta="보고서 생성" onCta={() => router.push('/reports')} />
          </CardBody>
        </Card>

        {/* Project progress */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>프로젝트 진행률</CardTitle>
            <Link href="/projects" className="text-[12px] text-accent-strong hover:underline">전체 보기 →</Link>
          </CardHeader>
          <CardBody className="space-y-4">
            {projectsLoading && (
              <div className="flex items-center gap-2 text-fg-3 text-[12.5px]">
                <Loader2 size={14} className="animate-spin" /> 불러오는 중…
              </div>
            )}
            {!projectsLoading && projects.length === 0 && (
              <div className="text-center text-fg-3 text-[12.5px] py-4">프로젝트가 없습니다.</div>
            )}
            {projects.slice(0, 4).map(p => (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  <Link href={`/projects/${p.id}`} className="text-[13px] font-medium text-fg hover:underline truncate flex-1">{p.name}</Link>
                  <Badge tone="neutral" className="mono">{p.code}</Badge>
                  <StatusDot status={p.status} />
                  <div className="text-[12px] mono text-fg-1 w-9 text-right font-semibold">{p.progress}%</div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={p.progress} className="flex-1" tone={p.status === 'done' ? 'success' : 'accent'} />
                  <AvatarStack users={p.members.map(id => userMap.get(id)!).filter(Boolean)} max={3} size={20} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Activity — derived from recent tasks */}
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {tasksLoading && (
              <div className="text-fg-3 text-[12px]">불러오는 중…</div>
            )}
            {!tasksLoading && tasks.length === 0 && (
              <div className="text-fg-3 text-[12px] text-center py-4">활동 내역이 없습니다.</div>
            )}
            {tasks.slice(0, 5).map(t => {
              const u = userMap.get(t.assignee);
              const proj = projects.find(p => p.id === t.proj);
              return (
                <div key={t.id} className="flex gap-2.5 text-[12px]">
                  {u ? (
                    <Avatar user={u} size={24} />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-bg-2 text-fg-3 grid place-items-center text-[10px]">—</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-fg-1 leading-relaxed truncate">
                      <strong className="text-fg">{u?.name ?? t.assignee}</strong>님이{' '}
                      <em className="not-italic font-medium text-fg">{t.title}</em> 작업 중
                    </div>
                    <div className="flex items-center gap-1.5 text-fg-3 text-[11px] mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: proj?.color }} />
                      <span>{proj?.code ?? '—'}</span>
                      <span>·</span>
                      <span className="mono">{t.due}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Insight({ tone, title, body, cta, onCta }: { tone: 'warning' | 'accent' | 'success'; title: string; body: string; cta: string; onCta?: () => void }) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge tone={tone}>{tone === 'warning' ? '주의' : tone === 'accent' ? '제안' : '진행'}</Badge>
        <div className="text-[12.5px] font-semibold text-fg">{title}</div>
      </div>
      <p className="text-[12px] text-fg-2 leading-relaxed">{body}</p>
      <button type="button" onClick={onCta} className="text-[12px] text-accent-strong font-medium hover:underline mt-1">{cta} →</button>
    </div>
  );
}

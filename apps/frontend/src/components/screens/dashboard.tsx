'use client';

import { Card, CardBody, CardHeader, CardTitle, Avatar, AvatarStack, Badge, Button, IconButton, Progress, StatusDot } from '@/components/ui/primitives';
import { useMe, useProjects, useTasks } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import type { Task, Project } from '@/lib/schemas';
import { CheckCircle2, Circle, MoreHorizontal, Sparkles, Plus, Loader2, Calendar, X } from 'lucide-react';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useState } from 'react';
import { TaskCreateDialog } from '@/components/dialogs/task-create-dialog';
import { TaskDetailDialog } from './task-detail';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function DashboardPage() {
  const { data: me } = useMe();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const userMap = useUserMap();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [insightPeriod, setInsightPeriod] = useState<'week' | 'month'>('week');
  const [insightMenuOpen, setInsightMenuOpen] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const router = useRouter();

  const todoCount = tasks.filter(t => t.status !== 'done').length;
  const doneToday = tasks.filter(t => t.status === 'done').length;
  const doingCount = tasks.filter(t => t.status === 'doing').length;
  const reviewCount = tasks.filter(t => t.status === 'review').length;

  const greetingName = me?.name ?? '';

  async function generateBriefing() {
    setBriefingLoading(true);
    try {
      const prompt = [
        `오늘 날짜: ${new Date().toLocaleDateString('ko-KR')}`,
        `사용자: ${greetingName || '팀원'}`,
        `처리할 태스크: ${todoCount}개 (진행 중 ${doingCount}건, 리뷰 대기 ${reviewCount}건)`,
        `오늘 완료: ${doneToday}건`,
        `전체 프로젝트: ${projects.length}개`,
        '',
        '위 현황을 바탕으로 오늘의 업무 브리핑을 3~5줄로 간결하게 한국어로 작성해줘. 우선순위 제안과 주의할 점을 포함해줘.',
      ].join('\n');
      const result = await api.aiComplete(prompt);
      setBriefing(result.text);
    } catch {
      toast.error('브리핑 생성에 실패했습니다.');
    } finally {
      setBriefingLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1440px] mx-auto">
      <AiGuideWidget
        systemContext={`대시보드 — 처리할 태스크 ${todoCount}개, 진행 중 ${doingCount}건, 리뷰 대기 ${reviewCount}건, 프로젝트 ${projects.length}개`}
        hints={[
          todoCount > 5 ? `오늘 ${todoCount}개 태스크 우선순위 정해줘` : '오늘 우선순위 알려줘',
          reviewCount > 0 ? `리뷰 대기 ${reviewCount}건 빠른 처리 방법` : '지연 위험 항목 찾아줘',
          '팀 현황 요약해줘',
        ]}
      />
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
          <Button variant="secondary" onClick={generateBriefing} disabled={briefingLoading}>
            {briefingLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            오늘 브리핑
          </Button>
          <Button variant="primary" onClick={() => router.push('/ai-auto')}><Sparkles size={14} /> AI에게 요청</Button>
        </div>
        <TaskCreateDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
        <TaskDetailDialog taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
      </div>

      {/* AI 오늘 브리핑 */}
      {briefing && (
        <Card className="!bg-accent-soft border-accent/20">
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-fg">
                <Sparkles size={13} className="text-accent" />
                AI 오늘 브리핑
              </div>
              <button type="button" onClick={() => setBriefing(null)} className="text-fg-3 hover:text-fg transition-colors" aria-label="닫기">
                <X size={14} />
              </button>
            </div>
            <p className="whitespace-pre-line text-[12.5px] text-fg-1 leading-relaxed">{briefing}</p>
          </CardBody>
        </Card>
      )}

      {/* Top metrics row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '오늘 완료', value: String(doneToday), href: '/tasks' },
          { label: '진행 중', value: String(doingCount), href: '/tasks' },
          { label: '리뷰 대기', value: String(reviewCount), href: '/tasks' },
          { label: '전체 프로젝트', value: String(projects.length), href: '/projects' },
        ].map(m => (
          <Card key={m.label} className="cursor-pointer hover:border-accent/40 transition-colors" onClick={() => router.push(m.href)}>
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
              <div className="px-5 py-8 text-center space-y-3">
                <div className="text-[13px] font-semibold text-fg">태스크가 없습니다</div>
                <div className="text-[12px] text-fg-3">첫 태스크를 만들어 팀과 함께 시작하세요.</div>
                <Button variant="secondary" size="sm" onClick={() => setTaskDialogOpen(true)}><Plus size={12} /> 태스크 추가</Button>
              </div>
            )}
            {tasks.slice(0, 5).map(t => {
              const proj = projects.find(p => p.id === t.proj);
              const u = userMap.get(t.assignee);
              return (
                <button key={t.id} type="button" onClick={() => setOpenTaskId(t.id)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 border-b border-border last:border-0 hover:bg-hover transition-colors text-left">
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
                </button>
              );
            })}
          </CardBody>
        </Card>

        {/* AI insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-accent" /> AI 인사이트
              <span className="text-[11px] text-fg-3 font-normal ml-1">{insightPeriod === 'week' ? '이번 주' : '이번 달'}</span>
            </CardTitle>
            <div className="relative">
              <IconButton size="sm" onClick={() => setInsightMenuOpen(v => !v)} aria-label="인사이트 설정"><MoreHorizontal size={14} /></IconButton>
              {insightMenuOpen && (
                <div className="absolute right-0 top-7 z-50 w-36 rounded-lg border border-border bg-bg-elev shadow-pop py-1" onMouseLeave={() => setInsightMenuOpen(false)}>
                  <div className="px-3 py-1.5 text-[10.5px] text-fg-3 uppercase tracking-wider font-semibold">기간</div>
                  {([['week', '이번 주'], ['month', '이번 달']] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => { setInsightPeriod(val); setInsightMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-hover ${insightPeriod === val ? 'text-accent font-semibold' : 'text-fg-1'}`}>
                      <Calendar size={12} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {computeInsights(tasks, projects, insightPeriod, router).map((ins, idx) => (
              <Insight key={idx} tone={ins.tone} title={ins.title} body={ins.body} cta={ins.cta} onCta={ins.onCta} />
            ))}
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
              <div className="text-center py-4 space-y-2">
                <div className="text-[12.5px] text-fg">프로젝트가 없습니다</div>
                <Link href="/projects" className="text-[12px] text-accent-strong hover:underline">프로젝트 시작하기 →</Link>
              </div>
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

type InsightItem = { tone: 'warning' | 'accent' | 'success'; title: string; body: string; cta: string; onCta: () => void };

function computeInsights(tasks: Task[], projects: Project[], period: 'week' | 'month', router: AppRouterInstance): InsightItem[] {
  const insights: InsightItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  const blocked = tasks.filter(t => t.status === 'blocked');
  if (blocked.length > 0) {
    insights.push({ tone: 'warning', title: `블록된 태스크 ${blocked.length}건`, body: `${blocked.map(t => t.title).slice(0, 2).join(', ')}${blocked.length > 2 ? ` 외 ${blocked.length - 2}건` : ''}이 블록 상태입니다. 원인을 확인하세요.`, cta: '태스크 보기', onCta: () => router.push('/tasks') });
  }

  const overdue = tasks.filter(t => t.status !== 'done' && t.due && t.due < today && /^\d{4}-\d{2}-\d{2}$/.test(t.due));
  if (overdue.length > 0) {
    insights.push({ tone: 'warning', title: `기한 초과 ${overdue.length}건`, body: `${overdue[0]?.title}${overdue.length > 1 ? ` 외 ${overdue.length - 1}건` : ''}이 마감일을 지났습니다.`, cta: '확인하기', onCta: () => router.push('/tasks') });
  }

  const reviewWaiting = tasks.filter(t => t.status === 'review');
  if (reviewWaiting.length > 0) {
    insights.push({ tone: 'accent', title: `리뷰 대기 ${reviewWaiting.length}건`, body: `${period === 'week' ? '이번 주' : '이번 달'} ${reviewWaiting.length}건이 리뷰를 기다리고 있어요. 빠른 피드백으로 팀 흐름을 이어가세요.`, cta: '리뷰하기', onCta: () => router.push('/tasks') });
  }

  const highPrio = tasks.filter(t => t.priority === 'high' && t.status !== 'done');
  if (highPrio.length > 0 && insights.length < 3) {
    insights.push({ tone: 'accent', title: `높음 우선순위 ${highPrio.length}건 진행 중`, body: `${highPrio.slice(0, 2).map(t => t.title).join(', ')}${highPrio.length > 2 ? ` 외 ${highPrio.length - 2}건` : ''}을 우선 처리하세요.`, cta: 'AI에게 요청', onCta: () => router.push('/ai-auto') });
  }

  const doneCount = tasks.filter(t => t.status === 'done').length;
  if (doneCount > 0 && insights.length < 3) {
    const rate = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
    insights.push({ tone: 'success', title: `완료율 ${rate}%`, body: `전체 ${tasks.length}건 중 ${doneCount}건 완료. ${rate >= 70 ? '훌륭한 진행률이에요!' : '조금 더 파이팅!'}`, cta: '보고서 생성', onCta: () => router.push('/reports') });
  }

  if (insights.length === 0) {
    insights.push({ tone: 'success', title: '모든 태스크 정상', body: `현재 블록·지연 없이 ${tasks.length}건이 진행 중이에요. 좋은 흐름!`, cta: '프로젝트 보기', onCta: () => router.push('/projects') });
  }

  return insights.slice(0, 3);
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

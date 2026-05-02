/**
 * ProjectDetail — single-project view backed by `GET /projects/:id` (FE-W2).
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Card, CardBody, CardHeader, CardTitle, AvatarStack, Badge, Button, Progress, StatusDot } from '@/components/ui/primitives';
import { useProject, useTasks, useProjectMutations } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';
import { TaskDetailDialog } from './task-detail';
import { ProjectEditDialog } from '@/components/dialogs/project-edit-dialog';

interface Props {
  projectId: string;
}

const STATUS_LABEL: Record<string, string> = {
  todo: '대기', doing: '진행', review: '검토', done: '완료', blocked: '차단',
};

export function ProjectDetail({ projectId }: Props) {
  const router = useRouter();
  const projectQuery = useProject(projectId);
  const tasksQuery = useTasks({ projectId });
  const userMap = useUserMap();
  const { remove } = useProjectMutations();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const project = projectQuery.data;

  if (projectQuery.isLoading) {
    return (
      <div className="p-6 max-w-[1100px] mx-auto flex items-center gap-2 text-fg-2">
        <Loader2 size={14} className="animate-spin" /> 프로젝트 불러오는 중…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 max-w-[1100px] mx-auto space-y-3">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-[12.5px] text-fg-2 hover:text-fg-1">
          <ArrowLeft size={13} /> 프로젝트 목록
        </Link>
        <Card>
          <CardBody className="text-center text-fg-3 py-12 text-[13px]">
            요청한 프로젝트({projectId})를 찾을 수 없습니다.
          </CardBody>
        </Card>
      </div>
    );
  }
  const members = project.members.map(id => userMap.get(id)).filter((u): u is NonNullable<typeof u> => Boolean(u));
  const tasks = tasksQuery.data ?? [];

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.due && t.due < new Date().toISOString().slice(0, 10)).length;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <AiGuideWidget
        systemContext={`프로젝트 ${project.name} — 진행률 ${project.progress}%, 태스크 ${doneTasks}/${tasks.length} 완료, 기한초과 ${overdueTasks}건`}
        hints={[
          overdueTasks > 0 ? `기한 초과 태스크 ${overdueTasks}건 우선순위 재설정해줘` : '이 프로젝트 리스크 분석해줘',
          project.progress < 30 ? `진행률 ${project.progress}% — 속도 높이는 방법 알려줘` : '블로킹 태스크 찾아줘',
          '다음 마일스톤 준비 도와줘',
        ]}
      />
      <div className="flex items-center gap-3">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-[12.5px] text-fg-2 hover:text-fg-1">
          <ArrowLeft size={13} /> 프로젝트 목록
        </Link>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: project.color }} />
        <h1 className="text-[20px] font-bold text-fg">{project.name}</h1>
        <Badge tone="neutral" className="mono">{project.code}</Badge>
        <StatusDot status={project.status} />
        <span className="text-[12px] mono text-fg-2 ml-auto">~ {project.due || '미정'}</span>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="p-1.5 rounded text-fg-2 hover:text-accent hover:bg-bg-2 transition-colors"
          aria-label="프로젝트 수정"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => toast(`"${project.name}" 프로젝트를 삭제하시겠습니까?`, {
            action: { label: '삭제', onClick: async () => { await remove.mutateAsync(project.id); router.push('/projects'); } },
            cancel: '취소',
          })}
          className="p-1.5 rounded text-fg-2 hover:text-danger hover:bg-bg-2 transition-colors"
          aria-label="프로젝트 삭제"
        >
          <Trash2 size={14} />
        </button>
        <ProjectEditDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>진행률</CardTitle></CardHeader>
          <CardBody>
            <div className="flex items-baseline gap-2 mb-2">
              <div className={`text-[36px] font-bold mono leading-none ${project.status === 'done' ? 'text-success' : 'text-fg'}`}>
                {project.progress}
              </div>
              <div className="text-[12px] text-fg-3 mono">/ 100%</div>
            </div>
            <Progress value={project.progress} tone={project.status === 'done' ? 'success' : 'accent'} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>태스크</CardTitle></CardHeader>
          <CardBody>
            <div className="flex items-baseline gap-2">
              <div className="text-[36px] font-bold mono leading-none text-fg">
                {project.tasks.done}
              </div>
              <div className="text-[12px] text-fg-3 mono">/ {project.tasks.total} 완료</div>
            </div>
            <div className="text-[11.5px] text-fg-2 mt-2">
              {tasksQuery.isLoading ? '서버 동기화 중…' : `live: ${tasks.length}건 로드됨`}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>멤버</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <AvatarStack users={members} size={28} />
            <div className="text-[11.5px] text-fg-2">{members.length}명</div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>태스크 목록</CardTitle>
          <Badge tone="neutral" className="mono">{tasks.length}</Badge>
        </CardHeader>
        <CardBody className="!p-0">
          {tasksQuery.isLoading && (
            <div className="px-5 py-6 text-center text-fg-3 text-[12.5px]">불러오는 중…</div>
          )}
          {!tasksQuery.isLoading && tasks.length === 0 && (
            <div className="px-5 py-8 text-center text-fg-3 text-[12.5px]">
              이 프로젝트에 태스크가 없습니다.
            </div>
          )}
          {tasks.map(task => {
            const owner = userMap.get(task.assignee);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setOpenTaskId(task.id)}
                className="w-full grid grid-cols-[100px_1fr_120px_140px_80px] gap-3 px-5 py-2.5 items-center text-[12.5px] border-b border-border last:border-0 hover:bg-hover transition-colors text-left"
              >
                <span className="mono text-[11px] text-fg-3">{task.id}</span>
                <span className="font-medium text-fg truncate">{task.title}</span>
                <span className="text-fg-2">{owner?.name ?? '미할당'}</span>
                <span className="mono text-[11px] text-fg-2">{task.due || '—'}</span>
                <Badge tone="neutral" className="mono">{STATUS_LABEL[task.status] ?? task.status}</Badge>
              </button>
            );
          })}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => projectQuery.refetch()}>
          새로고침
        </Button>
      </div>
      <TaskDetailDialog taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}

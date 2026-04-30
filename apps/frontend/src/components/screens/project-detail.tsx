/**
 * ProjectDetail — single-project view backed by `GET /projects/:id` (FE-W2).
 */
'use client';

import Link from 'next/link';
import { Card, CardBody, CardHeader, CardTitle, AvatarStack, Badge, Button, Progress, StatusDot } from '@/components/ui/primitives';
import { useProject, useTasks } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Props {
  projectId: string;
}

const STATUS_LABEL: Record<string, string> = {
  todo: '대기', doing: '진행', review: '검토', done: '완료', blocked: '차단',
};

export function ProjectDetail({ projectId }: Props) {
  const projectQuery = useProject(projectId);
  const tasksQuery = useTasks({ projectId });
  const userMap = useUserMap();
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

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-[12.5px] text-fg-2 hover:text-fg-1">
          <ArrowLeft size={13} /> 프로젝트 목록
        </Link>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: project.color }} />
        <h1 className="text-[20px] font-bold text-fg">{project.name}</h1>
        <Badge tone="neutral" className="mono">{project.code}</Badge>
        <StatusDot status={project.status} />
        <span className="text-[12px] mono text-fg-2 ml-auto">~ {project.due || '미정'}</span>
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
              <div
                key={task.id}
                className="grid grid-cols-[100px_1fr_120px_140px_80px] gap-3 px-5 py-2.5 items-center text-[12.5px] border-b border-border last:border-0"
              >
                <span className="mono text-[11px] text-fg-3">{task.id}</span>
                <span className="font-medium text-fg truncate">{task.title}</span>
                <span className="text-fg-2">{owner?.name ?? '미할당'}</span>
                <span className="mono text-[11px] text-fg-2">{task.due || '—'}</span>
                <Badge tone="neutral" className="mono">{STATUS_LABEL[task.status] ?? task.status}</Badge>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => projectQuery.refetch()}>
          새로고침
        </Button>
      </div>
    </div>
  );
}

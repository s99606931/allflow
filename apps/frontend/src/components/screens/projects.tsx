'use client';

import { Card, CardBody, CardHeader, CardTitle, AvatarStack, Badge, Button, Progress, StatusDot } from '@/components/ui/primitives';
import { useProjects } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { Loader2, Plus } from 'lucide-react';
import Link from 'next/link';

export function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const userMap = useUserMap();
  const activeCount = projects.filter(p => p.status !== 'done').length;
  const doneCount = projects.filter(p => p.status === 'done').length;

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-fg">프로젝트</h2>
          <p className="text-[12.5px] text-fg-2 mt-0.5">활성 {activeCount}개 · 완료 {doneCount}개</p>
        </div>
        <Button variant="primary" size="sm"><Plus size={14} /> 새 프로젝트</Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-fg-2 text-[12.5px]">
          <Loader2 size={14} className="animate-spin" /> 프로젝트 불러오는 중…
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <Card>
          <CardBody className="text-center text-fg-3 py-12 text-[13px]">
            아직 프로젝트가 없습니다.
          </CardBody>
        </Card>
      )}

      {!isLoading && projects.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {projects.map(p => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card hoverable className="cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    <CardTitle>{p.name}</CardTitle>
                  </div>
                  <Badge tone="neutral" className="mono">{p.code}</Badge>
                </CardHeader>
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <StatusDot status={p.status} />
                    <span className="mono text-fg-2">~ {p.due || '미정'}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-fg-2">진행률</span>
                      <span className="mono font-semibold text-fg-1">{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} tone={p.status === 'done' ? 'success' : 'accent'} />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <AvatarStack users={p.members.map(id => userMap.get(id)!).filter(Boolean)} size={22} />
                    <div className="text-[11px] text-fg-2 mono">{p.tasks.done}/{p.tasks.total} 태스크</div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

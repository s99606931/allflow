'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader, CardTitle, AvatarStack, Badge, Button, Progress, StatusDot } from '@/components/ui/primitives';
import { useProjects, useProjectMutations } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { ProjectCreateDialog } from '@/components/dialogs/project-create-dialog';
import { ProjectEditDialog } from '@/components/dialogs/project-edit-dialog';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';
import type { Project } from '@/lib/schemas';

export function ProjectsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const { data: projects = [], isLoading } = useProjects();
  const { remove } = useProjectMutations();
  const userMap = useUserMap();
  const activeCount = projects.filter(p => p.status !== 'done').length;
  const doneCount = projects.filter(p => p.status === 'done').length;

  const blockedCount = projects.filter(p => p.status === 'blocked').length;
  const overdueCount = projects.filter(p => p.status !== 'done' && p.due && p.due < new Date().toISOString().slice(0, 10)).length;

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <AiGuideWidget
        systemContext={`프로젝트 목록 — 활성 ${activeCount}개, 완료 ${doneCount}개, 차단 ${blockedCount}개, 기한초과 ${overdueCount}개`}
        hints={[
          blockedCount > 0 ? `차단된 프로젝트 ${blockedCount}개 해결 방법 알려줘` : overdueCount > 0 ? `기한 초과 ${overdueCount}개 대처 방법` : '위험 프로젝트 찾아줘',
          activeCount > 5 ? `활성 프로젝트 ${activeCount}개 우선순위 정리해줘` : '팀 배치 최적화 제안해줘',
          '새 프로젝트 생성 도와줘',
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-fg">프로젝트</h2>
          <p className="text-[12.5px] text-fg-2 mt-0.5">활성 {activeCount}개 · 완료 {doneCount}개</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} /> 새 프로젝트</Button>
        <ProjectCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
        {editTarget && (
          <ProjectEditDialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)} project={editTarget} />
        )}
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
            <div key={p.id} className="group relative">
              <Link href={`/projects/${p.id}`}>
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
                      <div className="flex items-center gap-1.5">
                        <AvatarStack users={p.members.map(id => userMap.get(id)!).filter(Boolean)} size={22} />
                        <span className="text-[10px] text-fg-3">{p.members.length}명</span>
                      </div>
                      <div className="text-[11px] text-fg-2 mono">{p.tasks.done}/{p.tasks.total} 태스크</div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  type="button"
                  onClick={e => { e.preventDefault(); setEditTarget(p); }}
                  className="p-1 rounded bg-bg-1 border border-border text-fg-2 hover:text-accent shadow-sm"
                  aria-label="프로젝트 수정"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={e => { e.preventDefault(); toast(`"${p.name}" 프로젝트를 삭제하시겠습니까?`, { action: { label: '삭제', onClick: () => remove.mutate(p.id) }, cancel: '취소' }); }}
                  className="p-1 rounded bg-bg-1 border border-border text-fg-2 hover:text-danger shadow-sm"
                  aria-label="프로젝트 삭제"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

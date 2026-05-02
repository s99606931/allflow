import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/lib/query-keys';
import type { GanttDependency, GanttResponse } from '@/lib/api/extended';

export function useGantt(params?: { projectId?: string; from?: string; to?: string }) {
  return useQuery<GanttResponse>({
    queryKey: keys.gantt.data(params),
    queryFn: () => api.getGantt(params),
  });
}

export function useGanttByAssignee() {
  return useQuery<GanttResponse>({
    queryKey: [...keys.gantt.all(), 'by-assignee'],
    queryFn: () => api.getGanttByAssignee(),
  });
}

export function useTaskDependencies(taskId: string | undefined) {
  return useQuery<GanttDependency[]>({
    queryKey: [...keys.tasks.all(), taskId, 'dependencies'],
    queryFn: () => api.listTaskDependencies(taskId as string),
    enabled: Boolean(taskId),
  });
}

export function useTaskDependencyMutations(taskId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: keys.gantt.all() });
    qc.invalidateQueries({ queryKey: [...keys.tasks.all(), taskId, 'dependencies'] });
  };

  const create = useMutation({
    mutationFn: (input: { predecessorId: string; type: GanttDependency['type']; lagDays?: number }) =>
      api.createTaskDependency(taskId, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (depId: string) => api.deleteTaskDependency(taskId, depId),
    onSuccess: invalidate,
  });

  return { create, remove };
}

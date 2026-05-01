/**
 * TEST-F1 — React Query hook unit tests.
 *
 * `src/lib/hooks/use-data.ts` 의 query/mutation 훅이 다음을 지키는지 검증한다.
 *  - loading → success 전이 (api 모듈 직접 mock)
 *  - mutation 성공 시 관련 queryKey invalidate
 *  - error 모드에서 onError 토스트 호출
 *
 * USE_MOCK 분기를 모두 제거한 뒤, 외부 fetch 는 `vi.mock('@/lib/api', ...)` 으로
 * 가짜 응답을 주입하여 테스트한다 (BE 의존 없음).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PROJECTS, TASKS, ISSUES, ME } from '@/lib/fixtures';

vi.mock('@/lib/api', () => {
  const api = {
    me: vi.fn(async () => ME),
    listProjects: vi.fn(async () => [...PROJECTS]),
    getProject: vi.fn(async (id: string) => PROJECTS.find((p) => p.id === id)),
    createProject: vi.fn(async (input: { name: string }) => ({
      ...input,
      id: 'PRJ-NEW',
      color: '#3B82F6',
      progress: 0,
      status: 'todo',
      due: '',
      members: [],
      tasks: { total: 0, done: 0 },
    })),
    updateProject: vi.fn(async (id: string, patch: Record<string, unknown>) => ({
      ...(PROJECTS.find((p) => p.id === id) ?? {}),
      ...patch,
    })),
    listTasks: vi.fn(async (params?: { projectId?: string; assigneeId?: string }) =>
      TASKS.filter(
        (t) =>
          (!params?.projectId || t.proj === params.projectId) &&
          (!params?.assigneeId || t.assignee === params.assigneeId),
      ),
    ),
    createTask: vi.fn(async (input: { title: string; projectId: string; assigneeId: string }) => ({
      id: 'TASK-NEW',
      title: input.title,
      status: 'todo',
      proj: input.projectId,
      assignee: input.assigneeId,
      due: '',
      priority: 'med',
      tags: [],
    })),
    updateTask: vi.fn(async (id: string, patch: Record<string, unknown>) => ({ id, ...patch })),
    listIssues: vi.fn(async () => [...ISSUES]),
    listApprovals: vi.fn(async (_filters?: { status?: string }) => []),
  };
  return { api };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  useApprovals,
  useIssues,
  useProjectMutations,
  useProjects,
  useTaskMutations,
  useTasks,
} from '@/lib/hooks/use-data';
import { keys } from '@/lib/query-keys';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

describe('use-data hooks (TEST-F1)', () => {
  it('useProjects: loads fixture array (loading → success)', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(Array.isArray(result.current.data)).toBe(true);
    expect((result.current.data ?? []).length).toBeGreaterThan(0);
  });

  it('useTasks: applies filter param and returns subset', async () => {
    const { Wrapper } = makeWrapper();
    const { result: noFilter } = renderHook(() => useTasks(), { wrapper: Wrapper });
    await waitFor(() => expect(noFilter.current.isSuccess).toBe(true));
    const total = (noFilter.current.data ?? []).length;
    expect(total).toBeGreaterThan(0);

    const projectId = (noFilter.current.data ?? [])[0]?.proj as string | undefined;
    expect(projectId).toBeTruthy();

    const { result: filtered } = renderHook(
      () => useTasks({ projectId }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(filtered.current.isSuccess).toBe(true));
    const subset = filtered.current.data ?? [];
    expect(subset.length).toBeGreaterThan(0);
    for (const task of subset) {
      expect(task.proj).toBe(projectId);
    }
  });

  it('useIssues: returns array on success', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useIssues(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('useApprovals: status 필터 호출 시 query 키가 분기된다', async () => {
    const { Wrapper, qc } = makeWrapper();
    const { result: a } = renderHook(() => useApprovals(), { wrapper: Wrapper });
    const { result: b } = renderHook(
      () => useApprovals({ status: 'pending' }),
      { wrapper: Wrapper },
    );
    await waitFor(() => {
      expect(a.current.isSuccess).toBe(true);
      expect(b.current.isSuccess).toBe(true);
    });

    expect(qc.getQueryData(keys.approvals.list())).toBeDefined();
    expect(qc.getQueryData(keys.approvals.list({ status: 'pending' }))).toBeDefined();
  });

  it('useTaskMutations.create: 성공 시 keys.tasks.all() 가 invalidate 된다', async () => {
    const { Wrapper, qc } = makeWrapper();
    const spy = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useTaskMutations(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.create.mutateAsync({
        title: '테스트 태스크',
        projectId: 'p1',
        assigneeId: 'u1',
      });
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: keys.tasks.all() }),
    );
  });

  it('useProjectMutations.update: 성공 시 detail + all 두 키가 invalidate 된다', async () => {
    const { Wrapper, qc } = makeWrapper();
    const spy = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useProjectMutations(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.update.mutateAsync({
        id: 'PRJ-204',
        patch: { status: 'doing' },
      });
    });

    const calls = spy.mock.calls.map((c) => (c[0] as { queryKey: unknown }).queryKey);
    expect(calls).toContainEqual(keys.projects.all());
    expect(calls).toContainEqual(keys.projects.detail('PRJ-204'));
  });

  it('useTaskMutations.create: mutation error → onError 가 토스트 호출', async () => {
    const { Wrapper } = makeWrapper();
    const { toast } = await import('sonner');
    const errorSpy = vi.mocked(toast.error);
    errorSpy.mockClear();

    const { api } = await import('@/lib/api');
    const stub = vi
      .spyOn(api, 'createTask')
      .mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useTaskMutations(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.create
        .mutateAsync({ title: 'x', projectId: 'p1', assigneeId: 'u1' })
        .catch(() => {
          /* swallow expected rejection */
        });
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    stub.mockRestore();
  });
});

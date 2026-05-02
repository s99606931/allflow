/**
 * Data hooks — central React Query queries + mutations layer for PDCA-02..09.
 *
 * Each PDCA-W2 screen consumes hooks from here so that no component talks to
 * `api.*` directly. This isolates cache invalidation rules and toast policy.
 *
 * Pattern:
 *   - useXxx()                    → useQuery wrapper
 *   - useXxxMutation()            → useMutation + invalidates `keys.xxx.all()`
 *   - All mutation errors are routed through `toastApiError(err)`.
 */
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { keys } from '@/lib/query-keys';
import { toastMessage } from '@/lib/api-error';
import type {
  ApprovalCreate, ApprovalDecision, ClientCreate, CommentCreate, EventCreate, IssueCreate,
  IssueTransition, ProfilePatch, ProjectCreate, ProjectPatch, TaskCreate, TaskPatch, BulkMarkRead,
  InviteUser, RevokeToken, MessageSend, DocCreate, ResourceBooking,
} from '@/lib/schemas';
import type { GanttResponse, LlmConnection, LlmConnectionInput } from '@/lib/api/extended';

const onError = (err: unknown) => {
  toast.error(toastMessage(err));
};

/* -------------------------------------------------------- Queries -------- */

export function useHealth() {
  return useQuery({
    queryKey: keys.health.status(),
    queryFn: () => api.getHealth(),
    refetchInterval: 30_000,
  });
}

export function useNavCounts() {
  return useQuery({
    queryKey: keys.navCounts.get(),
    queryFn: () => api.getNavCounts(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useMe() {
  return useQuery({ queryKey: keys.me(), queryFn: () => api.me() });
}

export function useProjects() {
  return useQuery({ queryKey: keys.projects.list(), queryFn: () => api.listProjects() });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: keys.projects.detail(id ?? ''),
    queryFn: () => api.getProject(id as string),
    enabled: Boolean(id),
  });
}

export function useProjectMutations() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (input: ProjectCreate) => api.createProject(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.projects.all() });
      toast.success('프로젝트가 생성되었습니다');
    },
    onError,
  });
  const update = useMutation({
    mutationFn: (vars: { id: string; patch: ProjectPatch }) =>
      api.updateProject(vars.id, vars.patch),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.projects.all() });
      qc.invalidateQueries({ queryKey: keys.projects.detail(vars.id) });
    },
    onError,
  });
  return { create, update };
}

export function useTasks(filter?: { projectId?: string; assigneeId?: string }) {
  return useQuery({
    queryKey: keys.tasks.list(filter),
    queryFn: () => api.listTasks(filter),
  });
}

export function useIssues() {
  return useQuery({ queryKey: keys.issues.list(), queryFn: () => api.listIssues() });
}

export function useNotifications() {
  return useQuery({
    queryKey: keys.notifications.list(),
    queryFn: () => api.listNotifications(),
  });
}

export function useApprovals(filters?: { status?: string }) {
  return useQuery({
    queryKey: keys.approvals.list(filters),
    queryFn: () => api.listApprovals(filters),
  });
}

export function useClients() {
  return useQuery({ queryKey: keys.clients.list(), queryFn: () => api.listClients() });
}

export function useEvents(filters?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: keys.events.list(filters),
    queryFn: () => api.listEvents(filters),
  });
}

export function useResources() {
  return useQuery({ queryKey: keys.resources.list(), queryFn: () => api.listResources() });
}

export function useBookings(date?: string) {
  return useQuery({
    queryKey: ['bookings', date ?? 'today'],
    queryFn: () => api.listBookings(date),
  });
}

export function useDocs() {
  return useQuery({ queryKey: keys.docs.list(), queryFn: () => api.listDocs() });
}

export function useChannels() {
  return useQuery({ queryKey: keys.channels.list(), queryFn: () => api.listChannels() });
}

export function useOrgUnits() {
  return useQuery({ queryKey: keys.orgUnits.list(), queryFn: () => api.listOrgUnits() });
}

export function useUsers() {
  return useQuery({ queryKey: keys.users.list(), queryFn: () => api.listUsers() });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.inviteUserByEmail(email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.users.all() });
      toast.success('초대 메일이 전송되었습니다');
    },
    onError,
  });
}

/* ------------------------------------------------------ Mutations -------- */

export function useTaskMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.tasks.all() });

  const create = useMutation({
    mutationFn: (input: TaskCreate) => api.createTask(input),
    onSuccess: () => { invalidate(); toast.success('태스크가 생성되었습니다'); },
    onError,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatch }) => api.updateTask(id, patch),
    onSuccess: () => { invalidate(); toast.success('태스크가 업데이트되었습니다'); },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => { invalidate(); toast.success('태스크가 삭제되었습니다'); },
    onError,
  });

  return { create, update, remove };
}

export function useIssueMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.issues.all() });

  const create = useMutation({
    mutationFn: (input: IssueCreate) => api.createIssue(input),
    onSuccess: () => { invalidate(); toast.success('이슈가 등록되었습니다'); },
    onError,
  });
  const transition = useMutation({
    mutationFn: ({ id, input }: { id: string; input: IssueTransition }) =>
      api.transitionIssue(id, input),
    onSuccess: () => { invalidate(); toast.success('상태가 변경되었습니다'); },
    onError,
  });

  return { create, transition };
}

export function useApprovalMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.approvals.all() });
  const create = useMutation({
    mutationFn: (input: ApprovalCreate) => api.createApproval(input),
    onSuccess: () => { invalidate(); toast.success('결재가 상신되었습니다'); },
    onError,
  });
  const decide = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApprovalDecision }) =>
      api.decideApproval(id, input),
    onSuccess: () => { invalidate(); toast.success('결재 처리 완료'); },
    onError,
  });
  return { create, decide };
}

export function useClientMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.clients.all() });
  const create = useMutation({
    mutationFn: (input: ClientCreate) => api.createClient(input),
    onSuccess: () => { invalidate(); toast.success('고객사가 등록되었습니다'); },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteClient(id),
    onSuccess: () => { invalidate(); toast.success('고객사가 삭제되었습니다'); },
    onError,
  });
  return { create, remove };
}

export function useEventMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.events.all() });
  const create = useMutation({
    mutationFn: (input: EventCreate) => api.createEvent(input),
    onSuccess: () => { invalidate(); toast.success('일정이 추가되었습니다'); },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteEvent(id),
    onSuccess: () => { invalidate(); toast.success('일정이 삭제되었습니다'); },
    onError,
  });
  return { create, remove };
}

export function useResourceMutations() {
  const create = useMutation({
    mutationFn: (input: ResourceBooking) => api.bookResource(input),
    onSuccess: () => toast.success('자원이 예약되었습니다'),
    onError,
  });
  return { create };
}

export function useDocMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.docs.all() });
  const create = useMutation({
    mutationFn: (input: DocCreate) => api.createDoc(input),
    onSuccess: () => { invalidate(); toast.success('문서가 생성되었습니다'); },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteDoc(id),
    onSuccess: () => { invalidate(); toast.success('문서가 삭제되었습니다'); },
    onError,
  });
  return { create, remove };
}

export function useMessageMutations() {
  const send = useMutation({
    mutationFn: (input: MessageSend) => api.sendMessage(input),
    onError,
  });
  return { send };
}

export function useOrgMutations() {
  const invite = useMutation({
    mutationFn: (input: InviteUser) => api.inviteUser(input),
    onSuccess: () => toast.success('초대 메일이 전송되었습니다'),
    onError,
  });
  const revokeToken = useMutation({
    mutationFn: (input: RevokeToken) => api.revokeToken(input),
    onSuccess: () => toast.success('토큰이 회수되었습니다'),
    onError,
  });
  return { invite, revokeToken };
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.notifications.all() });
  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => invalidate(),
    onError,
  });
  const markAll = useMutation({
    mutationFn: (input: BulkMarkRead) => api.bulkMarkRead(input),
    onSuccess: (data) => {
      invalidate();
      toast.success(`${data.count}건을 읽음 처리했습니다`);
    },
    onError,
  });
  return { markRead, markAll };
}

export function useProfileMutations() {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: (input: ProfilePatch) => api.updateProfile(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.me() });
      toast.success('프로필이 저장되었습니다');
    },
    onError,
  });
  return { update };
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: keys.tasks.comments(taskId ?? ''),
    queryFn: () => api.listTaskComments(taskId as string),
    enabled: Boolean(taskId),
  });
}

export function useTaskCommentCreate(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommentCreate) => api.createTaskComment(taskId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tasks.comments(taskId) });
      qc.invalidateQueries({ queryKey: keys.tasks.detail(taskId) });
      toast.success('댓글이 등록되었습니다');
    },
    onError,
  });
}

export function useIssueComments(issueId: string | undefined) {
  return useQuery({
    queryKey: keys.issues.comments(issueId ?? ''),
    queryFn: () => api.listIssueComments(issueId as string),
    enabled: Boolean(issueId),
  });
}

export function useIssueCommentCreate(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommentCreate) => api.createIssueComment(issueId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.issues.comments(issueId) });
      qc.invalidateQueries({ queryKey: keys.issues.detail(issueId) });
      toast.success('댓글이 등록되었습니다');
    },
    onError,
  });
}

export function useReportSend() {
  return useMutation({
    mutationFn: (vars: { id: string; recipients: string[] }) =>
      api.sendReport(vars.id, { recipients: vars.recipients }),
    onSuccess: (data) =>
      toast.success(`${data.queued}명에게 발송 큐에 적재되었습니다`),
    onError,
  });
}

export function useAiMutations() {
  const complete = useMutation({
    mutationFn: (prompt: string) => api.aiComplete(prompt),
    onError,
  });
  const extractActions = useMutation({
    mutationFn: (input: Parameters<typeof api.aiExtractActions>[0]) =>
      api.aiExtractActions(input),
    onSuccess: (data) => toast.success(`${data.length}개 액션 아이템 추출됨`),
    onError,
  });
  const weeklyReport = useMutation({
    mutationFn: (input: Parameters<typeof api.generateWeeklyReport>[0]) =>
      api.generateWeeklyReport(input),
    onSuccess: () => toast.success('주간 보고서가 생성되었습니다'),
    onError,
  });
  const monthlyReport = useMutation({
    mutationFn: (input: Parameters<typeof api.generateMonthlyReport>[0]) =>
      api.generateMonthlyReport(input),
    onSuccess: () => toast.success('월간 보고서가 생성되었습니다'),
    onError,
  });
  return { complete, extractActions, weeklyReport, monthlyReport };
}

export function useLlmConnections() {
  return useQuery<LlmConnection[]>({
    queryKey: ['llm-connections'],
    queryFn: () => api.listLlmConnections(),
  });
}

export function useLlmConnectionMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['llm-connections'] });

  const create = useMutation({
    mutationFn: (input: LlmConnectionInput) => api.createLlmConnection(input),
    onSuccess: () => {
      toast.success('LLM 연결이 추가되었습니다');
      invalidate();
    },
    onError,
  });

  const update = useMutation({
    mutationFn: (vars: { id: string; input: Partial<LlmConnectionInput> }) =>
      api.updateLlmConnection(vars.id, vars.input),
    onSuccess: () => {
      toast.success('LLM 연결이 수정되었습니다');
      invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteLlmConnection(id),
    onSuccess: () => {
      toast.success('LLM 연결이 삭제되었습니다');
      invalidate();
    },
    onError,
  });

  const activate = useMutation({
    mutationFn: (id: string) => api.activateLlmConnection(id),
    onSuccess: (data) => {
      toast.success(`${data.name} 활성화됨`);
      invalidate();
    },
    onError,
  });

  const test = useMutation({
    mutationFn: (id: string) => api.testLlmConnection(id),
    onSuccess: (r) => {
      if (r.ok) toast.success(`연결 OK · ${r.latencyMs}ms`);
      else toast.error(`연결 실패: ${r.detail ?? 'unknown'}`);
    },
    onError,
  });

  return { create, update, remove, activate, test };
}

export function useGantt(params?: { projectId?: string; from?: string; to?: string }) {
  return useQuery<GanttResponse>({
    queryKey: keys.gantt.data(params),
    queryFn: () => api.getGantt(params),
  });
}

/* ----------------------------------------- AI hooks (re-export) --------- */
// AI 스트리밍/스레드 훅은 use-ai.ts 로 분리 (500 LOC 게이트 준수)
export type { AiThread, AiMessage } from './use-ai';
export { useAiStream, useAiThreads, useAiThreadMessages, useAiThreadMutations } from './use-ai';

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  waitFor,
  type RenderOptions,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlowProgressSummary } from '@/components/ai/flow-progress-summary';
import { api } from '@/lib/api';
import type { TeamFlowProgressEntry } from '@/lib/api/extended';

vi.mock('@/lib/api', () => ({
  api: {
    getTeamFlowProgress: vi.fn(),
  },
}));

function render(ui: ReactElement, options?: RenderOptions) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

const ALICE_ACTIVE: TeamFlowProgressEntry = {
  user: { id: 'u-alice', name: 'Alice', email: 'alice@x.io', avatarUrl: null },
  flowId: 'project-lifecycle',
  currentStepId: 'execute',
  completedSteps: ['plan', 'kickoff'],
  progressRatio: 2 / 5,
  stepStartedAt: '2026-05-03T00:00:00Z',
  updatedAt: '2026-05-03T00:00:00Z',
};

const BOB_DONE: TeamFlowProgressEntry = {
  user: { id: 'u-bob', name: 'Bob', email: 'bob@x.io', avatarUrl: null },
  flowId: 'task-lifecycle',
  currentStepId: 'done',
  completedSteps: ['create', 'doing', 'review', 'done'],
  progressRatio: 1,
  stepStartedAt: '2026-05-03T01:00:00Z',
  updatedAt: '2026-05-03T01:00:00Z',
};

describe('FlowProgressSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('빈 결과면 안내 문구를 표시한다', async () => {
    vi.mocked(api.getTeamFlowProgress).mockResolvedValueOnce({ team: [] });
    render(<FlowProgressSummary />);
    await waitFor(() => {
      expect(
        screen.getByText(/아직 팀원이 비즈니스 플로우를 시작하지 않았어요/),
      ).toBeInTheDocument();
    });
  });

  it('진행 중과 완료를 분리해서 렌더하고 progressRatio 를 % 로 표시한다', async () => {
    vi.mocked(api.getTeamFlowProgress).mockResolvedValueOnce({
      team: [ALICE_ACTIVE, BOB_DONE],
    });
    render(<FlowProgressSummary />);

    await waitFor(() => {
      expect(screen.getByTestId('flow-progress-active')).toBeInTheDocument();
      expect(screen.getByTestId('flow-progress-done')).toBeInTheDocument();
    });

    // Alice 는 active 카테고리에 위치
    expect(
      screen.getByTestId('flow-progress-row-u-alice-project-lifecycle'),
    ).toBeInTheDocument();
    // Bob 은 done 카테고리에 위치
    expect(
      screen.getByTestId('flow-progress-row-u-bob-task-lifecycle'),
    ).toBeInTheDocument();
    // 40% 표기
    expect(screen.getByText('40%')).toBeInTheDocument();
    // 100% 표기
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('flowId prop 을 API 에 전달한다', async () => {
    vi.mocked(api.getTeamFlowProgress).mockResolvedValueOnce({ team: [] });
    render(<FlowProgressSummary flowId="project-lifecycle" />);
    await waitFor(() => {
      expect(api.getTeamFlowProgress).toHaveBeenCalledWith('project-lifecycle');
    });
  });

  it('네트워크 실패 시 silent fallback (빈 안내 표시)', async () => {
    vi.mocked(api.getTeamFlowProgress).mockRejectedValueOnce(new Error('network'));
    render(<FlowProgressSummary />);
    await waitFor(() => {
      expect(
        screen.getByText(/아직 팀원이 비즈니스 플로우를 시작하지 않았어요/),
      ).toBeInTheDocument();
    });
  });

  it('maxPerCategory 초과분은 "+N명" 링크로 노출', async () => {
    const many: TeamFlowProgressEntry[] = Array.from({ length: 8 }, (_, i) => ({
      user: {
        id: `u${i}`,
        name: `User ${i}`,
        email: `u${i}@x.io`,
        avatarUrl: null,
      },
      flowId: 'project-lifecycle',
      currentStepId: 'plan',
      completedSteps: [],
      progressRatio: 0.1 * (i + 1),
      stepStartedAt: '2026-05-03T00:00:00Z',
      updatedAt: '2026-05-03T00:00:00Z',
    }));
    vi.mocked(api.getTeamFlowProgress).mockResolvedValueOnce({ team: many });
    render(<FlowProgressSummary maxPerCategory={3} />);
    await waitFor(() => {
      expect(screen.getByText(/\+ 5명 더 보기/)).toBeInTheDocument();
    });
  });
});

import { describe, expect, it } from 'vitest';

// 동적 currentStepId 추론 순수 로직 단위 테스트
// dashboard.tsx 및 projects.tsx 에서 분리한 추론 규칙을 검증한다.

function inferDashboardStep(opts: { projectsLength: number; doingCount: number; todoCount: number }): string {
  const { projectsLength, doingCount, todoCount } = opts;
  return (
    projectsLength === 0 ? 'plan' :
    doingCount > 0 ? 'execute' :
    todoCount > 0 ? 'kickoff' :
    'execute'
  );
}

function inferProjectsStep(opts: {
  projectsLength: number;
  doneCount: number;
  activeCount: number;
  blockedCount: number;
  overdueCount: number;
}): string {
  const { projectsLength, doneCount, activeCount, blockedCount, overdueCount } = opts;
  return (
    projectsLength === 0 ? 'plan' :
    doneCount === projectsLength ? 'closeout' :
    overdueCount > 0 ? 'review' :
    blockedCount > 0 ? 'review' :
    activeCount > 0 ? 'execute' :
    'plan'
  );
}

describe('Dashboard flow step inference', () => {
  it('shows plan when no projects exist (new user)', () => {
    expect(inferDashboardStep({ projectsLength: 0, doingCount: 0, todoCount: 0 })).toBe('plan');
  });

  it('shows execute when tasks are in-progress', () => {
    expect(inferDashboardStep({ projectsLength: 2, doingCount: 3, todoCount: 5 })).toBe('execute');
  });

  it('shows kickoff when tasks exist but none started yet', () => {
    expect(inferDashboardStep({ projectsLength: 1, doingCount: 0, todoCount: 4 })).toBe('kickoff');
  });

  it('defaults to execute for active project with no open tasks', () => {
    expect(inferDashboardStep({ projectsLength: 2, doingCount: 0, todoCount: 0 })).toBe('execute');
  });
});

describe('Projects flow step inference', () => {
  it('shows plan when no projects exist', () => {
    expect(inferProjectsStep({ projectsLength: 0, doneCount: 0, activeCount: 0, blockedCount: 0, overdueCount: 0 })).toBe('plan');
  });

  it('shows closeout when all projects are done', () => {
    expect(inferProjectsStep({ projectsLength: 3, doneCount: 3, activeCount: 0, blockedCount: 0, overdueCount: 0 })).toBe('closeout');
  });

  it('shows review when overdue projects exist', () => {
    expect(inferProjectsStep({ projectsLength: 2, doneCount: 0, activeCount: 2, blockedCount: 0, overdueCount: 1 })).toBe('review');
  });

  it('shows review when blocked projects exist', () => {
    expect(inferProjectsStep({ projectsLength: 2, doneCount: 0, activeCount: 2, blockedCount: 1, overdueCount: 0 })).toBe('review');
  });

  it('overdue takes precedence over blocked', () => {
    expect(inferProjectsStep({ projectsLength: 3, doneCount: 0, activeCount: 3, blockedCount: 1, overdueCount: 2 })).toBe('review');
  });

  it('shows execute for healthy active projects', () => {
    expect(inferProjectsStep({ projectsLength: 3, doneCount: 1, activeCount: 2, blockedCount: 0, overdueCount: 0 })).toBe('execute');
  });
});

function inferDocsStep(opts: { docsLength: number; editing: boolean }): string {
  const { docsLength, editing } = opts;
  return docsLength === 0 ? 'draft' : editing ? 'review' : 'archive';
}

function inferReportStep(opts: { report: { id: string } | null; historyIds: string[]; scopeSize: number }): string {
  const { report, historyIds, scopeSize } = opts;
  return (
    report && historyIds.includes(report.id) ? 'share' :
    report ? 'review' :
    scopeSize > 0 ? 'draft' :
    'collect'
  );
}

describe('Docs flow step inference', () => {
  it('shows draft when no docs exist', () => {
    expect(inferDocsStep({ docsLength: 0, editing: false })).toBe('draft');
  });

  it('shows review when editing is active', () => {
    expect(inferDocsStep({ docsLength: 3, editing: true })).toBe('review');
  });

  it('shows archive when docs exist and not editing', () => {
    expect(inferDocsStep({ docsLength: 5, editing: false })).toBe('archive');
  });
});

describe('Report flow step inference', () => {
  it('shows collect when no scope selected', () => {
    expect(inferReportStep({ report: null, historyIds: [], scopeSize: 0 })).toBe('collect');
  });

  it('shows draft when scope selected but no report', () => {
    expect(inferReportStep({ report: null, historyIds: [], scopeSize: 2 })).toBe('draft');
  });

  it('shows review when report generated but not yet in history', () => {
    expect(inferReportStep({ report: { id: 'r1' }, historyIds: ['r0'], scopeSize: 2 })).toBe('review');
  });

  it('shows share when report is saved in history', () => {
    expect(inferReportStep({ report: { id: 'r1' }, historyIds: ['r0', 'r1'], scopeSize: 2 })).toBe('share');
  });
});

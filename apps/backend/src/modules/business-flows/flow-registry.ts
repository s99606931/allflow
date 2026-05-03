/**
 * business-flows 정적 플로우 레지스트리 — 화면별 비즈니스 프로세스 정의.
 *
 * 사용자 (특히 초급자)에게 "현재 화면이 전체 비즈니스 흐름의 어디쯤인가" 를
 * 도식화 가능한 형태로 제공한다. 각 플로우는 ordered steps + 각 step 의
 * `screen` (FE 라우트 hint) + `action` (사용자 행동) + `aiHint` (AI 제안 트리거) 를 가진다.
 *
 * 정적 정의 → DB 변경 없음. 향후 워크스페이스별 커스텀 플로우는 별도 모델로 확장.
 */

export interface FlowStep {
  /** 식별자 — 같은 플로우 내 unique. */
  id: string;
  /** 사용자에게 보여줄 단계명. */
  label: string;
  /** 단계 설명 (1~2문장). */
  description: string;
  /** 이 단계와 매칭되는 FE 라우트 (예: `/projects`, `/approvals`). */
  screen: string;
  /** 이 단계에서 사용자가 취해야 할 권장 액션 (단일 동사구). */
  action: string;
  /** 단계 진입 시 AI 가이드가 자동으로 던질 hint. */
  aiHint: string;
  /**
   * 6차 PDCA: 이 단계에서 머무를 표준 일수(권장).
   * 단계 시작 후 이 값을 초과하면 FE 가 amber 경고를 표시.
   * 정수, 1 이상. 정의되지 않으면 경고 비활성.
   */
  expectedDays?: number;
}

export interface BusinessFlow {
  id: string;
  /** 플로우 이름 (예: "프로젝트 라이프사이클"). */
  name: string;
  /** 플로우 1줄 설명. */
  description: string;
  /** 이 플로우가 속하는 카테고리 (project | task | approval | issue | report). */
  category: 'project' | 'task' | 'approval' | 'issue' | 'report';
  steps: readonly FlowStep[];
}

const PROJECT_LIFECYCLE: BusinessFlow = {
  id: 'project-lifecycle',
  name: '프로젝트 라이프사이클',
  description: '신규 프로젝트를 기획하고 완료까지 운영하는 표준 흐름',
  category: 'project',
  steps: [
    {
      id: 'plan',
      label: '기획',
      description: '프로젝트 목표·범위·일정을 정의합니다.',
      screen: '/projects',
      action: '프로젝트 생성',
      aiHint: '프로젝트 기획서 핵심 항목 알려줘',
      expectedDays: 5,
    },
    {
      id: 'kickoff',
      label: '킥오프',
      description: '팀 구성·역할 분담·태스크 분해를 진행합니다.',
      screen: '/tasks',
      action: '태스크 분해',
      aiHint: '이 프로젝트의 태스크 분해 방법 알려줘',
      expectedDays: 3,
    },
    {
      id: 'execute',
      label: '실행',
      description: '태스크를 진행하고 일일 진척을 갱신합니다.',
      screen: '/dashboard',
      action: '진행 상황 업데이트',
      aiHint: '오늘 우선순위 정해줘',
      expectedDays: 30,
    },
    {
      id: 'review',
      label: '검토',
      description: '리뷰어에게 산출물 검토를 요청합니다.',
      screen: '/approvals',
      action: '검토 요청',
      aiHint: '검토 요청 시 작성할 핵심 포인트',
      expectedDays: 3,
    },
    {
      id: 'closeout',
      label: '마무리',
      description: '회고와 보고서를 작성하고 프로젝트를 종료합니다.',
      screen: '/reports/weekly',
      action: '보고서 작성',
      aiHint: '주간 보고서 자동 생성해줘',
      expectedDays: 2,
    },
  ],
};

const TASK_LIFECYCLE: BusinessFlow = {
  id: 'task-lifecycle',
  name: '태스크 라이프사이클',
  description: '단일 태스크의 생성·진행·완료 흐름',
  category: 'task',
  steps: [
    {
      id: 'create',
      label: '생성',
      description: '태스크 제목·담당자·기한을 입력합니다.',
      screen: '/tasks',
      action: '태스크 생성',
      aiHint: '태스크 작성 팁 알려줘',
      expectedDays: 1,
    },
    {
      id: 'doing',
      label: '진행',
      description: '담당자가 작업을 수행합니다.',
      screen: '/tasks',
      action: '진행 상태 변경',
      aiHint: '이 태스크 우선순위 평가해줘',
      expectedDays: 5,
    },
    {
      id: 'review',
      label: '리뷰',
      description: '리뷰어가 결과물을 확인합니다.',
      screen: '/approvals',
      action: '리뷰 요청',
      aiHint: '리뷰 요청 메시지 작성',
      expectedDays: 2,
    },
    {
      id: 'done',
      label: '완료',
      description: '태스크를 완료 처리합니다.',
      screen: '/tasks',
      action: '완료 처리',
      aiHint: '다음 태스크 추천해줘',
      expectedDays: 1,
    },
  ],
};

const APPROVAL_LIFECYCLE: BusinessFlow = {
  id: 'approval-lifecycle',
  name: '결재 라이프사이클',
  description: '문서/요청을 작성·결재·완료하는 흐름',
  category: 'approval',
  steps: [
    {
      id: 'draft',
      label: '기안',
      description: '결재 양식에 따라 기안서를 작성합니다.',
      screen: '/approvals',
      action: '기안서 작성',
      aiHint: '기안서 작성 가이드',
      expectedDays: 2,
    },
    {
      id: 'submit',
      label: '상신',
      description: '결재선을 지정하고 상신합니다.',
      screen: '/approvals',
      action: '상신',
      aiHint: '결재선 추천해줘',
      expectedDays: 1,
    },
    {
      id: 'review',
      label: '결재',
      description: '결재자가 검토하고 승인/반려합니다.',
      screen: '/approvals',
      action: '결재 처리',
      aiHint: '결재 시 체크포인트',
      expectedDays: 3,
    },
    {
      id: 'archive',
      label: '보관',
      description: '완료된 결재를 보관합니다.',
      screen: '/docs',
      action: '문서 보관',
      aiHint: '문서 보관 위치 추천',
      expectedDays: 1,
    },
  ],
};

const ISSUE_LIFECYCLE: BusinessFlow = {
  id: 'issue-lifecycle',
  name: '이슈 트래킹 흐름',
  description: '이슈 등록부터 해결까지의 표준 흐름',
  category: 'issue',
  steps: [
    {
      id: 'open',
      label: '등록',
      description: '이슈 제목·심각도·우선순위를 입력합니다.',
      screen: '/issues',
      action: '이슈 등록',
      aiHint: '이슈 작성 베스트 프랙티스',
      expectedDays: 1,
    },
    {
      id: 'triage',
      label: '분류',
      description: '담당자를 지정하고 라벨을 붙입니다.',
      screen: '/issues',
      action: '담당자 지정',
      aiHint: '이슈 자동 분류 도와줘',
      expectedDays: 1,
    },
    {
      id: 'in-progress',
      label: '해결',
      description: '담당자가 이슈를 해결합니다.',
      screen: '/issues',
      action: '진행 상태 갱신',
      aiHint: '비슷한 과거 이슈 찾아줘',
      expectedDays: 7,
    },
    {
      id: 'verify',
      label: '검증',
      description: '리포터가 해결 결과를 확인합니다.',
      screen: '/issues',
      action: '해결 확인',
      aiHint: '검증 체크리스트',
      expectedDays: 2,
    },
    {
      id: 'closed',
      label: '종료',
      description: '이슈를 종료하고 회고합니다.',
      screen: '/issues',
      action: '이슈 종료',
      aiHint: '재발 방지 액션 추천',
      expectedDays: 1,
    },
  ],
};

const REPORT_LIFECYCLE: BusinessFlow = {
  id: 'report-lifecycle',
  name: '보고서 작성 흐름',
  description: '주간/월간 보고서 작성·공유 흐름',
  category: 'report',
  steps: [
    {
      id: 'collect',
      label: '데이터 수집',
      description: '대시보드와 태스크 진척을 확인합니다.',
      screen: '/dashboard',
      action: '데이터 확인',
      aiHint: '이번 주 핵심 지표',
      expectedDays: 1,
    },
    {
      id: 'draft',
      label: '초안 작성',
      description: 'AI 보조로 보고서 초안을 만듭니다.',
      screen: '/reports/weekly',
      action: 'AI 초안 생성',
      aiHint: '주간 보고서 초안 만들어줘',
      expectedDays: 1,
    },
    {
      id: 'review',
      label: '검토',
      description: '내용을 다듬고 첨부를 추가합니다.',
      screen: '/reports/weekly',
      action: '내용 다듬기',
      aiHint: '보고서 톤 자연스럽게',
      expectedDays: 1,
    },
    {
      id: 'share',
      label: '공유',
      description: '팀에 공유하고 피드백을 받습니다.',
      screen: '/reports/weekly',
      action: '팀 공유',
      aiHint: '공유 메시지 작성',
      expectedDays: 1,
    },
  ],
};

const REGISTRY: readonly BusinessFlow[] = [
  PROJECT_LIFECYCLE,
  TASK_LIFECYCLE,
  APPROVAL_LIFECYCLE,
  ISSUE_LIFECYCLE,
  REPORT_LIFECYCLE,
];

export function listFlows(): readonly BusinessFlow[] {
  return REGISTRY;
}

export function getFlow(id: string): BusinessFlow | undefined {
  return REGISTRY.find((f) => f.id === id);
}

/**
 * 현재 단계의 다음 단계를 반환. 없거나 마지막 단계면 undefined.
 */
export function getNextStep(flow: BusinessFlow, currentStepId: string): FlowStep | undefined {
  const idx = flow.steps.findIndex((s) => s.id === currentStepId);
  if (idx < 0 || idx >= flow.steps.length - 1) return undefined;
  return flow.steps[idx + 1];
}

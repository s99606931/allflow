/**
 * 클라이언트측 비즈니스 플로우 카탈로그 — BE flow-registry 와 동일 정의의 미러.
 *
 * 정적 구조라 매번 GET 하지 않고 화면이 직접 import 한다. AI 제안은
 * `api.suggestBusinessFlowNext` 로 BE 호출.
 *
 * 동기 정책: BE flow-registry.ts 변경 시 같은 PR 에서 본 파일도 갱신할 것.
 * (드리프트 방지: e2e/contract 테스트가 향후 양쪽 일치를 검증.)
 */

import type { BusinessFlow } from './api/extended';

export const PROJECT_LIFECYCLE: BusinessFlow = {
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
    },
    {
      id: 'kickoff',
      label: '킥오프',
      description: '팀 구성·역할 분담·태스크 분해를 진행합니다.',
      screen: '/tasks',
      action: '태스크 분해',
      aiHint: '이 프로젝트의 태스크 분해 방법 알려줘',
    },
    {
      id: 'execute',
      label: '실행',
      description: '태스크를 진행하고 일일 진척을 갱신합니다.',
      screen: '/dashboard',
      action: '진행 상황 업데이트',
      aiHint: '오늘 우선순위 정해줘',
    },
    {
      id: 'review',
      label: '검토',
      description: '리뷰어에게 산출물 검토를 요청합니다.',
      screen: '/approvals',
      action: '검토 요청',
      aiHint: '검토 요청 시 작성할 핵심 포인트',
    },
    {
      id: 'closeout',
      label: '마무리',
      description: '회고와 보고서를 작성하고 프로젝트를 종료합니다.',
      screen: '/reports/weekly',
      action: '보고서 작성',
      aiHint: '주간 보고서 자동 생성해줘',
    },
  ],
};

export const TASK_LIFECYCLE: BusinessFlow = {
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
    },
    {
      id: 'doing',
      label: '진행',
      description: '담당자가 작업을 수행합니다.',
      screen: '/tasks',
      action: '진행 상태 변경',
      aiHint: '이 태스크 우선순위 평가해줘',
    },
    {
      id: 'review',
      label: '리뷰',
      description: '리뷰어가 결과물을 확인합니다.',
      screen: '/approvals',
      action: '리뷰 요청',
      aiHint: '리뷰 요청 메시지 작성',
    },
    {
      id: 'done',
      label: '완료',
      description: '태스크를 완료 처리합니다.',
      screen: '/tasks',
      action: '완료 처리',
      aiHint: '다음 태스크 추천해줘',
    },
  ],
};

export const APPROVAL_LIFECYCLE: BusinessFlow = {
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
    },
    {
      id: 'submit',
      label: '상신',
      description: '결재선을 지정하고 상신합니다.',
      screen: '/approvals',
      action: '상신',
      aiHint: '결재선 추천해줘',
    },
    {
      id: 'review',
      label: '결재',
      description: '결재자가 검토하고 승인/반려합니다.',
      screen: '/approvals',
      action: '결재 처리',
      aiHint: '결재 시 체크포인트',
    },
    {
      id: 'archive',
      label: '보관',
      description: '완료된 결재를 보관합니다.',
      screen: '/docs',
      action: '문서 보관',
      aiHint: '문서 보관 위치 추천',
    },
  ],
};

export const ISSUE_LIFECYCLE: BusinessFlow = {
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
    },
    {
      id: 'triage',
      label: '분류',
      description: '담당자를 지정하고 라벨을 붙입니다.',
      screen: '/issues',
      action: '담당자 지정',
      aiHint: '이슈 자동 분류 도와줘',
    },
    {
      id: 'in-progress',
      label: '해결',
      description: '담당자가 이슈를 해결합니다.',
      screen: '/issues',
      action: '진행 상태 갱신',
      aiHint: '비슷한 과거 이슈 찾아줘',
    },
    {
      id: 'verify',
      label: '검증',
      description: '리포터가 해결 결과를 확인합니다.',
      screen: '/issues',
      action: '해결 확인',
      aiHint: '검증 체크리스트',
    },
    {
      id: 'closed',
      label: '종료',
      description: '이슈를 종료하고 회고합니다.',
      screen: '/issues',
      action: '이슈 종료',
      aiHint: '재발 방지 액션 추천',
    },
  ],
};

export const REPORT_LIFECYCLE: BusinessFlow = {
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
    },
    {
      id: 'draft',
      label: '초안 작성',
      description: 'AI 보조로 보고서 초안을 만듭니다.',
      screen: '/reports/weekly',
      action: 'AI 초안 생성',
      aiHint: '주간 보고서 초안 만들어줘',
    },
    {
      id: 'review',
      label: '검토',
      description: '내용을 다듬고 첨부를 추가합니다.',
      screen: '/reports/weekly',
      action: '내용 다듬기',
      aiHint: '보고서 톤 자연스럽게',
    },
    {
      id: 'share',
      label: '공유',
      description: '팀에 공유하고 피드백을 받습니다.',
      screen: '/reports/weekly',
      action: '팀 공유',
      aiHint: '공유 메시지 작성',
    },
  ],
};

export const BUSINESS_FLOWS = {
  project: PROJECT_LIFECYCLE,
  task: TASK_LIFECYCLE,
  approval: APPROVAL_LIFECYCLE,
  issue: ISSUE_LIFECYCLE,
  report: REPORT_LIFECYCLE,
} as const;

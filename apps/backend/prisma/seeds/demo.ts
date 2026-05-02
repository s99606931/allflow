/**
 * Demo seed — 데모/테스트용 풍부한 시드.
 *
 * 목적: 모든 메뉴(대시보드/프로젝트/태스크/이슈/캘린더/리소스/HR/승인/클라이언트/AI/문서/채널)에
 *        의미있는 데이터를 채워 즉시 테스트 가능한 상태를 만든다.
 * 사용 시나리오: QA, 데모 시연, FE/BE 개발자 로컬 테스트.
 *
 * 실행: pnpm seed:demo  (apps/backend 에서)
 *       pnpm seed demo   (root 에서)
 *
 * 멱등: upsert 기반. 재실행 안전.
 *
 * 데이터 구성:
 *   - 7 users / 8 projects / 32 tasks / 8 issues
 *   - 5 approvals / 5 clients / 6 events / 4 resources / 6 bookings
 *   - 6 notifications / 3 channels / 12 messages
 *   - 4 leave-requests / 5 docs / 2 ai-threads (5 messages)
 *   - 1 LLM 연결 (LMStudio)
 */
import type { PrismaClient as _PrismaClient } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import {
  DEMO_ISSUES,
  DEMO_PROJECTS,
  DEMO_TASKS,
  DEMO_USERS,
} from './_shared.js';

const prisma = new PrismaClient();

async function seedUsers() {
  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name, role: u.role, dept: u.dept, initials: u.initials, color: u.color, email: u.email },
      create: u,
    });
  }
}

async function seedProjects() {
  for (const p of DEMO_PROJECTS) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        code: p.code,
        color: p.color,
        progress: p.progress,
        ...(p.budget !== undefined ? { budget: p.budget } : {}),
        status: p.status,
        due: new Date(p.due),
      },
      create: {
        id: p.id,
        name: p.name,
        code: p.code,
        color: p.color,
        progress: p.progress,
        ...(p.budget !== undefined ? { budget: p.budget } : {}),
        status: p.status,
        due: new Date(p.due),
      },
    });
    for (const userId of p.members) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: p.id, userId } },
        update: {},
        create: { projectId: p.id, userId, role: userId === p.members[0] ? 'owner' : 'member' },
      });
    }
  }
}

async function seedTasks() {
  for (const t of DEMO_TASKS) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {
        title: t.title,
        status: t.status,
        due: t.due,
        priority: t.priority,
        tags: t.tags,
        projectId: t.proj,
        assigneeId: t.assignee,
      },
      create: {
        id: t.id,
        title: t.title,
        status: t.status,
        due: t.due,
        priority: t.priority,
        tags: t.tags,
        projectId: t.proj,
        assigneeId: t.assignee,
      },
    });
  }
}

async function seedIssues() {
  for (const i of DEMO_ISSUES) {
    await prisma.issue.upsert({
      where: { id: i.id },
      update: {
        title: i.title,
        projColor: i.projColor,
        sev: i.sev,
        prio: i.prio,
        status: i.status,
        tags: i.tags,
        sla: i.sla,
        slaPct: i.slaPct,
        linked: i.linked,
        resolved: i.resolved ?? false,
        projectId: i.proj,
        assigneeId: i.assignee,
        reporterId: i.reporter,
      },
      create: {
        id: i.id,
        title: i.title,
        projColor: i.projColor,
        sev: i.sev,
        prio: i.prio,
        status: i.status,
        tags: i.tags,
        sla: i.sla,
        slaPct: i.slaPct,
        linked: i.linked,
        resolved: i.resolved ?? false,
        projectId: i.proj,
        assigneeId: i.assignee,
        reporterId: i.reporter,
      },
    });
  }
}

async function seedApprovals() {
  const rows = [
    { id: 'AP-001', title: '신규 사옥 IT 장비 구매', requesterId: 'u6', approverId: 'me', status: 'pending' as const, amount: 15_000_000, reason: '4분기 인프라 확장' },
    { id: 'AP-002', title: 'Q2 마케팅 외주 계약', requesterId: 'u5', approverId: 'me', status: 'approved' as const, amount: 8_500_000, reason: '캠페인 영상 제작', decidedAt: new Date('2026-04-25') },
    { id: 'AP-003', title: '결제 모듈 외부 컨설팅', requesterId: 'u3', approverId: 'u6', status: 'pending' as const, amount: 5_000_000, reason: 'PG 연동 리뷰' },
    { id: 'AP-004', title: 'iOS 개발자 신규 채용 승인', requesterId: 'u6', approverId: 'me', status: 'rejected' as const, amount: null, reason: '예산 재검토 필요', decidedAt: new Date('2026-04-20') },
    { id: 'AP-005', title: '디자인 툴 라이선스 갱신', requesterId: 'u1', approverId: 'me', status: 'approved' as const, amount: 1_200_000, reason: 'Figma Org 플랜', decidedAt: new Date('2026-04-22') },
  ];
  for (const r of rows) {
    await prisma.approval.upsert({
      where: { id: r.id },
      update: {
        title: r.title,
        requesterId: r.requesterId,
        approverId: r.approverId,
        status: r.status,
        amount: r.amount,
        reason: r.reason,
        decidedAt: r.decidedAt ?? null,
      },
      create: r,
    });
  }
}

async function seedClients() {
  const rows = [
    { id: 'CL-001', name: '오믈렛 미디어', contact: '김대표', email: 'contact@omelet.media', phone: '02-1234-5678', industry: '미디어', ownerId: 'u5' },
    { id: 'CL-002', name: '핀테크넥스트', contact: '박이사', email: 'biz@fintechnext.co.kr', phone: '02-2345-6789', industry: '핀테크', ownerId: 'u3' },
    { id: 'CL-003', name: '커머스헤븐', contact: '이팀장', email: 'partner@commerce.heaven', phone: '02-3456-7890', industry: '이커머스', ownerId: 'me' },
    { id: 'CL-004', name: '에듀테크랩', contact: '최교수', email: 'edu@edutechlab.kr', phone: '02-4567-8901', industry: '교육', ownerId: 'u1' },
    { id: 'CL-005', name: '헬스케어플러스', contact: '정원장', email: 'cs@healthcare.plus', phone: '02-5678-9012', industry: '헬스케어', ownerId: 'u3' },
  ];
  for (const r of rows) {
    await prisma.client.upsert({
      where: { id: r.id },
      update: r,
      create: r,
    });
  }
}

async function seedResourcesAndBookings() {
  const resources = [
    { id: 'R-001', name: '대회의실 (10층)', kind: 'room' as const, capacity: 20, location: '본사 10층' },
    { id: 'R-002', name: '소회의실 A (10층)', kind: 'room' as const, capacity: 6, location: '본사 10층' },
    { id: 'R-003', name: '소회의실 B (11층)', kind: 'room' as const, capacity: 6, location: '본사 11층' },
    { id: 'R-004', name: '프로젝터 1', kind: 'equipment' as const, capacity: 1, location: '본사 10층' },
  ];
  for (const r of resources) {
    await prisma.resource.upsert({ where: { id: r.id }, update: r, create: r });
  }

  const today = new Date();
  const bookings = [
    { id: 'BK-001', resourceId: 'R-001', start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0), bookedBy: 'me' },
    { id: 'BK-002', resourceId: 'R-001', start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0), bookedBy: 'u5' },
    { id: 'BK-003', resourceId: 'R-002', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 11, 0), bookedBy: 'u1' },
    { id: 'BK-004', resourceId: 'R-003', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 30), bookedBy: 'u3' },
    { id: 'BK-005', resourceId: 'R-004', start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0), bookedBy: 'u5' },
    { id: 'BK-006', resourceId: 'R-002', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 9, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 10, 0), bookedBy: 'u2' },
  ];
  for (const b of bookings) {
    await prisma.booking.upsert({ where: { id: b.id }, update: b, create: b });
  }
}

async function seedEvents() {
  const today = new Date();
  const events = [
    { id: 'EV-001', title: '주간 스탠드업', start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30), location: '대회의실', attendees: ['me', 'u1', 'u2', 'u3'], resourceId: 'R-001', source: 'internal' as const, createdById: 'me' },
    { id: 'EV-002', title: 'Q2 캠페인 KPI 리뷰', start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0), location: '대회의실', attendees: ['me', 'u5', 'u1'], resourceId: 'R-001', source: 'internal' as const, createdById: 'u5' },
    { id: 'EV-003', title: '디자인 시스템 정렬', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 11, 0), location: '소회의실 A', attendees: ['u1', 'me'], resourceId: 'R-002', source: 'internal' as const, createdById: 'u1' },
    { id: 'EV-004', title: '결제 시스템 아키텍처 리뷰', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 30), location: '소회의실 B', attendees: ['u3', 'u6'], resourceId: 'R-003', source: 'internal' as const, createdById: 'u6' },
    { id: 'EV-005', title: '월간 전사 회의', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 16, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 17, 0), location: '대회의실', attendees: ['me', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6'], resourceId: 'R-001', source: 'internal' as const, createdById: 'u6' },
    { id: 'EV-006', title: '클라이언트 미팅 (커머스헤븐)', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 11, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 12, 0), location: 'Zoom', attendees: ['me', 'u5'], resourceId: null, source: 'google' as const, createdById: 'me' },
  ];
  for (const e of events) {
    await prisma.event.upsert({ where: { id: e.id }, update: e, create: e });
  }
}

async function seedNotifications() {
  const rows = [
    { id: 'N-001', userId: 'me', kind: 'mention' as const, title: '@김지우 — 결제 webhook 멱등성 검증', body: 'T-1025 에서 멘션되었습니다', actor: 'u3', href: '/tasks?id=T-1025', read: false },
    { id: 'N-002', userId: 'me', kind: 'sla' as const, title: 'SLA 임박 — ISS-238', body: 'P0 이슈 SLA 잔여 8% (1시간)', actor: 'system', href: '/issues?id=ISS-238', read: false },
    { id: 'N-003', userId: 'me', kind: 'ai' as const, title: 'AI 분석 완료', body: '주간 회고 회의록 → 액션 12건 추출', actor: 'system', href: '/reports', read: false },
    { id: 'N-004', userId: 'me', kind: 'comment' as const, title: '박서연님이 댓글을 남겼습니다', body: '온보딩 플로우 인터랙션 — 좋아요!', actor: 'u1', href: '/tasks?id=T-1024', read: true },
    { id: 'N-005', userId: 'me', kind: 'system' as const, title: '주간 리포트 준비됨', body: '4월 4주차 리포트가 생성되었습니다', actor: 'system', href: '/reports', read: true },
    { id: 'N-006', userId: 'u3', kind: 'mention' as const, title: '@최민지 — 결제 시스템 부하 테스트', body: 'T-1038 할당됨', actor: 'me', href: '/tasks?id=T-1038', read: false },
  ];
  for (const r of rows) {
    await prisma.notification.upsert({ where: { id: r.id }, update: r, create: r });
  }
}

async function seedChannelsAndMessages() {
  const channels = [
    { id: 'CH-001', name: 'general', kind: 'public' as const },
    { id: 'CH-002', name: 'engineering', kind: 'public' as const },
    { id: 'CH-003', name: 'design', kind: 'private' as const },
  ];
  for (const c of channels) {
    await prisma.channel.upsert({ where: { id: c.id }, update: c, create: c });
  }

  const messages = [
    { id: 'M-001', channelId: 'CH-001', authorId: 'me', content: '오늘 스탠드업 9시에 대회의실에서 시작합니다.' },
    { id: 'M-002', channelId: 'CH-001', authorId: 'u1', content: '온보딩 디자인 토큰 v3 작업 진행 중입니다.' },
    { id: 'M-003', channelId: 'CH-001', authorId: 'u3', content: '결제 webhook 멱등성 검증 PR 올렸습니다. 리뷰 부탁드려요.' },
    { id: 'M-004', channelId: 'CH-001', authorId: 'u5', content: 'Q2 캠페인 KPI 리뷰 14시 가능하실까요?' },
    { id: 'M-005', channelId: 'CH-002', authorId: 'u3', content: 'OpenTelemetry 도입 PoC 시작했습니다. RFC 공유 예정.' },
    { id: 'M-006', channelId: 'CH-002', authorId: 'u2', content: 'CI 캐시 최적화 후 빌드 시간 30% 단축됐습니다.' },
    { id: 'M-007', channelId: 'CH-002', authorId: 'u6', content: 'CTO 일정 — 5/6 KPI 워크숍 참석합니다.' },
    { id: 'M-008', channelId: 'CH-002', authorId: 'u4', content: 'iOS 17 푸시 카테고리 액션 — Apple 응답 대기 중입니다.' },
    { id: 'M-009', channelId: 'CH-003', authorId: 'u1', content: '디자인 토큰 v3 RFC 공유합니다.' },
    { id: 'M-010', channelId: 'CH-003', authorId: 'me', content: '검토 완료. 승인합니다.' },
    { id: 'M-011', channelId: 'CH-003', authorId: 'u1', content: '감사합니다. 다음주부터 적용 시작할게요.' },
    { id: 'M-012', channelId: 'CH-001', authorId: 'me', content: '월간 전사 회의 — 다음주 금요일 16시.' },
  ];
  for (const m of messages) {
    await prisma.message.upsert({ where: { id: m.id }, update: m, create: m });
  }
}

async function seedLeaveRequests() {
  const today = new Date();
  const rows = [
    { id: 'LV-001', requesterId: 'u1', approverId: 'me', type: 'ANNUAL' as const, status: 'APPROVED' as const, startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7), endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9), reason: '가족 여행' },
    { id: 'LV-002', requesterId: 'u3', approverId: 'me', type: 'SICK' as const, status: 'APPROVED' as const, startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), reason: '몸살' },
    { id: 'LV-003', requesterId: 'u4', approverId: 'me', type: 'ANNUAL' as const, status: 'PENDING' as const, startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14), endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 16), reason: '개인 사유' },
    { id: 'LV-004', requesterId: 'u5', approverId: 'me', type: 'PERSONAL' as const, status: 'REJECTED' as const, startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 21), endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 22), reason: 'Q2 캠페인 마감 일정과 겹침' },
  ];
  for (const r of rows) {
    await prisma.leaveRequest.upsert({ where: { id: r.id }, update: r, create: r });
  }
}

async function seedDocs() {
  const rows = [
    { id: 'DOC-001', title: '온보딩 가이드', content: '# 온보딩 가이드\n\n신규 입사자를 위한 첫 주 안내입니다.', ownerId: 'me' },
    { id: 'DOC-002', title: '아키텍처 개요', content: '# 시스템 아키텍처\n\nFastify + Prisma + Postgres + Redis 기반.', ownerId: 'u3' },
    { id: 'DOC-003', title: '디자인 토큰 v3 RFC', content: '# 디자인 토큰 v3\n\n색상/타이포/스페이싱 토큰 정의.', ownerId: 'u1' },
    { id: 'DOC-004', title: '결제 시스템 운영 매뉴얼', content: '# 결제 운영\n\nPG 장애 대응 절차.', ownerId: 'u3' },
    { id: 'DOC-005', title: 'Q2 마케팅 KPI 정의', content: '# Q2 KPI\n\nCTR/전환율/CAC 목표.', ownerId: 'u5' },
  ];
  for (const r of rows) {
    await prisma.doc.upsert({ where: { id: r.id }, update: r, create: r });
  }
}

async function seedAiThreads() {
  const threads = [
    { id: 'AI-T-001', title: '주간 회고 액션 추출', userId: 'me' },
    { id: 'AI-T-002', title: '결제 웹훅 멱등성 점검', userId: 'u3' },
  ];
  for (const t of threads) {
    await prisma.aiThread.upsert({ where: { id: t.id }, update: t, create: t });
  }

  const messages = [
    { id: 'AI-M-001', threadId: 'AI-T-001', role: 'user' as const, content: '주간 회고 회의록에서 액션 아이템 추출해줘' },
    { id: 'AI-M-002', threadId: 'AI-T-001', role: 'assistant' as const, content: '회의록에서 12개의 액션 아이템을 식별했습니다. (1) 온보딩 인터랙션 ... ', model: 'gemma-4-e4b-it' },
    { id: 'AI-M-003', threadId: 'AI-T-002', role: 'user' as const, content: '결제 webhook 멱등성 패턴 베스트 프랙티스는?' },
    { id: 'AI-M-004', threadId: 'AI-T-002', role: 'assistant' as const, content: '멱등 키 + 처리 상태 저장 + 재시도 안전성 3가지 핵심입니다 ...', model: 'gemma-4-e4b-it' },
    { id: 'AI-M-005', threadId: 'AI-T-002', role: 'user' as const, content: '구현 예시 보여줘' },
  ];
  for (const m of messages) {
    await prisma.aiMessage.upsert({ where: { id: m.id }, update: m, create: m });
  }
}

async function seedLlmConnection() {
  const existingDefault = await prisma.llmConnection.findFirst({ where: { isDefault: true } });
  if (existingDefault) {
    await prisma.llmConnection.update({
      where: { id: existingDefault.id },
      data: {
        name: 'LMStudio (local)',
        kind: 'lmstudio',
        baseUrl: 'http://192.168.0.104:1234',
        model: 'gemma-4-e4b-it',
      },
    });
  } else {
    const activeExists = await prisma.llmConnection.findFirst({ where: { isActive: true } });
    await prisma.llmConnection.create({
      data: {
        name: 'LMStudio (local)',
        kind: 'lmstudio',
        baseUrl: 'http://192.168.0.104:1234',
        model: 'gemma-4-e4b-it',
        apiKey: null,
        isDefault: true,
        isActive: !activeExists,
      },
    });
  }
}

async function main() {
  await seedUsers();
  await seedProjects();
  await seedTasks();
  await seedIssues();
  await seedApprovals();
  await seedClients();
  await seedResourcesAndBookings();
  await seedEvents();
  await seedNotifications();
  await seedChannelsAndMessages();
  await seedLeaveRequests();
  await seedDocs();
  await seedAiThreads();
  await seedLlmConnection();

  process.stdout.write(
    '[seed:demo] OK — 7 users / 8 projects / 32 tasks / 8 issues / 5 approvals / 5 clients / 6 events / 4 resources / 6 bookings / 6 notifications / 3 channels / 12 messages / 4 leaves / 5 docs / 2 ai-threads.\n',
  );
}

main()
  .catch((err) => {
    process.stderr.write(`[seed:demo] FAILED: ${(err as Error).message}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

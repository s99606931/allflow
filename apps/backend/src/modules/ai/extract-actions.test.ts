/**
 * T-403 — extract-actions 단위 테스트.
 *
 * AI 어댑터(InMemory) 의 결정론적 응답을 사용해 5개 source 모두 한 번씩 검증.
 */
import { describe, expect, it } from 'vitest';
import { InMemoryAIAdapter } from './ai-adapter.js';
import {
  buildPrompt,
  DEFAULT_THRESHOLD,
  extractActions,
  parseActionsResponse,
  SOURCES,
} from './extract-actions.js';

const VALID_RESPONSE = JSON.stringify({
  actions: [
    {
      title: '디자인 검토 회의 일정 잡기',
      assignee: '박서연',
      due: '2026-04-30',
      priority: 'high',
      confidence: 0.92,
      sourceQuote: '내일까지 디자인 리뷰 부탁드립니다',
    },
    {
      title: '백엔드 API 명세 검토',
      assignee: '김지우',
      confidence: 0.55,
    },
  ],
});

const FENCED_RESPONSE = `\`\`\`json\n${VALID_RESPONSE}\n\`\`\``;

const INVALID_RESPONSE = 'I cannot help with that.';

const MIXED_RESPONSE = JSON.stringify({
  actions: [
    { title: 'OK action', assignee: 'X', confidence: 0.85 },
    { title: 'No assignee', confidence: 0.95 }, // assignee 누락 → 검증 탈락
    { foo: 'bar' }, // 완전 무효 → 탈락
  ],
});

describe('modules/ai/extract-actions', () => {
  it('buildPrompt — 5개 source 모두 system + user 메시지 생성', () => {
    for (const source of SOURCES) {
      const msgs = buildPrompt({ source, content: '본문' });
      expect(msgs).toHaveLength(2);
      expect(msgs[0]?.role).toBe('system');
      expect(msgs[1]?.role).toBe('user');
      expect(msgs[1]?.content).toContain(source);
    }
  });

  it('parseActionsResponse — 정상 JSON', () => {
    const r = parseActionsResponse(VALID_RESPONSE);
    expect(r.actions).toHaveLength(2);
  });

  it('parseActionsResponse — ```json fenced 블록도 허용', () => {
    const r = parseActionsResponse(FENCED_RESPONSE);
    expect(r.actions).toHaveLength(2);
  });

  it('parseActionsResponse — 잘못된 JSON → 빈 배열', () => {
    const r = parseActionsResponse(INVALID_RESPONSE);
    expect(r.actions).toEqual([]);
  });

  it('extractActions — confidence ≥ default threshold(0.7) 만 통과', async () => {
    const promptKey = buildPrompt({ source: 'meeting', content: '디자인 리뷰' })[1]?.content ?? '';
    const adapter = new InMemoryAIAdapter({ [promptKey]: VALID_RESPONSE });
    const result = await extractActions(adapter, { source: 'meeting', content: '디자인 리뷰' });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toContain('디자인 검토');
    expect(result[0]?.confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });

  it('extractActions — threshold=0.5 이면 두 건 모두 통과', async () => {
    const promptKey = buildPrompt({ source: 'email', content: '내일 리뷰' })[1]?.content ?? '';
    const adapter = new InMemoryAIAdapter({ [promptKey]: VALID_RESPONSE });
    const result = await extractActions(adapter, {
      source: 'email',
      content: '내일 리뷰',
      threshold: 0.5,
    });
    expect(result).toHaveLength(2);
  });

  it('extractActions — 무효 액션 섞인 응답은 ExtractedAction 검증으로 필터링', async () => {
    const promptKey = buildPrompt({ source: 'voice', content: 'STT' })[1]?.content ?? '';
    const adapter = new InMemoryAIAdapter({ [promptKey]: MIXED_RESPONSE });
    const result = await extractActions(adapter, { source: 'voice', content: 'STT' });
    // 첫 번째만 유효 (assignee + confidence 있음)
    expect(result).toHaveLength(1);
    expect(result[0]?.assignee).toBe('X');
  });

  it('extractActions — 모델이 액션을 못 찾으면 빈 배열', async () => {
    const adapter = new InMemoryAIAdapter({});
    const result = await extractActions(adapter, { source: 'csv', content: 'col1,col2\n1,2' });
    expect(result).toEqual([]);
  });
});

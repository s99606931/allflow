/**
 * T-403 — 액션 아이템 추출.
 *
 * 입력 소스 5종(meeting/email/voice/notion/csv) 의 텍스트에서 ExtractedAction 배열을 추출한다.
 *
 * 동작:
 *  1) source 별 system 프롬프트 + few-shot 가이드 합성
 *  2) AIAdapter.complete() 호출 → JSON 응답 기대
 *  3) 응답을 ExtractedAction[] 로 검증 (zod) — 실패 시 빈 배열로 fallback
 *  4) confidence ≥ threshold 만 필터 (default 0.7)
 *
 * 외부 의존성: 없음 (어댑터 주입). prompt-injection 등 가드는 후속.
 */
import { z } from 'zod';
import { ExtractedAction } from '../../shared/schemas/index.js';
import type { AIAdapter, AIMessage } from './ai-adapter.js';

export const SOURCES = ['meeting', 'email', 'voice', 'notion', 'csv'] as const;
export type ExtractSource = (typeof SOURCES)[number];

export const DEFAULT_THRESHOLD = 0.7;

export interface ExtractActionsInput {
  source: ExtractSource;
  content: string;
  threshold?: number;
}

/** 외부 envelope 만 검증 — 개별 action 은 호출부에서 ExtractedAction 으로 재검증한다. */
const ResponseEnvelopeSchema = z.object({
  actions: z.array(z.unknown()),
});

const SOURCE_HINTS: Record<ExtractSource, string> = {
  meeting:
    '회의록입니다. 결정 사항(decision)/할 일(action item)/책임자(owner)/기한(due) 위주로 추출하세요.',
  email: '이메일 본문입니다. 송수신자 간 명시적 액션 요청 위주로 추출하세요.',
  voice:
    '음성 인식 전사본(STT)입니다. 잘못된 단어가 섞여있을 수 있으니 문맥 기반으로 보정하여 추출하세요.',
  notion: 'Notion 페이지 텍스트입니다. 체크박스/할 일/배정자 표기를 우선 인식하세요.',
  csv: 'CSV 표 형식입니다. 첫 행이 헤더, 각 행이 작업 항목입니다. 헤더 매핑 후 추출하세요.',
};

const SYSTEM_PROMPT = `당신은 한국어 텍스트에서 실행 가능한 액션 아이템을 추출하는 어시스턴트입니다.

응답은 다음 JSON 형식만 출력하세요 (코드블록/주석 금지):
{
  "actions": [
    {
      "title": "작업 제목 (간결, 능동태)",
      "assignee": "담당자 이름 (없으면 미정)",
      "due": "ISO 8601 또는 자연어 기한 (선택)",
      "priority": "high|med|low (선택)",
      "confidence": 0~1 사이 신뢰도,
      "sourceQuote": "원문 인용 (선택)"
    }
  ]
}

확신이 낮으면 confidence 를 낮게 설정하세요. 추출할 액션이 없으면 actions:[] 를 반환하세요.`;

export function buildPrompt(input: ExtractActionsInput): AIMessage[] {
  const hint = SOURCE_HINTS[input.source];
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `소스 유형: ${input.source}\n${hint}\n\n--- 본문 시작 ---\n${input.content}\n--- 본문 끝 ---\n\nJSON 만 출력:`,
    },
  ];
}

/**
 * AI 응답 텍스트에서 JSON 객체 부분만 추출 후 파싱.
 * 모델이 코드블록을 섞어 보낼 경우 ```json ... ``` 도 허용.
 */
export function parseActionsResponse(raw: string): { actions: unknown[] } {
  const cleaned = stripCodeFence(raw).trim();
  if (cleaned.length === 0) return { actions: [] };
  try {
    const parsed = JSON.parse(cleaned);
    const result = ResponseEnvelopeSchema.safeParse(parsed);
    if (result.success) return { actions: result.data.actions };
    return { actions: [] };
  } catch {
    return { actions: [] };
  }
}

const FENCE_RE = /^```(?:json)?\s*([\s\S]*?)\s*```$/;

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const m = FENCE_RE.exec(trimmed);
  return m?.[1] ?? trimmed;
}

export async function extractActions(
  adapter: AIAdapter,
  input: ExtractActionsInput,
  meta: { traceId?: string } = {},
): Promise<z.infer<typeof ExtractedAction>[]> {
  const messages = buildPrompt(input);
  const result = await adapter.complete(messages, {
    traceId: meta.traceId,
    temperature: 0.1,
  });
  const parsed = parseActionsResponse(result.text);
  const validated = parsed.actions
    .map((a) => ExtractedAction.safeParse(a))
    .filter((r): r is { success: true; data: z.infer<typeof ExtractedAction> } => r.success)
    .map((r) => r.data);
  const threshold = input.threshold ?? DEFAULT_THRESHOLD;
  return validated.filter((a) => a.confidence >= threshold);
}

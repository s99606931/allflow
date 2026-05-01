/**
 * AiChatPanel — free-form chat panel that wires `POST /ai/complete` (FE-W6).
 *
 * Lightweight single-thread chat. Each user prompt fires `aiComplete` and the
 * resulting text is appended as an assistant turn. No persistence — turns live
 * in component state and reset on unmount.
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from '@/components/ui/primitives';
import { TextInput } from '@/components/ui/dialog';
import { useAiMutations } from '@/lib/hooks/use-data';
import type { AiUsageMetric } from '@/lib/api';
import { Sparkles, Send, Trash2 } from 'lucide-react';

type Turn = { role: 'user' | 'assistant'; text: string; usage?: AiUsageMetric };

function formatUsage(u: AiUsageMetric): string {
  const tokens = `${u.promptTokens}↑ + ${u.completionTokens}↓ = ${u.totalTokens} tok`;
  const cost = u.costUSD === null ? '비용 N/A' : `$${u.costUSD.toFixed(6)}`;
  const model = u.model ? ` · ${u.model}` : '';
  return `${tokens} · ${cost}${model}`;
}

export function AiChatPanel() {
  const { complete } = useAiMutations();
  const [prompt, setPrompt] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const value = prompt.trim();
    if (!value || complete.isPending) return;
    setTurns(prev => [...prev, { role: 'user', text: value }]);
    setPrompt('');
    const reply = await complete.mutateAsync(value);
    setTurns(prev => [
      ...prev,
      {
        role: 'assistant',
        text: reply.text,
        ...(reply.usage ? { usage: reply.usage } : {}),
      },
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 도우미</CardTitle>
        <Badge tone="accent"><Sparkles size={10} /> 자유 채팅</Badge>
        {turns.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTurns([])}
            aria-label="대화 기록 지우기"
          >
            <Trash2 size={12} /> 초기화
          </Button>
        )}
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="space-y-2 max-h-[260px] overflow-y-auto">
          {turns.length === 0 && (
            <div className="py-6 text-center text-fg-3 text-[12.5px]">
              질문을 입력하면 AI가 답변합니다.
            </div>
          )}
          {turns.map((turn, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
                turn.role === 'user'
                  ? 'bg-bg-1 border border-border text-fg'
                  : 'bg-accent-soft border border-accent/30 text-fg'
              }`}
            >
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1">
                {turn.role === 'user' ? '사용자' : 'AI'}
              </div>
              {turn.text}
              {turn.role === 'assistant' && turn.usage && (
                <div
                  className="mt-1.5 pt-1.5 border-t border-accent/20 text-[10.5px] text-fg-3 font-mono"
                  data-testid="ai-usage-metric"
                >
                  {formatUsage(turn.usage)}
                </div>
              )}
            </div>
          ))}
          {complete.isPending && (
            <div className="rounded-lg p-2.5 bg-accent-soft/50 border border-accent/20 text-[12.5px] text-fg-2">
              <span className="inline-block w-3 h-3 mr-1.5 rounded-full border-2 border-accent border-t-transparent animate-spin align-middle" />
              생각 중…
            </div>
          )}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <TextInput
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="무엇이든 물어보세요"
            aria-label="AI 프롬프트"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={complete.isPending || prompt.trim().length === 0}
          >
            <Send size={13} /> 전송
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

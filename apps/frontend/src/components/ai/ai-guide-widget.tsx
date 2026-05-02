'use client';

import { useCallback, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiStream } from '@/lib/hooks/use-ai';

interface AiGuideWidgetProps {
  hints: readonly string[];
  systemContext: string;
  className?: string;
}

export function AiGuideWidget({ hints, systemContext, className }: AiGuideWidgetProps) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const { streamComplete } = useAiStream();

  const ask = useCallback(
    async (hint: string) => {
      if (activeHint === hint && response) {
        setActiveHint(null);
        setResponse('');
        return;
      }
      setActiveHint(hint);
      setResponse('');
      setLoading(true);
      await streamComplete(
        `[현재 화면 컨텍스트: ${systemContext}]\n\n사용자 질문: ${hint}\n\n한국어로 2~4문장으로 간결하게 안내해 주세요.`,
        (delta) => setResponse((prev) => prev + delta),
        () => setLoading(false),
        { useTools: false },
      );
    },
    [activeHint, response, streamComplete, systemContext],
  );

  const dismiss = useCallback(() => {
    setActiveHint(null);
    setResponse('');
  }, []);

  return (
    <div className={cn('rounded-xl border border-accent/25 bg-accent-soft mb-4', className)}>
      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
        <Sparkles size={12} className="text-accent-strong shrink-0" />
        <span className="text-[11.5px] font-semibold text-accent-strong mr-1">AI 가이드</span>
        <div className="flex gap-1.5 flex-1 flex-wrap">
          {hints.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => ask(h)}
              className={cn(
                'text-[11px] px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer',
                activeHint === h
                  ? 'bg-accent text-accent-fg border-accent'
                  : 'bg-bg border-accent/20 text-fg-1 hover:bg-accent/10 hover:border-accent/40',
              )}
            >
              {h}
            </button>
          ))}
        </div>
        {(response || loading) && (
          <button
            type="button"
            onClick={dismiss}
            className="ml-auto text-fg-3 hover:text-fg transition-colors"
          >
            <X size={11} />
          </button>
        )}
      </div>
      {(loading || response) && (
        <div className="px-3 pb-3 border-t border-accent/15 pt-2">
          {loading && !response && (
            <Loader2 size={12} className="animate-spin text-accent-strong" />
          )}
          {response && (
            <p className="text-[12px] text-fg-1 leading-relaxed whitespace-pre-wrap">{response}</p>
          )}
        </div>
      )}
    </div>
  );
}

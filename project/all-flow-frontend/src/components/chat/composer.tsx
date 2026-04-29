/**
 * Composer — message input that wires `useMessageMutations().send`.
 *
 * Keeps a local draft, supports Enter-to-send (Shift+Enter newline),
 * and bubbles `@` press to a `MentionPopover` via the optional onMention prop.
 */
'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, AtSign, Paperclip, Smile, Sparkles } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/primitives';
import { useMessageMutations } from '@/lib/hooks/use-data';
import { useTranslation } from '@/lib/i18n';

interface Props {
  channelId: string;
  onMention?: () => void;
  onSent?: (text: string) => void;
}

export function Composer({ channelId, onMention, onSent }: Props) {
  const { t } = useTranslation();
  const { send } = useMessageMutations();
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    await send.mutateAsync({ channelId, text: value });
    setText('');
    onSent?.(value);
    ref.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === '@') {
      onMention?.();
    }
  };

  return (
    <div className="rounded-lg border border-border bg-bg-elev focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft transition-colors">
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('chat.placeholder')}
        rows={2}
        aria-label={t('chat.placeholder')}
        className="w-full resize-none bg-transparent px-3 py-2.5 text-[13px] focus:outline-none"
      />
      <div className="flex items-center justify-between px-2 pb-1.5">
        <div className="flex gap-0.5 text-fg-3">
          <IconButton size="sm" type="button" aria-label="첨부"><Paperclip size={13} /></IconButton>
          <IconButton size="sm" type="button" aria-label="멘션" onClick={onMention}>
            <AtSign size={13} />
          </IconButton>
          <IconButton size="sm" type="button" aria-label="이모지"><Smile size={13} /></IconButton>
          <IconButton size="sm" type="button" aria-label="AI 도움" className="text-accent-strong"><Sparkles size={13} /></IconButton>
        </div>
        <Button
          variant="primary"
          size="sm"
          type="button"
          onClick={submit}
          disabled={!text.trim() || send.isPending}
          aria-label={t('chat.send')}
        >
          <ArrowUp size={13} />
        </Button>
      </div>
    </div>
  );
}

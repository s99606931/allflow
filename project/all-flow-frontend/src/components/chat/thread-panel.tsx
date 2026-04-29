/**
 * ThreadPanel — right-rail thread reader for a parent message.
 *
 * Receives the parent message + its replies (parent supplies state) and a
 * `channelId` so the inner Composer posts replies to the same channel.
 */
'use client';

import { Avatar } from '@/components/ui/primitives';
import { Composer } from '@/components/chat/composer';
import { userById } from '@/lib/fixtures';
import { useTranslation } from '@/lib/i18n';

export interface ThreadMessage {
  id: number | string;
  who: string;
  time: string;
  text: string;
}

interface Props {
  channelId: string;
  parent: ThreadMessage;
  replies: ThreadMessage[];
  onReplySent?: (text: string) => void;
}

export function ThreadPanel({ channelId, parent, replies, onReplySent }: Props) {
  const { t } = useTranslation();
  const parentUser = userById(parent.who);
  return (
    <aside aria-label={t('chat.thread')} className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2">
          {parentUser && <Avatar user={parentUser} size={20} />}
          <span className="text-[12.5px] font-semibold text-fg">{parentUser?.name ?? parent.who}</span>
          <span className="text-[10.5px] text-fg-3">{parent.time}</span>
        </div>
        <div className="mt-1 text-[13px] leading-relaxed text-fg-1">{parent.text}</div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {replies.length === 0 && (
          <div className="text-center text-[12px] text-fg-3">아직 답글이 없습니다</div>
        )}
        {replies.map(reply => {
          const user = userById(reply.who);
          return (
            <div key={reply.id} className="flex gap-2">
              {user && <Avatar user={user} size={24} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-semibold text-fg">{user?.name ?? reply.who}</span>
                  <span className="text-[10.5px] text-fg-3">{reply.time}</span>
                </div>
                <div className="text-[12.5px] leading-relaxed text-fg-1">{reply.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border p-3">
        <Composer channelId={channelId} onSent={onReplySent} />
      </div>
    </aside>
  );
}

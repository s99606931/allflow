'use client';

import { useMemo, useState } from 'react';
import { Avatar, Badge, Button, IconButton } from '@/components/ui/primitives';
import { TEAM, ME, userById } from '@/lib/fixtures';
import { Hash, Lock, Plus, Search, Smile, Paperclip, AtSign, Sparkles, ArrowUp, MessageSquare, Pin, X } from 'lucide-react';
import { Composer } from '@/components/chat/composer';
import { ThreadPanel, type ThreadMessage } from '@/components/chat/thread-panel';
import { MentionPopover } from '@/components/chat/mention-popover';
import { useTaskMutations } from '@/lib/hooks/use-data';
import { useTranslation } from '@/lib/i18n';

const CHANNELS = [
  { id: 'general', name: 'general', type: 'public', unread: 0 },
  { id: 'eng', name: 'engineering', type: 'public', unread: 3 },
  { id: 'design', name: 'design', type: 'public', unread: 0 },
  { id: 'random', name: 'random', type: 'public', unread: 12 },
  { id: 'leadership', name: 'leadership', type: 'private', unread: 1 },
];

const DMS = ['u1', 'u2', 'u3', 'u5'];

const MSGS = [
  { id: 1, who: 'u1', time: '10:24', text: '온보딩 v2 시안 공유드려요. 이번엔 다크모드까지 포함해서 만들었어요!', attached: 'figma-link.png' },
  { id: 2, who: 'u2', time: '10:31', text: '@박서연 5번째 화면 motion easing 살짝 더 부드럽게 가능할까요? cubic-bezier(0.22, 1, 0.36, 1) 정도가 좋을 것 같아요.' },
  { id: 3, who: 'u1', time: '10:33', text: '오 좋아요. 적용해서 다시 올려드릴게요 👀' },
  { id: 4, who: 'me', time: '10:45', text: '두 분 다 감사합니다! 5/2까지 QA 마무리되면 5/4 마감 충분히 가능할 것 같아요.', threads: 4 },
  { id: 5, who: 'ai', time: '10:46', text: '이 대화에서 액션 아이템 1건이 추출되었습니다.\n• "디자인 QA + 다크모드 검수 완료" — 박서연, 5/2', extracted: true },
  { id: 6, who: 'u3', time: '11:02', text: '결제 시스템 PG 응답 지연 다시 발생했어요. 백업 라우트 활성화 권한 누가 있나요?' },
];

export function ChatPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState('eng');
  const [messages, setMessages] = useState(MSGS);
  const [openThreadId, setOpenThreadId] = useState<number | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [extractedDismissed, setExtractedDismissed] = useState(false);
  const taskMutations = useTaskMutations();

  const threadParent = useMemo<ThreadMessage | null>(() => {
    const found = messages.find(m => m.id === openThreadId);
    if (!found) return null;
    return { id: found.id, who: found.who, time: found.time, text: found.text };
  }, [openThreadId, messages]);

  const onCreateTaskFromAI = async (text: string) => {
    // Pull the first bullet "• title" from the AI message body.
    const bullet = text.match(/•\s+"?([^"\n]+)"?/);
    const title = bullet ? bullet[1].trim() : '채팅에서 추출된 액션';
    await taskMutations.create.mutateAsync({
      title,
      proj: 'PRJ-204',
      assignee: ME.id,
    });
    setExtractedDismissed(true);
  };

  const onSent = (text: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: prev.length + 1,
        who: ME.id,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        text,
      },
    ]);
  };

  return (
    <div className="grid grid-cols-[260px_1fr_320px] h-[calc(100vh-56px)] border-t border-border">
      {/* Channels sidebar */}
      <div className="bg-bg-1 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
            <input placeholder="채널/사람 검색..." className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-2 border border-border text-[12px] focus:outline-none focus:border-accent" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll p-2">
          <div className="px-2 pt-2 pb-1 flex items-center justify-between">
            <span className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">채널</span>
            <button className="text-fg-3 hover:text-fg-1"><Plus size={12} /></button>
          </div>
          {CHANNELS.map(c => (
            <button key={c.id} onClick={() => setActive(c.id)}
              className={`w-full flex items-center gap-2 px-2 h-7 rounded text-[12.5px] transition-colors ${
                active === c.id ? 'bg-accent-soft text-accent-strong font-semibold' : 'text-fg-1 hover:bg-hover'
              }`}>
              {c.type === 'private' ? <Lock size={12} /> : <Hash size={12} />}
              <span className="flex-1 text-left truncate">{c.name}</span>
              {c.unread > 0 && <span className="text-[10px] mono font-semibold px-1.5 rounded bg-accent text-accent-fg">{c.unread}</span>}
            </button>
          ))}
          <div className="px-2 pt-4 pb-1 flex items-center justify-between">
            <span className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">DM</span>
            <button className="text-fg-3 hover:text-fg-1"><Plus size={12} /></button>
          </div>
          {DMS.map(id => {
            const u = userById(id);
            if (!u) return null;
            return (
              <button key={id} onClick={() => setActive(`dm-${id}`)}
                className={`w-full flex items-center gap-2 px-2 h-7 rounded text-[12.5px] transition-colors ${
                  active === `dm-${id}` ? 'bg-accent-soft text-accent-strong font-semibold' : 'text-fg-1 hover:bg-hover'
                }`}>
                <Avatar user={u} size={16} />
                <span className="flex-1 text-left truncate">{u.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex flex-col bg-bg">
        <header className="h-14 px-5 border-b border-border flex items-center gap-2 shrink-0">
          <Hash size={14} className="text-fg-2" />
          <h2 className="text-[14px] font-bold text-fg">engineering</h2>
          <span className="text-[12px] text-fg-3">· 24명</span>
          <div className="flex-1" />
          <IconButton size="sm"><Pin size={13} /></IconButton>
          <IconButton size="sm"><Search size={13} /></IconButton>
          <Button variant="secondary" size="sm"><Sparkles size={12} /> 대화 요약</Button>
        </header>

        <div className="flex-1 overflow-y-auto scroll p-5 space-y-4">
          {messages.map(m => {
            if (m.who === 'ai') {
              return (
                <div key={m.id} className="flex gap-2.5 rounded-lg border border-accent/20 bg-accent-soft p-3">
                  <div className="w-7 h-7 rounded-md bg-accent text-accent-fg grid place-items-center shrink-0"><Sparkles size={13} /></div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12.5px] font-semibold text-accent-strong">AI 어시스턴트</span>
                      <span className="text-[10.5px] text-fg-3">{m.time}</span>
                    </div>
                    <div className="text-[12.5px] text-fg-1 mt-0.5 whitespace-pre-wrap">{m.text}</div>
                    {m.extracted && !extractedDismissed && (
                      <div className="flex gap-1.5 mt-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onCreateTaskFromAI(m.text)}
                          disabled={taskMutations.create.isPending}
                        >
                          {t('chat.toTask')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setExtractedDismissed(true)}>무시</Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            const u = userById(m.who);
            const mine = m.who === 'me';
            return (
              <div key={m.id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                {u && <Avatar user={u} size={32} />}
                <div className={`flex-1 min-w-0 ${mine ? 'text-right' : ''}`}>
                  <div className={`flex items-baseline gap-2 ${mine ? 'justify-end' : ''}`}>
                    <span className="text-[12.5px] font-semibold text-fg">{u?.name}</span>
                    <span className="text-[10.5px] text-fg-3">{m.time}</span>
                  </div>
                  <div className={`inline-block rounded-lg px-3 py-2 text-[13px] leading-relaxed mt-1 max-w-[600px] text-left ${
                    mine ? 'bg-accent-soft text-fg' : 'bg-bg-1 border border-border text-fg-1'
                  }`}>
                    {m.text}
                  </div>
                  {m.threads && (
                    <div className={`flex items-center gap-1.5 mt-1 text-[11px] text-accent-strong ${mine ? 'justify-end' : ''}`}>
                      <MessageSquare size={11} />
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={() => setOpenThreadId(typeof m.id === 'number' ? m.id : null)}
                        aria-label={t('chat.thread')}
                      >
                        {m.threads}개 답글 · 2분 전
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="relative p-3 border-t border-border bg-bg-1">
          <Composer channelId={active} onSent={onSent} onMention={() => setMentionOpen(true)} />
          <MentionPopover
            open={mentionOpen}
            onClose={() => setMentionOpen(false)}
            onSelect={u => {
              setMentionOpen(false);
              onSent(`@${u.name} `);
            }}
            className="bottom-20 left-3"
          />
        </div>
      </div>

      {/* Right panel — channel info + AI (or thread when active) */}
      {threadParent && (
        <div className="bg-bg-1 border-l border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[12px] font-semibold text-fg">{t('chat.thread')}</span>
            <IconButton size="sm" type="button" aria-label={t('common.close')} onClick={() => setOpenThreadId(null)}>
              <X size={13} />
            </IconButton>
          </div>
          <ThreadPanel
            channelId={active}
            parent={threadParent}
            replies={[]}
          />
        </div>
      )}
      {!threadParent && <div className="bg-bg-1 border-l border-border overflow-y-auto scroll p-4 space-y-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">고정된 메시지 (3)</div>
          <div className="rounded-md border border-border bg-bg-elev p-2.5 text-[11.5px] text-fg-1 leading-relaxed">
            <div className="font-semibold text-fg mb-0.5">📌 배포 가이드</div>
            <span className="text-fg-2">main 브랜치 머지 후 30분 이내 자동 배포...</span>
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">멤버 (24)</div>
          <div className="space-y-1.5">
            {TEAM.slice(0, 6).map(u => (
              <div key={u.id} className="flex items-center gap-2 text-[12px]">
                <Avatar user={u} size={20} />
                <span className="text-fg-1 flex-1 truncate">{u.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
              </div>
            ))}
          </div>
        </div>
      </div>}
    </div>
  );
}

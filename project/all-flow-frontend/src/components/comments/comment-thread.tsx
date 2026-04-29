/**
 * CommentThread — read+write thread for tasks or issues (FE-W8).
 *
 * Single component handles both `/tasks/:id/comments` and
 * `/issues/:id/comments` via the `kind` discriminator.
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { Textarea } from '@/components/ui/dialog';
import {
  useIssueCommentCreate,
  useIssueComments,
  useTaskCommentCreate,
  useTaskComments,
} from '@/lib/hooks/use-data';
import { Loader2, MessageSquare } from 'lucide-react';

interface Props {
  kind: 'task' | 'issue';
  parentId: string;
}

const formatRelative = (iso: string): string => {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return `${Math.round(diffHr / 24)}일 전`;
};

export function CommentThread({ kind, parentId }: Props) {
  const taskList = useTaskComments(kind === 'task' ? parentId : undefined);
  const issueList = useIssueComments(kind === 'issue' ? parentId : undefined);
  const taskCreate = useTaskCommentCreate(parentId);
  const issueCreate = useIssueCommentCreate(parentId);

  const list = kind === 'task' ? taskList : issueList;
  const create = kind === 'task' ? taskCreate : issueCreate;

  const [body, setBody] = useState('');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const value = body.trim();
    if (!value || create.isPending) return;
    await create.mutateAsync({ body: value });
    setBody('');
  };

  const comments = list.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-fg">
        <MessageSquare size={14} className="text-fg-2" />
        댓글
        <span className="text-fg-3 mono text-[11px]">{comments.length}</span>
      </div>

      {list.isLoading && (
        <div className="flex items-center gap-2 text-[12px] text-fg-3 py-2">
          <Loader2 size={12} className="animate-spin" /> 불러오는 중…
        </div>
      )}

      {!list.isLoading && comments.length === 0 && (
        <div className="text-[12px] text-fg-3 py-2">아직 댓글이 없습니다.</div>
      )}

      <ul className="space-y-2">
        {comments.map(c => (
          <li key={c.id} className="rounded-md border border-border bg-bg-1 p-2.5">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[12px] font-semibold text-fg">{c.author.name}</span>
              <span className="text-[10.5px] mono text-fg-3">{formatRelative(c.createdAt)}</span>
            </div>
            <div className="text-[12.5px] text-fg-1 whitespace-pre-wrap leading-relaxed">{c.body}</div>
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="space-y-2">
        <Textarea
          rows={3}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="댓글을 입력하세요"
          aria-label="댓글 입력"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={create.isPending || body.trim().length === 0}
          >
            {create.isPending ? '등록 중…' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}

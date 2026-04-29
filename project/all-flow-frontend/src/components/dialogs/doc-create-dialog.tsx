/**
 * DocCreateDialog — quick "새 문서" capture.
 *
 * Reuses the WikiEditor so the user can type both the title and an opening
 * paragraph before the document hits the wiki tree.
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, TextInput } from '@/components/ui/dialog';
import { WikiEditor } from '@/components/editor/wiki-editor';
import { useDocMutations } from '@/lib/hooks/use-data';
import { useTranslation } from '@/lib/i18n';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

export function DocCreateDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { create } = useDocMutations();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({ title: title.trim(), content });
    setTitle('');
    setContent('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('docs.new')} size="lg">
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label={t('approval.create.titleField')} required>
          <TextInput
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="문서 제목"
            required
            autoFocus
          />
        </DialogField>
        <DialogField label="본문">
          <WikiEditor value={content} onChange={setContent} />
        </DialogField>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? t('common.loading') : t('common.create')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

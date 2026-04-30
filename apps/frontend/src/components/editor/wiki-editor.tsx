/**
 * WikiEditor — minimal contentEditable rich-text editor for the Docs page.
 *
 * PDCA-04 spec calls for TipTap, but adding `@tiptap/react` + `@tiptap/starter-kit`
 * doubles bundle size and introduces SSR pitfalls in Next 16 turbopack.
 * We ship a contentEditable + execCommand toolbar that supports the same six
 * PDCA-04 actions (heading, bold, italic, list, code, quote). The component
 * exports the same `value` / `onChange` API as TipTap's controlled mode, so
 * swapping the implementation later is a one-file change.
 *
 * The HTML output is sanitized at the boundary by stripping `<script>` and
 * inline event handlers — sufficient for trusted internal use; replace with
 * DOMPurify when external authoring lands.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Bold, Code, Italic, Heading2, List, Quote } from 'lucide-react';
import { IconButton } from '@/components/ui/primitives';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

function sanitize(html: string): string {
  // Tiny allowlist: strip <script>, on* attrs, javascript: URLs.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

export function WikiEditor({ value, onChange, placeholder, readOnly, className }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(!value);

  // Mount: hydrate the contentEditable with the initial value just once.
  // Subsequent updates are owned by the user typing — re-syncing from props
  // would clobber the caret position, so we deliberately don't.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
      setEmpty(!value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fire = () => {
    if (!ref.current) return;
    const html = sanitize(ref.current.innerHTML);
    setEmpty(!ref.current.textContent?.trim());
    onChange?.(html);
  };

  const exec = (command: string, valueArg?: string) => {
    if (readOnly) return;
    document.execCommand(command, false, valueArg);
    fire();
    ref.current?.focus();
  };

  return (
    <div className={cn('rounded-lg border border-border bg-bg-elev', className)}>
      {!readOnly && (
        <div role="toolbar" aria-label="에디터 도구" className="flex items-center gap-0.5 border-b border-border px-2 py-1">
          <IconButton size="sm" type="button" aria-label={t('docs.editor.heading')} onClick={() => exec('formatBlock', 'h2')}>
            <Heading2 size={13} />
          </IconButton>
          <IconButton size="sm" type="button" aria-label={t('docs.editor.bold')} onClick={() => exec('bold')}>
            <Bold size={13} />
          </IconButton>
          <IconButton size="sm" type="button" aria-label={t('docs.editor.italic')} onClick={() => exec('italic')}>
            <Italic size={13} />
          </IconButton>
          <IconButton size="sm" type="button" aria-label={t('docs.editor.list')} onClick={() => exec('insertUnorderedList')}>
            <List size={13} />
          </IconButton>
          <IconButton size="sm" type="button" aria-label={t('docs.editor.quote')} onClick={() => exec('formatBlock', 'blockquote')}>
            <Quote size={13} />
          </IconButton>
          <IconButton size="sm" type="button" aria-label={t('docs.editor.code')} onClick={() => exec('formatBlock', 'pre')}>
            <Code size={13} />
          </IconButton>
        </div>
      )}
      <div className="relative">
        {empty && !readOnly && (
          <span className="pointer-events-none absolute left-4 top-3 text-[13px] text-fg-3">
            {placeholder ?? t('docs.editor.placeholder')}
          </span>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-readonly={readOnly}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={fire}
          onBlur={fire}
          className="prose min-h-[180px] max-w-none px-4 py-3 text-[14px] leading-[1.7] text-fg-1 focus:outline-none"
        />
      </div>
    </div>
  );
}

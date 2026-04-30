'use client';

import { useFileAttach, type AttachedFile } from '@/lib/hooks/use-file-attach';
import { useVoiceInput } from '@/lib/hooks/use-voice-input';
import { ArrowUp, Mic, MicOff, Paperclip, X } from 'lucide-react';
import { useCallback, useRef, type DragEvent, type ClipboardEvent, type KeyboardEvent } from 'react';

interface Props {
  input: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onSend: (text: string, files: AttachedFile[]) => void;
}

function FilePreviewItem({ af, onRemove }: { af: AttachedFile; onRemove: () => void }) {
  const isImage = af.file.type.startsWith('image/');
  const sizeKb = (af.file.size / 1024).toFixed(0);
  return (
    <div className="flex items-center gap-1.5 bg-bg-1 border border-border rounded px-2 py-1 text-[11px]">
      {isImage && af.preview ? (
        <img src={af.preview} alt={af.file.name} className="w-8 h-8 object-cover rounded" />
      ) : (
        <span className="text-fg-3 text-[10px] w-8 h-8 grid place-items-center bg-bg-2 rounded font-mono uppercase">
          {af.file.name.split('.').pop()?.slice(0, 4)}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate text-fg">{af.file.name}</div>
        <div className="text-fg-3">{sizeKb}KB {af.uploading ? '업로드 중…' : (af.error ?? '')}</div>
      </div>
      <button type="button" onClick={onRemove} className="text-fg-3 hover:text-destructive p-0.5" aria-label="파일 제거">
        <X size={11} />
      </button>
    </div>
  );
}

export function AiComposer({ input, disabled, onChange, onSend }: Props) {
  const { files, attach, remove, clear } = useFileAttach();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const appendTranscript = useCallback((text: string) => {
    onChange(input ? `${input} ${text}` : text);
  }, [input, onChange]);

  const { listening, supported, start, stop } = useVoiceInput(appendTranscript);

  const handleSend = useCallback(() => {
    if (!input.trim() && files.length === 0) return;
    onSend(input, files);
    clear();
  }, [input, files, onSend, clear]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) attach(e.dataTransfer.files);
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.files);
    if (items.length) attach(items);
  };

  return (
    <div
      className="space-y-2"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {files.length > 0 && (
        <div className="space-y-1 max-h-[120px] overflow-y-auto">
          {files.map((af) => (
            <FilePreviewItem key={af.id} af={af} onRemove={() => remove(af.id)} />
          ))}
        </div>
      )}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="무엇이든 물어보세요..."
          rows={2}
          disabled={disabled}
          className="w-full resize-none rounded-lg bg-bg-1 border border-border px-3 py-2.5 pr-[72px] text-[13px] text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors disabled:opacity-60"
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          {supported && (
            <button
              type="button"
              onClick={listening ? stop : start}
              disabled={disabled}
              className="w-7 h-7 rounded-md grid place-items-center transition-colors text-fg-3 hover:text-fg hover:bg-hover disabled:opacity-40"
              aria-label={listening ? '음성 입력 중지' : '음성 입력 시작'}
              title={listening ? '음성 입력 중지' : '음성 입력'}
            >
              {listening ? <MicOff size={13} /> : <Mic size={13} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-7 h-7 rounded-md grid place-items-center transition-colors text-fg-3 hover:text-fg hover:bg-hover disabled:opacity-40"
            aria-label="파일 첨부"
            title="파일 첨부"
          >
            <Paperclip size={13} />
          </button>
          <button
            type="button"
            disabled={(!input.trim() && files.length === 0) || disabled}
            onClick={handleSend}
            className="w-7 h-7 rounded-md bg-accent text-accent-fg grid place-items-center disabled:opacity-40 hover:bg-accent-strong transition-colors"
            aria-label="전송"
          >
            <ArrowUp size={14} />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,text/plain,text/csv,application/json"
          className="sr-only"
          onChange={(e) => e.target.files && attach(e.target.files)}
        />
      </div>
    </div>
  );
}

'use client';

import type React from 'react';

type MarkdownToken =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'li'; text: string; ordered: boolean }
  | { type: 'hr' }
  | { type: 'p'; text: string };

function tokenize(md: string): MarkdownToken[] {
  const lines = md.split('\n');
  const tokens: MarkdownToken[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      tokens.push({ type: 'code', lang, code: codeLines.join('\n') });
      i++;
      continue;
    }
    if (/^#{3}\s/.test(line)) { tokens.push({ type: 'h3', text: line.slice(4) }); i++; continue; }
    if (/^#{2}\s/.test(line)) { tokens.push({ type: 'h2', text: line.slice(3) }); i++; continue; }
    if (/^#\s/.test(line)) { tokens.push({ type: 'h1', text: line.slice(2) }); i++; continue; }
    if (/^---+$/.test(line.trim())) { tokens.push({ type: 'hr' }); i++; continue; }
    const liMatch = line.match(/^(\d+\.|[-*+])\s+(.*)/);
    if (liMatch) {
      tokens.push({ type: 'li', text: liMatch[2] ?? '', ordered: /^\d/.test(liMatch[1] ?? '') });
      i++;
      continue;
    }
    if (line.trim()) { tokens.push({ type: 'p', text: line }); }
    i++;
  }
  return tokens;
}

function sanitize(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  return sanitize(text)
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>',
    );
}

function ListBlock({ items }: { items: Array<{ text: string; ordered: boolean }> }) {
  const ordered = items[0]?.ordered ?? false;
  if (ordered) {
    return (
      <ol className="md-list">
        {items.map((li, idx) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(li.text) }} />
        ))}
      </ol>
    );
  }
  return (
    <ul className="md-list">
      {items.map((li, idx) => (
        <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(li.text) }} />
      ))}
    </ul>
  );
}

export function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const tokens = tokenize(content);
  const parts: React.ReactNode[] = [];
  let listBuffer: Array<{ text: string; ordered: boolean }> = [];

  const flushList = (key: string) => {
    if (!listBuffer.length) return;
    parts.push(<ListBlock key={key} items={listBuffer} />);
    listBuffer = [];
  };

  tokens.forEach((tok, idx) => {
    if (tok.type === 'li') {
      listBuffer.push({ text: tok.text, ordered: tok.ordered });
      return;
    }
    flushList(`list-${idx}`);
    switch (tok.type) {
      case 'h1':
        parts.push(<h1 key={idx} className="md-h1" dangerouslySetInnerHTML={{ __html: renderInline(tok.text) }} />);
        break;
      case 'h2':
        parts.push(<h2 key={idx} className="md-h2" dangerouslySetInnerHTML={{ __html: renderInline(tok.text) }} />);
        break;
      case 'h3':
        parts.push(<h3 key={idx} className="md-h3" dangerouslySetInnerHTML={{ __html: renderInline(tok.text) }} />);
        break;
      case 'code':
        parts.push(
          <pre key={idx} className="md-pre">
            <code className={`lang-${tok.lang}`}>{tok.code}</code>
          </pre>,
        );
        break;
      case 'hr':
        parts.push(<hr key={idx} className="md-hr" />);
        break;
      case 'p':
        parts.push(<p key={idx} className="md-p" dangerouslySetInnerHTML={{ __html: renderInline(tok.text) }} />);
        break;
    }
  });
  flushList('final');

  return (
    <div className={['md-content', className].filter(Boolean).join(' ')}>
      {parts}
    </div>
  );
}

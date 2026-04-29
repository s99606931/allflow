import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Foundation/Tokens',
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

const SURFACES = ['bg', 'bg-1', 'bg-2', 'bg-elev', 'hover'];
const TEXTS = ['fg', 'fg-1', 'fg-2', 'fg-3'];
const STATES = ['accent', 'success', 'warning', 'danger', 'info'];

export const Colors: Story = {
  render: () => (
    <div className="bg-bg p-8 space-y-8">
      <section>
        <h2 className="text-[14px] font-semibold mb-3 text-fg">표면 (Surfaces)</h2>
        <div className="grid grid-cols-5 gap-2">
          {SURFACES.map(s => (
            <div key={s} className="border border-border rounded overflow-hidden">
              <div className={`h-16 bg-${s}`} />
              <div className="px-2 py-1.5 bg-bg-elev text-[11px] font-mono text-fg-2 border-t border-border">
                {s}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-semibold mb-3 text-fg">텍스트 (Foreground)</h2>
        <div className="space-y-2">
          {TEXTS.map(t => (
            <div key={t} className="flex items-center gap-4 p-3 border border-border rounded bg-bg-elev">
              <div className={`text-[13px] text-${t} flex-1`}>The quick brown fox · 빠른 갈색 여우 · 0123456789</div>
              <code className="text-[11px] text-fg-3">{t}</code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-semibold mb-3 text-fg">상태 (States)</h2>
        <div className="grid grid-cols-5 gap-2">
          {STATES.map(s => (
            <div key={s} className="border border-border rounded overflow-hidden">
              <div className={`h-12 bg-${s}`} />
              <div className={`h-12 bg-${s}-soft`} />
              <div className="px-2 py-1.5 bg-bg-elev text-[11px] font-mono text-fg-2 border-t border-border">
                {s} / -soft
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-semibold mb-3 text-fg">라운드 + 섀도우</h2>
        <div className="grid grid-cols-4 gap-3">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(r => (
            <div key={r} className={`bg-bg-elev border border-border p-4 rounded-${r}`}>
              <code className="text-[11px] font-mono text-fg-3">rounded-{r}</code>
            </div>
          ))}
          {(['sm', 'md', 'lg', 'pop'] as const).map(s => (
            <div key={s} className={`bg-bg-elev border border-border p-4 rounded-md shadow-${s}`}>
              <code className="text-[11px] font-mono text-fg-3">shadow-{s}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="bg-bg p-8 space-y-3 font-sans">
      {[
        { c: 'text-[32px] font-bold tracking-tight', l: 'Display · 32px / 700' },
        { c: 'text-[24px] font-bold tracking-tight', l: 'Heading 1 · 24px / 700' },
        { c: 'text-[18px] font-semibold', l: 'Heading 2 · 18px / 600' },
        { c: 'text-[15px] font-semibold', l: 'Heading 3 · 15px / 600' },
        { c: 'text-[13px]', l: 'Body · 13px / 400' },
        { c: 'text-[12px] text-fg-2', l: 'Caption · 12px / 400' },
        { c: 'text-[11px] font-mono text-fg-3', l: 'Mono · 11px / 400' },
      ].map((s, i) => (
        <div key={i} className="border-b border-border pb-2">
          <div className={s.c + ' text-fg'}>The quick brown fox · 빠른 갈색 여우</div>
          <div className="text-[10px] text-fg-3 mt-1 font-mono">{s.l}</div>
        </div>
      ))}
    </div>
  ),
};

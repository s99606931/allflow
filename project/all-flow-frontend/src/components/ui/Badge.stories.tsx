import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/components/ui/primitives';
import { AlertTriangle, Sparkles } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    tone: { control: 'select', options: ['neutral', 'accent', 'success', 'warning', 'danger', 'info'] },
  },
  args: { children: 'Badge', tone: 'neutral' },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Neutral: Story = { args: { tone: 'neutral', children: '78%' } };
export const Accent: Story = { args: { tone: 'accent', children: 'AI' } };
export const Danger: Story = { args: { tone: 'danger', children: 'P0' } };

export const Gallery: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="accent"><Sparkles size={10} /> AI</Badge>
      <Badge tone="success">완료</Badge>
      <Badge tone="warning">검토 중</Badge>
      <Badge tone="danger"><AlertTriangle size={10} /> P0 Critical</Badge>
      <Badge tone="info">Info</Badge>
    </div>
  ),
};

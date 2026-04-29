import type { Meta, StoryObj } from '@storybook/react';
import { Button, IconButton } from '@/components/ui/primitives';
import { Sparkles, Settings, Plus } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
  args: { children: '버튼', variant: 'primary', size: 'md' },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger' } };

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button variant="primary"><Sparkles size={14} /> AI 제안</Button>
      <Button variant="secondary"><Plus size={14} /> 새 프로젝트</Button>
      <Button variant="ghost"><Settings size={14} /> 설정</Button>
    </div>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton size="sm" aria-label="설정"><Settings size={14} /></IconButton>
      <IconButton size="md" aria-label="추가"><Plus size={16} /></IconButton>
      <IconButton size="lg" aria-label="AI"><Sparkles size={18} /></IconButton>
    </div>
  ),
};

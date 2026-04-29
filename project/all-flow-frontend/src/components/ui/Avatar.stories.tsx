import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarStack } from '@/components/ui/primitives';
import { TEAM } from '@/lib/fixtures';

const meta: Meta<typeof Avatar> = {
  title: 'Primitives/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: { user: TEAM[0], size: 32 },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {};
export const Small: Story = { args: { size: 20 } };
export const Large: Story = { args: { size: 56 } };

export const Stack: Story = {
  render: () => (
    <div className="space-y-4">
      <AvatarStack users={TEAM.slice(0, 3)} size={28} />
      <AvatarStack users={TEAM} size={28} max={4} />
      <AvatarStack users={TEAM} size={36} max={3} />
    </div>
  ),
};

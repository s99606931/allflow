import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarStack } from '@/components/ui/primitives';
import type { User } from '@/lib/types';

const TEAM: User[] = [
  { id: 'me', name: '김지우', role: '프로덕트 매니저', dept: '프로덕트팀', initials: 'JW', color: '#5B6CFF' },
  { id: 'u1', name: '박서연', role: '시니어 디자이너', dept: '디자인팀', initials: 'SY', color: '#FF7A6B' },
  { id: 'u2', name: '이도현', role: '프론트엔드 리드', dept: '엔지니어링', initials: 'DH', color: '#34B27D' },
  { id: 'u3', name: '최민지', role: '백엔드 개발자', dept: '엔지니어링', initials: 'MJ', color: '#A66CFF' },
  { id: 'u4', name: '정태훈', role: 'iOS 개발자', dept: '엔지니어링', initials: 'TH', color: '#F2A93B' },
  { id: 'u5', name: '한가영', role: '마케팅 매니저', dept: '마케팅팀', initials: 'GY', color: '#E94B8A' },
];

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

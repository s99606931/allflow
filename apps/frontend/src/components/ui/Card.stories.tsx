import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardBody, Progress, Badge } from '@/components/ui/primitives';
import { ChevronRight } from 'lucide-react';

const meta: Meta = {
  title: 'Primitives/Card',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>오늘 할 일</CardTitle>
        <Badge tone="accent">7</Badge>
      </CardHeader>
      <CardBody>
        <p className="text-[13px] text-fg-2">7개의 태스크가 마감 24시간 이내입니다.</p>
      </CardBody>
    </Card>
  ),
};

export const ProjectCard: Story = {
  render: () => (
    <Card hoverable className="max-w-sm cursor-pointer">
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10.5px] font-mono text-fg-3">PRJ-201</div>
            <div className="text-[14px] font-semibold text-fg truncate">CJ ENM 영상 분석</div>
          </div>
          <ChevronRight size={16} className="text-fg-3 shrink-0" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-fg-3">진행률</span>
            <span className="font-mono text-fg-1">78%</span>
          </div>
          <Progress value={78} tone="accent" />
        </div>
      </CardBody>
    </Card>
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {[
        { l: '활성 프로젝트', v: '12', tone: 'accent' as const },
        { l: '완료 태스크', v: '47', tone: 'success' as const },
        { l: '활성 이슈', v: '8', tone: 'warning' as const },
      ].map((k, i) => (
        <Card key={i}>
          <CardBody>
            <div className="text-[11px] text-fg-3">{k.l}</div>
            <div className="text-[24px] font-bold mt-1">{k.v}</div>
            <Badge tone={k.tone} className="mt-2">+12 전주 대비</Badge>
          </CardBody>
        </Card>
      ))}
    </div>
  ),
};

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Button, IconButton, Badge, Card, CardHeader, CardTitle, CardBody,
  Avatar, AvatarStack, Progress, StatusDot,
} from '@/components/ui/primitives';
import { TEAM } from '@/lib/fixtures';
import { Sparkles } from 'lucide-react';

describe('Button', () => {
  it('렌더 + 클릭 핸들러', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button onClick={() => clicks++}>저장</Button>);
    const btn = screen.getByRole('button', { name: '저장' });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(clicks).toBe(1);
  });

  it.each([
    ['primary', 'bg-accent'],
    ['secondary', 'bg-bg-elev'],
    ['ghost', 'text-fg-1'],
    ['danger', 'bg-danger'],
  ] as const)('variant=%s 적용', (variant, cls) => {
    render(<Button variant={variant}>X</Button>);
    expect(screen.getByRole('button')).toHaveClass(cls);
  });

  it('disabled 상태', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button disabled onClick={() => clicks++}>X</Button>);
    await user.click(screen.getByRole('button'));
    expect(clicks).toBe(0);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it.each(['sm', 'md', 'lg'] as const)('size=%s 높이', size => {
    render(<Button size={size}>X</Button>);
    const map = { sm: 'h-7', md: 'h-9', lg: 'h-11' };
    expect(screen.getByRole('button')).toHaveClass(map[size]);
  });
});

describe('IconButton', () => {
  it('aria-label 노출 + 정사각', () => {
    render(<IconButton aria-label="AI 어시스턴트" size="sm"><Sparkles /></IconButton>);
    const btn = screen.getByRole('button', { name: 'AI 어시스턴트' });
    expect(btn).toHaveClass('h-7', 'w-7');
  });
});

describe('Badge', () => {
  it.each([
    ['neutral', 'bg-bg-2'],
    ['accent', 'bg-accent-soft'],
    ['success', 'bg-success-soft'],
    ['warning', 'bg-warning-soft'],
    ['danger', 'bg-danger-soft'],
  ] as const)('tone=%s', (tone, cls) => {
    render(<Badge tone={tone}>{tone}</Badge>);
    expect(screen.getByText(tone)).toHaveClass(cls);
  });
});

describe('Card', () => {
  it('헤더/제목/바디 구성', () => {
    render(
      <Card>
        <CardHeader><CardTitle>오늘 할 일</CardTitle></CardHeader>
        <CardBody>본문</CardBody>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: '오늘 할 일' })).toBeInTheDocument();
    expect(screen.getByText('본문')).toBeInTheDocument();
  });

  it('hoverable 클래스', () => {
    const { container } = render(<Card hoverable>X</Card>);
    expect(container.firstChild).toHaveClass('hover:shadow-md');
  });
});

describe('Avatar / AvatarStack', () => {
  it('이니셜 + 색상 + title', () => {
    render(<Avatar user={{ initials: 'KM', color: '#3B82F6', name: '김민수' }} size={40} />);
    const el = screen.getByText('KM');
    expect(el).toHaveAttribute('title', '김민수');
    expect(el).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('Stack — max 초과 시 +N 카운터', () => {
    render(<AvatarStack users={TEAM} max={3} />);
    const overflow = TEAM.length - 3;
    expect(screen.getByText(`+${overflow}`)).toBeInTheDocument();
  });
});

describe('Progress', () => {
  it('value 클램프 0~100', () => {
    const { container, rerender } = render(<Progress value={150} />);
    const fill = (container.firstElementChild as HTMLElement)?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('100%');
    rerender(<Progress value={-10} />);
    const fill2 = (container.firstElementChild as HTMLElement)?.firstElementChild as HTMLElement;
    expect(fill2.style.width).toBe('0%');
  });
});

describe('StatusDot', () => {
  it.each(['todo', 'doing', 'review', 'done', 'blocked'] as const)('상태=%s 라벨 출력', s => {
    const { container } = render(<StatusDot status={s} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

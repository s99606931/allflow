'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

/* Card ------------------------------------------------------------------- */
export function Card({
  className,
  hoverable = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hoverable?: boolean }) {
  return (
    <div
      className={cn(
        'bg-bg-elev border border-border rounded-lg shadow-sm',
        hoverable && 'transition-all hover:shadow-md hover:border-border-strong',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4 border-b border-border flex items-center justify-between gap-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[14px] font-semibold text-fg tracking-tight', className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

/* Button ----------------------------------------------------------------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-strong',
  secondary: 'bg-bg-elev border border-border text-fg-1 hover:bg-hover hover:border-border-strong',
  ghost: 'text-fg-1 hover:bg-hover',
  danger: 'bg-danger text-white hover:opacity-90',
};
const BTN_SIZE: Record<BtnSize, string> = {
  sm: 'h-7 px-2.5 text-[12.5px] gap-1.5',
  md: 'h-9 px-3.5 text-[13px] gap-2',
  lg: 'h-11 px-5 text-[14px] gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:pointer-events-none',
        BTN_VARIANT[variant],
        BTN_SIZE[size],
        className,
      )}
      {...props}
    />
  );
});

/* IconButton ------------------------------------------------------------- */
export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', className, ...props },
  ref,
) {
  const sz = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  return (
    <Button ref={ref} variant={variant} size={size} className={cn('!px-0', sz, className)} {...props} />
  );
});

/* Badge ------------------------------------------------------------------ */
type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-bg-2 text-fg-1 border-border',
  accent: 'bg-accent-soft text-accent-strong border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  info: 'bg-bg-2 text-info border-border',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 h-5 rounded-[4px] border text-[11.5px] font-medium tracking-tight',
        BADGE_TONE[tone],
        className,
      )}
      {...props}
    />
  );
}

/* Avatar ----------------------------------------------------------------- */
export function Avatar({
  user,
  size = 28,
  className,
}: {
  user: { initials: string; color: string; name?: string };
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 ring-2 ring-bg-elev',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: user.color,
        fontSize: Math.max(10, size * 0.38),
      }}
      title={user.name}
    >
      {user.initials}
    </div>
  );
}

export function AvatarStack({
  users,
  max = 4,
  size = 24,
}: {
  users: { initials: string; color: string; name?: string }[];
  max?: number;
  size?: number;
}) {
  const visible = users.slice(0, max);
  const rest = users.length - visible.length;
  return (
    <div className="inline-flex items-center -space-x-1.5">
      {visible.map((u, i) => (
        <Avatar key={i} user={u} size={size} />
      ))}
      {rest > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-bg-2 text-fg-2 text-[10px] font-semibold ring-2 ring-bg-elev"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

/* Progress --------------------------------------------------------------- */
export function Progress({
  value,
  className,
  tone,
}: {
  value: number;
  className?: string;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
}) {
  const color =
    tone === 'success'
      ? 'var(--color-success)'
      : tone === 'warning'
        ? 'var(--color-warning)'
        : tone === 'danger'
          ? 'var(--color-danger)'
          : 'var(--color-accent)';
  return (
    <div className={cn('h-1.5 bg-bg-2 rounded-full overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

/* StatusDot -------------------------------------------------------------- */
import { STATUS, type StatusKey } from '@/lib/tokens';

export function StatusDot({ status }: { status: StatusKey }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fg-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

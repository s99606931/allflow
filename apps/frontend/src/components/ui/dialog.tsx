/**
 * Dialog primitive — thin wrapper around Radix Dialog with our token theme.
 *
 * Usage:
 *   <Dialog open={open} onOpenChange={setOpen} title="결재 작성" description="..." >
 *     <form>... <Button type="submit">저장</Button></form>
 *   </Dialog>
 *
 * The Radix root handles focus trap, Esc dismiss, overlay click — we only
 * style the surface and provide a close button for keyboard a11y users.
 */
'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'max-w-[420px]',
  md: 'max-w-[640px]',
  lg: 'max-w-[860px]',
};

export function Dialog({ open, onOpenChange, title, description, children, className, size = 'md' }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bg-elev p-5 shadow-pop',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'max-h-[88vh] overflow-y-auto',
            SIZE_MAP[size],
            className,
          )}
        >
          {(title || description) && (
            <div className="mb-4 pr-8">
              {title && (
                <DialogPrimitive.Title className="text-[16px] font-bold text-fg">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="mt-1 text-[12.5px] text-fg-2">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          )}
          <DialogPrimitive.Close
            aria-label="닫기"
            className="absolute right-3 top-3 rounded-md p-1 text-fg-3 transition-colors hover:bg-hover hover:text-fg"
          >
            <X size={16} />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-5 flex items-center justify-end gap-2 border-t border-border pt-4', className)}
      {...props}
    />
  );
}

export function DialogField({
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wider text-fg-3">
        {label}
        {required && <span aria-label="required" className="text-danger">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-fg-3">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-[11px] text-danger">{error}</span>}
    </label>
  );
}

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-md border border-border bg-bg-1 px-3 text-[13px] text-fg-1',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'min-h-[80px] w-full resize-y rounded-md border border-border bg-bg-1 px-3 py-2 text-[13px] text-fg-1',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-9 w-full rounded-md border border-border bg-bg-1 px-2 text-[13px] text-fg-1',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

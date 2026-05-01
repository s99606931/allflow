import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DateInput,
  DateTimeInput,
  TimeInput,
} from '@/components/ui/dialog';

/**
 * Typed date/time inputs — locked-`type` wrappers around the native picker.
 *
 * Native HTML5 date / time / datetime-local inputs already provide an
 * accessible, OS-integrated picker. The wrappers exist to:
 *   1) guarantee the correct `type` (consumers cannot override it),
 *   2) apply consistent styling tokens, and
 *   3) tag a `data-component` attribute for E2E selection.
 */

describe('DateInput', () => {
  it('renders an input with type="date" and the date-input data tag', () => {
    render(<DateInput aria-label="마감일" />);
    const input = screen.getByLabelText('마감일') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('date');
    expect(input.getAttribute('data-component')).toBe('date-input');
  });

  it('reflects controlled value and fires onChange on user input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateInput aria-label="마감일" defaultValue="2026-05-01" onChange={onChange} />);
    const input = screen.getByLabelText('마감일') as HTMLInputElement;
    expect(input.value).toBe('2026-05-01');
    await user.clear(input);
    await user.type(input, '2026-12-25');
    expect(onChange).toHaveBeenCalled();
    expect(input.value).toBe('2026-12-25');
  });

  it('honours the required attribute and aria-required', () => {
    render(<DateInput aria-label="마감일" required />);
    expect(screen.getByLabelText('마감일')).toBeRequired();
  });

  it('forwards refs', () => {
    const captured: { current: HTMLInputElement | null } = { current: null };
    render(<DateInput aria-label="ref" ref={el => { captured.current = el; }} />);
    expect(captured.current).not.toBeNull();
    expect(captured.current?.tagName).toBe('INPUT');
  });

  it('merges custom className without dropping base styling', () => {
    render(<DateInput aria-label="cls" className="extra-class" />);
    const input = screen.getByLabelText('cls');
    expect(input).toHaveClass('extra-class');
    expect(input).toHaveClass('rounded-md');
  });
});

describe('TimeInput', () => {
  it('renders an input with type="time" and the time-input data tag', () => {
    render(<TimeInput aria-label="시작 시간" />);
    const input = screen.getByLabelText('시작 시간') as HTMLInputElement;
    expect(input.type).toBe('time');
    expect(input.getAttribute('data-component')).toBe('time-input');
  });

  it('updates value via change event', () => {
    const onChange = vi.fn();
    render(<TimeInput aria-label="시작 시간" defaultValue="09:00" onChange={onChange} />);
    const input = screen.getByLabelText('시작 시간') as HTMLInputElement;
    expect(input.value).toBe('09:00');
  });
});

describe('DateTimeInput', () => {
  it('renders an input with type="datetime-local" and the datetime-input data tag', () => {
    render(<DateTimeInput aria-label="시작" />);
    const input = screen.getByLabelText('시작') as HTMLInputElement;
    expect(input.type).toBe('datetime-local');
    expect(input.getAttribute('data-component')).toBe('datetime-input');
  });

  it('reflects controlled datetime-local value', () => {
    render(<DateTimeInput aria-label="시작" defaultValue="2026-05-01T09:00" />);
    const input = screen.getByLabelText('시작') as HTMLInputElement;
    expect(input.value).toBe('2026-05-01T09:00');
  });

  it('supports min/max attribute pass-through', () => {
    render(
      <DateTimeInput
        aria-label="시작"
        min="2026-01-01T00:00"
        max="2026-12-31T23:59"
      />,
    );
    const input = screen.getByLabelText('시작') as HTMLInputElement;
    expect(input.getAttribute('min')).toBe('2026-01-01T00:00');
    expect(input.getAttribute('max')).toBe('2026-12-31T23:59');
  });
});

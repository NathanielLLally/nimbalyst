// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MultiStepContactForm } from '@/components/MultiStepContactForm';

vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@calcom/embed-react', () => ({ default: () => <div data-testid="cal-embed" /> }));
// Radix Select can't be driven in jsdom (portals + pointer capture); a native
// <select> keeps the same value/onValueChange contract.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: ReactNode }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

beforeEach(() => {
  (window as unknown as { grecaptcha: unknown }).grecaptcha = {
    ready: (cb: () => void) => cb(),
    render: () => 0,
    execute: () => Promise.resolve('token'),
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const type = (placeholder: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

// Answer every select on the current page with its first non-"other" option.
function answerSelects() {
  for (const select of screen.getAllByRole('combobox') as HTMLSelectElement[]) {
    const opt = Array.from(select.options).find((o) => o.value && o.value !== 'other')!;
    fireEvent.change(select, { target: { value: opt.value } });
  }
}
const next = () => fireEvent.click(screen.getByRole('button', { name: /next/i }));

async function submitSuccessfully() {
  render(<MultiStepContactForm />);
  answerSelects();
  type('Your Pet Business', 'Paws');
  type('https://example.com', 'https://paws.example');
  next();
  answerSelects();
  next();
  answerSelects();
  next();
  type('John Smith', 'Jane Doe');
  type('+12125550123', '+12125550123');
  type('john@example.com', 'jane@example.com');
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  await screen.findByText('Thank you!');
}

const container = () => document.querySelector('.form-container')!;

describe('MultiStepContactForm mobile fullscreen', () => {
  it('should_go_fullscreen_when_the_form_is_touched_before_submitting', () => {
    // Given the untouched form
    render(<MultiStepContactForm />);
    // When the user touches it
    fireEvent.pointerDown(screen.getByPlaceholderText('Your Pet Business'));
    // Then it goes fullscreen
    expect(container().classList.contains('is-active')).toBe(true);
  });

  it('should_stay_out_of_fullscreen_when_the_thank_you_view_is_touched', async () => {
    // Given a successful submission showing the thank-you view
    await submitSuccessfully();
    // When the user taps an article card or focuses a link in it
    const card = screen.getAllByRole('article')[0];
    fireEvent.pointerDown(card);
    fireEvent.focus(within(card).getByRole('link'));
    // Then the form stays in normal flow, so it can grow with the calendar embed
    expect(container().classList.contains('is-active')).toBe(false);
  });
});

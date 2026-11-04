// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MultiStepContactForm } from '@/components/MultiStepContactForm';

vi.mock('next/image', () => ({ default: () => null }));

const fetchMock = vi.fn();

beforeEach(() => {
  (window as any).grecaptcha = {
    ready: (cb: () => void) => cb(),
    render: () => 0,
    execute: () => Promise.resolve('token'),
  };
  fetchMock.mockReset();
  // First submit: server rejects the email, which sends the user back to page 1.
  fetchMock.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ emailValidation: { email: 'bad@nope.invalid', mxError: 'no mx record for hostname nope.invalid' } }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const type = (placeholder: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

async function submitOnceAndGetBouncedBackForBadEmail() {
  render(<MultiStepContactForm />);
  type('John Smith', 'Jane Doe');
  type('(###) ###-####', '2125550123');
  type('john@example.com', 'bad@nope.invalid');
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  type('Your Pet Business', 'Paws');
  type('https://example.com', 'https://paws.example');
  const [businessType, challenge] = screen.getAllByRole('combobox');
  fireEvent.change(businessType, { target: { value: 'grooming' } });
  fireEvent.change(challenge, { target: { value: 'leads' } });
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  type('We could use more clients', 'Need more clients');
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  await screen.findByText(/Invalid Email/);
}

describe('MultiStepContactForm Next/Submit buttons', () => {
  it('should_render_submit_as_a_new_element_not_the_reused_next_button', () => {
    // Given the user is on page 2 with all fields filled
    render(<MultiStepContactForm />);
    type('John Smith', 'Jane Doe');
    type('(###) ###-####', '2125550123');
    type('john@example.com', 'jane@paws.example');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    type('Your Pet Business', 'Paws');
    type('https://example.com', 'https://paws.example');
    const [businessType, challenge] = screen.getAllByRole('combobox');
    fireEvent.change(businessType, { target: { value: 'grooming' } });
    fireEvent.change(challenge, { target: { value: 'leads' } });
    const next = screen.getByRole('button', { name: /next/i });

    // When they click Next to reach the last page
    fireEvent.click(next);

    // Then Submit is a different <button>. If React reused the clicked Next
    // element and flipped its type to "submit", a real browser click would run
    // the submit default action on it and post the form without a second click.
    expect(screen.getByRole('button', { name: /submit/i })).not.toBe(next);
  });
});

describe('MultiStepContactForm navigation after an invalid email', () => {
  it('should_not_auto_submit_when_clicking_next_back_to_the_last_page', async () => {
    // Given the user was bounced back to page 1 for an invalid email
    await submitOnceAndGetBouncedBackForBadEmail();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // When they fix the email and click Next twice to return to the last page
    type('john@example.com', 'jane@paws.example');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByRole('checkbox');
    await new Promise((r) => setTimeout(r, 0));

    // Then nothing is submitted until they click Submit themselves
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

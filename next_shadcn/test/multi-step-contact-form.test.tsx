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

describe('MultiStepContactForm labels', () => {
  it('should_label_the_email_field_with_the_envelope_emoji', () => {
    // Given the form on page 1, Then the email label reads "✉️ Email"
    render(<MultiStepContactForm />);
    expect(screen.getByText((_, el) => el?.tagName === 'LABEL' && el.textContent?.trim() === '\u2709\uFE0F Email')).toBeTruthy();
  });

  it('should_wrap_each_page_1_label_icon_in_a_neon_icon_span', () => {
    // Given the form on page 1, Then every label icon sits in a .neon-icon span (which opts it out of the label glow)
    render(<MultiStepContactForm />);
    const icons = ['\u{1F464}', '\u{1F4DE}', '\u2709\uFE0F'].map((i) => screen.getByText(i).className.split(' '));
    expect(icons.every((c) => c.includes('neon-icon'))).toBe(true);
  });
});

describe('MultiStepContactForm icon glow', () => {
  it('should_give_only_the_phone_icon_the_neon_glow', () => {
    // Given the form on page 1, Then only 📞 carries the glow modifier
    render(<MultiStepContactForm />);
    const glows = (i: string) => screen.getByText(i).className.split(' ').includes('neon-icon--glow');
    expect({ name: glows('\u{1F464}'), phone: glows('\u{1F4DE}'), email: glows('\u2709\uFE0F') })
      .toEqual({ name: false, phone: true, email: false });
  });
});

describe('MultiStepContactForm consent checkbox', () => {
  it('should_render_the_last_page_checkbox_at_twice_the_original_size', () => {
    // Given the user reaches the last page
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
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Then the checkbox is 2rem square (was w-4 h-4 = 1rem)
    const cls = screen.getByRole('checkbox').className.split(' ');
    expect({ w8: cls.includes('w-8'), h8: cls.includes('h-8'), old: cls.includes('w-4') || cls.includes('h-4') })
      .toEqual({ w8: true, h8: true, old: false });
  });
});

describe('MultiStepContactForm focus on page change', () => {
  const fillPage1 = () => {
    type('John Smith', 'Jane Doe');
    type('(###) ###-####', '2125550123');
    type('john@example.com', 'jane@paws.example');
  };
  const fillPage2 = () => {
    type('Your Pet Business', 'Paws');
    type('https://example.com', 'https://paws.example');
    const [businessType, challenge] = screen.getAllByRole('combobox');
    fireEvent.change(businessType, { target: { value: 'grooming' } });
    fireEvent.change(challenge, { target: { value: 'leads' } });
  };

  it('should_not_steal_focus_on_initial_render', () => {
    render(<MultiStepContactForm />);
    expect(document.activeElement).toBe(document.body);
  });

  it('should_focus_company_name_after_clicking_next_on_page_1', () => {
    render(<MultiStepContactForm />);
    fillPage1();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(document.activeElement).toBe(screen.getByPlaceholderText('Your Pet Business'));
  });

  it('should_focus_the_message_after_clicking_next_on_page_2', () => {
    render(<MultiStepContactForm />);
    fillPage1();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fillPage2();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(document.activeElement).toBe(screen.getByPlaceholderText('We could use more clients'));
  });

  it('should_advance_and_focus_company_name_on_enter_in_the_last_page_1_field', () => {
    render(<MultiStepContactForm />);
    fillPage1();
    fireEvent.keyDown(screen.getByPlaceholderText('john@example.com'), { key: 'Enter' });
    expect(document.activeElement).toBe(screen.getByPlaceholderText('Your Pet Business'));
  });

  it('should_advance_and_focus_the_message_on_enter_in_the_last_page_2_field', () => {
    render(<MultiStepContactForm />);
    fillPage1();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fillPage2();
    fireEvent.keyDown(screen.getAllByRole('combobox')[1], { key: 'Enter' });
    expect(document.activeElement).toBe(screen.getByPlaceholderText('We could use more clients'));
  });

  it('should_not_advance_on_enter_in_a_field_that_is_not_the_last_on_its_page', () => {
    render(<MultiStepContactForm />);
    fillPage1();
    fireEvent.keyDown(screen.getByPlaceholderText('John Smith'), { key: 'Enter' });
    expect(screen.queryByPlaceholderText('Your Pet Business')).toBeNull();
  });

  it('should_not_advance_on_enter_in_the_last_field_when_the_page_is_incomplete', () => {
    render(<MultiStepContactForm />);
    type('john@example.com', 'jane@paws.example');
    fireEvent.keyDown(screen.getByPlaceholderText('john@example.com'), { key: 'Enter' });
    expect(screen.queryByPlaceholderText('Your Pet Business')).toBeNull();
  });
});

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

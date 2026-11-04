// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Services } from '@/components/Services';

afterEach(cleanup);

const modalOpenFor = (title: string) =>
  screen.queryByText('Service Focus') !== null && screen.getAllByRole('heading', { name: title }).length === 2;

describe('Services cards', () => {
  it('should_open_the_learn_more_modal_when_clicking_anywhere_in_a_card', () => {
    // Given the services grid
    render(<Services />);
    // When clicking the card's description text (not the Learn More button)
    fireEvent.click(screen.getByText(/We craft custom, highly targeted Google/));
    // Then the Lead Generation modal opens
    expect(modalOpenFor('Lead Generation')).toBe(true);
  });

  it('should_open_the_wide_analytics_card_modal_when_clicking_its_title', () => {
    render(<Services />);
    fireEvent.click(screen.getByRole('heading', { name: 'Analytics & Dashboard Tracking' }));
    expect(modalOpenFor('Analytics & Dashboard Tracking')).toBe(true);
  });

  it('should_still_open_the_modal_from_the_learn_more_button', () => {
    render(<Services />);
    fireEvent.click(screen.getAllByRole('button', { name: /learn more/i })[1]);
    expect(modalOpenFor('CRM Integration')).toBe(true);
  });

  it('should_keep_the_modal_open_when_clicking_inside_it', () => {
    render(<Services />);
    fireEvent.click(screen.getByText(/We craft custom, highly targeted Google/));
    fireEvent.click(screen.getByText('Service Focus'));
    expect(modalOpenFor('Lead Generation')).toBe(true);
  });
});

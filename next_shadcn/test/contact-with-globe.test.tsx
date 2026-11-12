// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ContactWithGlobe from '@/components/contact-with-globe';

vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/components/ui/globe-wireframe', () => ({ default: () => <div data-testid="globe" /> }));
// Stand-in form: a button that reports a successful submission the way the real one does.
vi.mock('@/components/MultiStepContactForm', () => ({
  MultiStepContactForm: ({ onSubmittedChange }: { onSubmittedChange?: (s: boolean) => void }) => (
    <button data-testid="form" onClick={() => onSubmittedChange?.(true)}>submit</button>
  ),
}));

// motion's whileInView needs IntersectionObserver, which jsdom lacks.
beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    },
  );
});
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

// Grid cells: the left "Connect with our team" + globe column, and the form column.
const leftColumn = () => screen.getByText(/connect with our team/i).closest('.grid > *') as HTMLElement;
const formColumn = () => screen.getByTestId('form').closest('.grid > *') as HTMLElement;
const classes = (el: HTMLElement) => el.className.split(/\s+/);

describe('ContactWithGlobe thank-you layout', () => {
  it('should_keep_the_two_column_layout_before_submitting', () => {
    // Given the contact section before any submission
    render(<ContactWithGlobe />);
    // Then the form column is not spanning the grid
    expect(classes(formColumn())).not.toContain('md:col-span-full');
  });

  it('should_span_the_form_across_the_full_grid_width_above_mobile_after_submit', () => {
    // Given the contact section
    render(<ContactWithGlobe />);
    // When the form reports a successful submission
    fireEvent.click(screen.getByTestId('form'));
    // Then above the mobile breakpoint it takes the full width of the first row
    expect(classes(formColumn())).toEqual(
      expect.arrayContaining(['md:col-span-full', 'md:col-start-1', 'md:row-start-1']),
    );
  });

  it('should_place_the_thank_you_view_over_the_connect_column_and_hide_it_above_mobile', () => {
    render(<ContactWithGlobe />);
    fireEvent.click(screen.getByTestId('form'));
    // Same grid cell as the form (so the form covers it) and hidden underneath
    expect(classes(leftColumn())).toEqual(
      expect.arrayContaining(['md:col-start-1', 'md:row-start-1', 'md:invisible']),
    );
  });
});

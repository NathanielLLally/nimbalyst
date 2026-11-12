// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { ContactThankYou, THANK_YOU_ARTICLES, CAL_LINK, CAL_CONFIG } from '@/components/ContactThankYou';

// The real embed injects a script from cal.com; stand it in with a marker that
// exposes the props it was given.
vi.mock('@calcom/embed-react', () => ({
  default: (props: { calLink: string; config?: Record<string, string>; style?: Record<string, string> }) => (
    <div
      data-testid="cal-embed"
      data-cal-link={props.calLink}
      data-config={JSON.stringify(props.config ?? {})}
      data-style={JSON.stringify(props.style ?? {})}
    />
  ),
}));

afterEach(cleanup);

describe('ContactThankYou article cards', () => {
  it('should_render_one_card_per_article', () => {
    // Given the thank-you view
    render(<ContactThankYou />);
    // Then there is one article card per configured article
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('should_link_each_card_to_its_article_url_in_a_new_tab', () => {
    render(<ContactThankYou />);
    const hrefs = screen
      .getAllByRole('article')
      .map((card) => within(card).getByRole('link'))
      .map((a) => [a.getAttribute('href'), a.getAttribute('target'), a.getAttribute('rel')]);
    expect(hrefs).toEqual(
      THANK_YOU_ARTICLES.map((a) => [a.url, '_blank', 'noopener noreferrer']),
    );
  });

  it('should_include_the_two_requested_articles', () => {
    expect(THANK_YOU_ARTICLES.map((a) => a.url)).toEqual([
      'https://www.mortech.com/hs-fs/hub/25649/file-13535879-pdf/docs/mit_study.pdf',
      'https://ainora.lt/blog/lead-response-time-statistics-every-study-2026',
    ]);
  });
});

describe('ContactThankYou booking embed', () => {
  it('should_render_the_cal_com_inline_embed_after_the_articles', () => {
    // Given the thank-you view
    render(<ContactThankYou />);
    const embed = screen.getByTestId('cal-embed');
    const lastCard = screen.getAllByRole('article').at(-1)!;
    // Then the inline embed sits below the cards
    expect(Boolean(lastCard.compareDocumentPosition(embed) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('should_point_the_embed_at_the_leads_booking_page_with_overlay_calendar', () => {
    render(<ContactThankYou />);
    const embed = screen.getByTestId('cal-embed');
    expect([embed.dataset.calLink, JSON.parse(embed.dataset.config!)]).toEqual([
      'happy-tails-paw-care/leads',
      { overlayCalendar: 'true' },
    ]);
  });

  it('should_not_give_the_embed_a_fixed_height_so_it_grows_with_its_content', () => {
    // A fixed height is what forced scrolling inside the calendar; the inline
    // embed resizes its own iframe to the content when left unconstrained.
    render(<ContactThankYou />);
    const style = JSON.parse(screen.getByTestId('cal-embed').dataset.style!);
    expect(style.height).toBeUndefined();
  });

  it('should_not_render_a_fixed_height_iframe_of_its_own', () => {
    const { container } = render(<ContactThankYou />);
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('should_keep_the_requested_cal_com_link_and_options', () => {
    expect([CAL_LINK, CAL_CONFIG]).toEqual(['happy-tails-paw-care/leads', { overlayCalendar: 'true' }]);
  });
});

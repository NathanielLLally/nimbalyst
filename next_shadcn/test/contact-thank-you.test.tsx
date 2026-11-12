// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { ContactThankYou, THANK_YOU_ARTICLES, CAL_BOOKING_URL } from '@/components/ContactThankYou';

afterEach(cleanup);

describe('ContactThankYou article cards', () => {
  it('should_render_one_card_per_article', () => {
    // Given the thank-you view
    render(<ContactThankYou />);
    // Then there is one article card per configured article
    expect(screen.getAllByRole('article')).toHaveLength(3);
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

  it('should_include_the_three_requested_articles', () => {
    expect(THANK_YOU_ARTICLES.map((a) => a.url)).toEqual([
      'https://www.mortech.com/hs-fs/hub/25649/file-13535879-pdf/docs/mit_study.pdf',
      'https://ainora.lt/blog/lead-response-time-statistics-every-study-2026',
      'https://recapio.com/digest/how-to-build-a-confirmation-page-that-makes-people-show-up-ready-to-buy-by-jeremy-haynes',
    ]);
  });
});

describe('ContactThankYou booking embed', () => {
  it('should_embed_the_cal_com_leads_calendar_after_the_articles', () => {
    // Given the thank-you view
    const { container } = render(<ContactThankYou />);
    const iframe = screen.getByTitle(/book a call/i);
    const lastCard = screen.getAllByRole('article').at(-1)!;
    // Then the calendar iframe points at the leads booking page and sits below the cards
    expect([
      iframe.getAttribute('src'),
      Boolean(lastCard.compareDocumentPosition(iframe) & Node.DOCUMENT_POSITION_FOLLOWING),
      container.contains(iframe),
    ]).toEqual([CAL_BOOKING_URL, true, true]);
  });

  it('should_use_the_requested_cal_com_url', () => {
    expect(CAL_BOOKING_URL).toBe('https://cal.com/happy-tails-paw-care/leads?overlayCalendar=true');
  });
});

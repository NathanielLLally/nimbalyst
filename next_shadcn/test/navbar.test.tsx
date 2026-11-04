// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ value: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }));
vi.mock('next/image', () => ({ default: (p: { alt: string }) => <img alt={p.alt} /> }));

import { Navbar } from '@/components/navbar';

const scrollTo = vi.fn();
beforeEach(() => {
  scrollTo.mockReset();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
});
afterEach(cleanup);

const logoLink = () => screen.getByRole('img', { name: 'Happy Tails Paw Care' }).closest('a')!;

describe('Navbar logo', () => {
  it('should_scroll_to_top_when_clicking_the_logo_on_the_home_page', () => {
    // Given the user is on "/" (plain URL, where Next's Link is a no-op)
    pathname.value = '/';
    render(<Navbar />);
    // When they tap the logo
    const notCancelled = fireEvent.click(logoLink());
    // Then the page scrolls to the top and Next's no-op navigation is skipped
    expect({ scrolled: scrollTo.mock.calls[0]?.[0], notCancelled })
      .toEqual({ scrolled: { top: 0, behavior: 'smooth' }, notCancelled: false });
  });

  it('should_clear_a_leftover_section_hash_from_the_url', () => {
    // Given the URL is /#contact, When the logo is clicked, Then the URL becomes /
    pathname.value = '/';
    window.history.replaceState(null, '', '/#contact');
    render(<Navbar />);
    fireEvent.click(logoLink());
    expect(window.location.pathname + window.location.hash).toBe('/');
  });

  it('should_leave_normal_navigation_alone_when_off_the_home_page', () => {
    pathname.value = '/privacy';
    render(<Navbar />);
    fireEvent.click(logoLink());
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('Navbar mobile menu toggle', () => {
  it('should_render_the_hamburger_icon_1_25x_the_old_20px_size', () => {
    render(<Navbar />);
    const icon = screen.getByRole('button', { name: 'Toggle menu' }).querySelector('svg')!;
    const cls = icon.getAttribute('class')!.split(' ');
    expect({ w: cls.includes('w-[1.5625rem]'), h: cls.includes('h-[1.5625rem]'), old: cls.includes('w-5') })
      .toEqual({ w: true, h: true, old: false });
  });
});

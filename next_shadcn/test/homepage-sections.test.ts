import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// No DOM test environment is configured, so these check the page and navbar source.
const page = readFileSync(join(__dirname, '..', 'app', 'page.tsx'), 'utf8');
const navbar = readFileSync(join(__dirname, '..', 'components', 'navbar.tsx'), 'utf8');
const block = (name: string) => page.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))?.[1] ?? '';

describe('homepage testimonials replacement', () => {
  it.each(['testimonials', 'Sarah M.', 'Fluffy Cuts', 'Happy Paws Daycare', 'Paws & Claws'])(
    'Given a new business, When the homepage renders, Then it does not include "%s"',
    (text) => {
      expect(page).not.toContain(text);
    },
  );

  it('Given the navbar, When it renders, Then it does not link to testimonials', () => {
    expect(navbar).not.toMatch(/testimonials/i);
  });
});

describe('lead walkthrough section', () => {
  it('Given the homepage, When it renders, Then the walkthrough is the how-it-works section', () => {
    expect(page).toMatch(/<section id="how-it-works"[^>]*>[\s\S]*?From ad click to your phone[\s\S]*?<\/section>/);
  });

  it('Given the homepage, When it renders, Then there is exactly one how-it-works section', () => {
    expect(page.match(/id="how-it-works"/g)).toHaveLength(1);
  });

  it('Given the homepage, When it renders, Then the separate lead-flow anchor is gone', () => {
    expect(page).not.toContain('id="lead-flow"');
  });

  it.each(['const steps', 'Audit & Strategy', 'Build & Launch', 'Grow & Optimize', 'Key milestone'])(
    'Given the old agency process, When the homepage renders, Then it does not include "%s"',
    (text) => {
      expect(page).not.toContain(text);
    },
  );

  it('Given the homepage, When it renders, Then the walkthrough comes before the pet parallax image', () => {
    expect(page.indexOf('id="how-it-works"')).toBeLessThan(page.indexOf('dog_and_cats.png'));
  });

  it('Given the navbar, When it renders, Then it does not call the process "proven"', () => {
    expect(navbar).not.toMatch(/proven process/i);
  });

  it.each([
    ['0 sec', 'responds to your ad'],
    ['< 60 sec', 'We call them'],
    ['Minutes later', 'Live transfer'],
    ['You', 'Field the call or book the appointment'],
  ])('Given the lead walkthrough, When it renders, Then step "%s" says "%s"', (when, text) => {
    expect(block('leadFlow')).toMatch(new RegExp(`when: "${when}"[\\s\\S]*?${text}`));
  });
});

describe('our promises section', () => {
  it('Given the homepage, When it renders, Then it has a promises section', () => {
    expect(page).toContain('id="promises"');
  });

  it.each(['No Contracts', 'Bad Leads Credited', 'Exclusive Territory'])(
    'Given the promises section, When it renders, Then it promises "%s"',
    (promise) => {
      expect(block('promises')).toContain(`title: "${promise}"`);
    },
  );

  it('Given the navbar, When it renders, Then it links to the promises section', () => {
    expect(navbar).toContain("href: '/#promises'");
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// No DOM test environment is configured, so this checks the stats array in the page source.
const page = readFileSync(join(__dirname, '..', 'app', 'page.tsx'), 'utf8');
const statsBlock = page.match(/const stats = \[([\s\S]*?)\];/)?.[1] ?? '';

describe('homepage stats bar', () => {
  it('Given the homepage, When the stats bar renders, Then it advertises $0 setup fees', () => {
    expect(statsBlock).toMatch(/value: "\$0",\s*label: "Setup Fees"/);
  });

  it('Given the homepage, When the stats bar renders, Then it advertises a sub-60-second lead response time', () => {
    expect(statsBlock).toMatch(/value: "< 60 sec",\s*label: "Lead Response Time"/);
  });

  it('Given the homepage, When the stats bar renders, Then it advertises pay per qualified lead', () => {
    expect(statsBlock).toMatch(/value: "Pay Per",\s*label: "Qualified Lead"/);
  });

  it.each(['500+', 'Pet Businesses Served', '3.2', 'Client Retention', '4.9', 'Average Rating'])(
    'Given a new business, When the stats bar renders, Then it does not claim "%s"',
    (claim) => {
      expect(statsBlock).not.toContain(claim);
    },
  );
});

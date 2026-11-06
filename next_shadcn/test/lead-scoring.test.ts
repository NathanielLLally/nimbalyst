import { describe, it, expect } from 'vitest';
import { scoreLead, labelFor } from '@/lib/lead-scoring';

describe('scoreLead', () => {
  it('scores a strong profile at the top of every dimension', () => {
    const score = scoreLead({
      role: 'owner-staff',
      dogsPerWeek: '100-plus',
      clientSource: 'paid-ads',
      costKnowledge: 'exact',
      triedBefore: 'fb-google-ads',
      startTiming: 'now',
    });

    expect(score.icp).toBe(6);
    expect(score.pay).toBe(14);
    expect(score.readiness).toBe(15);
    expect(score.total).toBe(35);
    expect(score.tiers).toEqual({ icp: 'Strong', pay: 'Strong', readiness: 'Strong' });
    // exact cost + ran ads + paid-ads source = fully sophisticated buyer.
    expect(score.sophistication).toEqual({ score: 6, max: 6, tier: 'Pro' });
    expect(score.fitRisk.atRisk).toBe(false);
  });

  it('flags expectation-fit risk from the free-text frustration', () => {
    expect(scoreLead({ frustration: 'too many price shoppers' }).fitRisk.atRisk).toBe(true);
    expect(scoreLead({ frustration: 'clients are no-shows' }).fitRisk.atRisk).toBe(true);
    expect(scoreLead({ frustration: 'I just need more leads' }).fitRisk.atRisk).toBe(false);
  });

  it('rates a novice buyer low on sophistication', () => {
    const score = scoreLead({ costKnowledge: 'not-sure', triedBefore: 'nothing-yet', clientSource: 'referrals' });
    expect(score.sophistication).toEqual({ score: 0, max: 6, tier: 'Novice' });
  });

  it('scores an empty submission as zero and Weak across the board', () => {
    const score = scoreLead({});

    expect(score.total).toBe(0);
    expect(score.tiers).toEqual({ icp: 'Weak', pay: 'Weak', readiness: 'Weak' });
  });

  it('ignores the free-text question and unknown answers', () => {
    const score = scoreLead({ tenMoreClients: 'anything', role: 'does-not-exist' });

    expect(score.total).toBe(0);
  });
});

describe('labelFor', () => {
  it('maps a stored value to its human-readable label', () => {
    expect(labelFor('role', 'owner-staff')).toBe('Owner managing staff');
    expect(labelFor('startTiming', 'now')).toBe('Now');
  });

  it('returns an empty string for a missing value', () => {
    expect(labelFor('role', '')).toBe('');
  });

  it('falls back to the raw value when no matching option exists', () => {
    expect(labelFor('role', 'mystery')).toBe('mystery');
  });
});

import { describe, it, expect } from 'vitest';
import { sanitizeE164Input, isPlausibleE164 } from '@/lib/phone-input';

describe('sanitizeE164Input', () => {
  it.each([
    ['', ''],
    ['+', '+'],
    ['1', '+1'], // typing a first digit adds the +
    ['+1212', '+1212'],
    ['+44 20 7946 0958', '+442079460958'], // spaces stripped
    ['+1 (212) 555-0123', '+12125550123'], // autofill with country code
    ['++1', '+1'], // only one leading +
    ['+1+2', '+12'], // + only allowed first
    ['+0', '+'], // country codes never start with 0
    ['+1234567890123456789', '+123456789012345'], // capped at 15 digits
    ['(212) 555-0123', '+12125550123'], // pasted/autofilled 10-digit US number → +1
    ['2125550123', '+12125550123'],
    ['abc', ''],
  ])('should_turn_%j_into_%j', (input, expected) => {
    expect(sanitizeE164Input(input)).toBe(expected);
  });
});

describe('isPlausibleE164', () => {
  it.each([
    ['+12125550123', true],
    ['+442079460958', true],
    ['+1234567', true], // 7 digits: shortest accepted
    ['+123456', false],
    ['+', false],
    ['12125550123', false], // missing +
    ['+02125550123', false],
    ['+1234567890123456', false], // 16 digits
  ])('should_judge_%j_as_%s', (input, expected) => {
    expect(isPlausibleE164(input)).toBe(expected);
  });
});

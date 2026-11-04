// E.164: "+" then a country code (never starting with 0) and subscriber number, 15 digits max.
const E164_MAX_DIGITS = 15;

/**
 * Normalize phone-field input to E.164 as the user types: one leading "+", digits only,
 * no leading 0, capped at 15 digits. Typing a first digit adds the "+".
 *
 * A bare 10-digit US number arriving all at once (paste or browser autofill, e.g.
 * "(212) 555-0123") gets "+1": without it the "+" rule would turn it into +212…
 * (Morocco). Typing digit by digit never hits this, since the "+" is already there.
 */
export function sanitizeE164Input(input: string): string {
  let digits = input.replace(/\D/g, '');
  const hadPlus = input.trimStart().startsWith('+');
  if (!hadPlus && /^[2-9]\d{9}$/.test(digits)) digits = `1${digits}`;
  digits = digits.replace(/^0+/, '').slice(0, E164_MAX_DIGITS);
  if (!hadPlus && digits === '') return '';
  return `+${digits}`;
}

/** True once the value looks like a complete E.164 number (7–15 digits). */
export function isPlausibleE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

/**
 * Lead qualification questions, per-answer scores, and the scoring function.
 *
 * Single source of truth: the contact form renders the questions from
 * `leadQuestions`, and the API route scores the submitted answers with
 * `scoreLead`. Each answer contributes discrete points across three dimensions:
 *
 *   - icp       Ideal Customer Profile match (are they the kind of dog
 *               business we serve well, with a real operation + decision maker)
 *   - pay       Ability to pay (revenue/volume signals + economic sophistication)
 *   - readiness Readiness to accept leads (buying intent + fit for lead-gen now)
 */

export type LeadDimension = 'icp' | 'pay' | 'readiness';

export interface LeadOption {
  value: string;
  label: string;
  score: Partial<Record<LeadDimension, number>>;
}

export interface LeadQuestion {
  id: string;
  label: string;
  kind: 'radio' | 'text';
  options?: LeadOption[];
}

export const leadQuestions: LeadQuestion[] = [
  {
    id: 'role',
    label: 'What’s your role?',
    kind: 'radio',
    options: [
      { value: 'owner-dogs', label: 'Owner working with dogs', score: { icp: 3, pay: 1, readiness: 2 } },
      { value: 'owner-staff', label: 'Owner managing staff', score: { icp: 3, pay: 3, readiness: 2 } },
      { value: 'manager', label: 'Manager', score: { icp: 1, pay: 2, readiness: 1 } },
      { value: 'other', label: 'Other…', score: {} },
    ],
  },
  {
    id: 'dogsPerWeek',
    label: 'How many dogs do you serve in a typical week?',
    kind: 'radio',
    options: [
      { value: 'under-10', label: 'Under 10', score: { icp: 0, pay: 0, readiness: 1 } },
      { value: '10-25', label: '10–25', score: { icp: 1, pay: 1, readiness: 1 } },
      { value: '26-50', label: '26–50', score: { icp: 2, pay: 2, readiness: 1 } },
      { value: '51-100', label: '51–100', score: { icp: 3, pay: 3, readiness: 1 } },
      { value: '100-plus', label: '100+', score: { icp: 3, pay: 4, readiness: 1 } },
    ],
  },
  {
    id: 'clientSource',
    label: 'Where do most new clients come from?',
    kind: 'radio',
    options: [
      { value: 'referrals', label: 'Referrals', score: { icp: 2, readiness: 1 } },
      { value: 'google-maps', label: 'Google or Maps', score: { icp: 2, readiness: 2 } },
      { value: 'social', label: 'Social', score: { icp: 1, readiness: 2 } },
      { value: 'paid-ads', label: 'Paid ads', score: { pay: 2, readiness: 3 } },
      { value: 'not-sure', label: 'Not sure', score: {} },
      { value: 'other', label: 'Other…', score: {} },
    ],
  },
  {
    id: 'costKnowledge',
    label: 'How well do you know your cost per new client?',
    kind: 'radio',
    options: [
      { value: 'exact', label: 'Exact figure', score: { pay: 3, readiness: 2 } },
      { value: 'rough', label: 'Rough idea', score: { pay: 2, readiness: 1 } },
      { value: 'not-sure', label: 'Not sure', score: {} },
    ],
  },
  {
    id: 'frustration',
    label: 'What frustrates you most about getting clients?',
    kind: 'radio',
    options: [
      { value: 'price-shoppers', label: 'Price shoppers', score: { readiness: 1 } },
      { value: 'no-shows', label: 'No-shows', score: { readiness: 1 } },
      { value: 'seasonal-dips', label: 'Seasonal dips', score: { readiness: 2 } },
      { value: 'inconsistent-leads', label: 'Inconsistent leads', score: { icp: 2, readiness: 3 } },
      { value: 'too-little-time', label: 'Too little time', score: { icp: 1, readiness: 2 } },
      { value: 'other', label: 'Other…', score: {} },
    ],
  },
  {
    id: 'triedBefore',
    label: 'What have you already tried?',
    kind: 'radio',
    options: [
      { value: 'agency', label: 'Agency', score: { pay: 2, readiness: 2 } },
      { value: 'fb-google-ads', label: 'Facebook or Google ads', score: { pay: 2, readiness: 3 } },
      { value: 'seo', label: 'SEO', score: { pay: 1, readiness: 2 } },
      { value: 'lead-marketplace', label: 'Lead marketplace', score: { pay: 2, readiness: 3 } },
      { value: 'nothing-yet', label: 'Nothing yet', score: { icp: 1, readiness: 1 } },
      { value: 'other', label: 'Other…', score: {} },
    ],
  },
  {
    id: 'tenMoreClients',
    label: 'What would you do with 10 more clients a month?',
    kind: 'radio',
    options: [
      { value: 'hire-help', label: 'Hire help', score: {} },
      { value: 'add-services', label: 'Add services', score: {} },
      { value: 'open-location', label: 'Open a location', score: {} },
      { value: 'pay-myself-more', label: 'Pay myself more', score: {} },
      { value: 'other', label: 'Other…', score: {} },
    ],
  },
  {
    id: 'startTiming',
    label: 'When do you want to start?',
    kind: 'radio',
    options: [
      { value: 'now', label: 'Now', score: { readiness: 4 } },
      { value: 'within-30-days', label: 'Within 30 days', score: { readiness: 3 } },
      { value: '1-3-months', label: '1–3 months', score: { readiness: 2 } },
      { value: '3-plus-months', label: '3+ months', score: { readiness: 1 } },
      { value: 'researching', label: 'Just researching', score: { readiness: 0 } },
    ],
  },
];

const DIMENSIONS: LeadDimension[] = ['icp', 'pay', 'readiness'];

export type LeadTier = 'Strong' | 'Moderate' | 'Weak';
export type SophisticationTier = 'Pro' | 'Intermediate' | 'Novice';

// Marketing sophistication / buyer maturity: how experienced a marketing buyer
// they are, from the economic + channel + prior-effort signals. Drives the
// sales motion (educate a Novice vs. close a Pro). Kept separate from the icp/
// pay/readiness total so it doesn't double-count those signals.
const SOPHISTICATION_POINTS: Record<string, Record<string, number>> = {
  costKnowledge: { exact: 2, rough: 1, 'not-sure': 0 },
  triedBefore: { agency: 2, 'fb-google-ads': 2, 'lead-marketplace': 2, seo: 1, 'nothing-yet': 0 },
  clientSource: { 'paid-ads': 2, 'google-maps': 1, social: 1, referrals: 0, 'not-sure': 0 },
};

// Frustrations that more leads won't fix — buying leads risks disappointing them
// (expectation/fit mismatch), so flag for sales even if otherwise qualified.
// Keyword-scanned from the free-text frustration answer.
const AT_RISK_FRUSTRATION_RE = /price[-\s]*shop|no[-\s]*show/i;

export interface LeadScore {
  icp: number;
  pay: number;
  readiness: number;
  total: number;
  max: Record<LeadDimension, number>;
  tiers: Record<LeadDimension, LeadTier>;
  sophistication: { score: number; max: number; tier: SophisticationTier };
  fitRisk: { atRisk: boolean; label: string };
}

/** Maximum achievable points per dimension, derived from the question set. */
function maxScores(): Record<LeadDimension, number> {
  const max: Record<LeadDimension, number> = { icp: 0, pay: 0, readiness: 0 };
  for (const q of leadQuestions) {
    if (!q.options) continue;
    for (const d of DIMENSIONS) {
      max[d] += Math.max(0, ...q.options.map((o) => o.score[d] ?? 0));
    }
  }
  return max;
}

function tierFor(value: number, max: number): LeadTier {
  const pct = max > 0 ? value / max : 0;
  if (pct >= 0.66) return 'Strong';
  if (pct >= 0.33) return 'Moderate';
  return 'Weak';
}

/** Sum the discrete per-answer scores into the three dimensions, with tiers. */
export function scoreLead(answers: Record<string, string | undefined | null>): LeadScore {
  const sum: Record<LeadDimension, number> = { icp: 0, pay: 0, readiness: 0 };
  for (const q of leadQuestions) {
    if (!q.options) continue;
    const opt = q.options.find((o) => o.value === answers[q.id]);
    if (!opt) continue;
    for (const d of DIMENSIONS) sum[d] += opt.score[d] ?? 0;
  }
  const max = maxScores();

  // Sophistication (separate from the primary total).
  let soph = 0;
  let sophMax = 0;
  for (const [qId, points] of Object.entries(SOPHISTICATION_POINTS)) {
    sophMax += Math.max(0, ...Object.values(points));
    soph += points[answers[qId] ?? ''] ?? 0;
  }
  const sophPct = sophMax > 0 ? soph / sophMax : 0;
  const sophTier: SophisticationTier =
    sophPct >= 0.66 ? 'Pro' : sophPct >= 0.33 ? 'Intermediate' : 'Novice';

  // Fit risk: a price-shoppers/no-shows choice, or an "Other" write-in that
  // mentions them. (More leads won't fix those frustrations.)
  const frustration = answers.frustration ?? '';
  const atRisk =
    frustration === 'price-shoppers' ||
    frustration === 'no-shows' ||
    (frustration === 'other' && AT_RISK_FRUSTRATION_RE.test(answers.frustrationOther ?? ''));

  return {
    icp: sum.icp,
    pay: sum.pay,
    readiness: sum.readiness,
    total: sum.icp + sum.pay + sum.readiness,
    max,
    tiers: {
      icp: tierFor(sum.icp, max.icp),
      pay: tierFor(sum.pay, max.pay),
      readiness: tierFor(sum.readiness, max.readiness),
    },
    sophistication: { score: soph, max: sophMax, tier: sophTier },
    fitRisk: {
      atRisk,
      label: atRisk ? 'At Risk — leads won’t fix this frustration' : 'Good Fit',
    },
  };
}

/** Human-readable label for a stored answer value (falls back to the raw value). */
export function labelFor(questionId: string, value: string | undefined | null): string {
  if (!value) return '';
  const q = leadQuestions.find((x) => x.id === questionId);
  if (!q?.options) return value;
  return q.options.find((o) => o.value === value)?.label ?? value;
}

/**
 * Display value for an answer that may be a custom "Other" write-in: if the
 * selected value is "other", show the typed text; otherwise the option label.
 */
export function resolveAnswer(
  questionId: string,
  value: string | undefined | null,
  otherValue: string | undefined | null
): string {
  if (value === 'other') return (otherValue ?? '').trim() || 'Other';
  return labelFor(questionId, value);
}

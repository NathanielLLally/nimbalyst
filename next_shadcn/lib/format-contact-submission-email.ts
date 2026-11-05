/**
 * Format a contact form submission into a plaintext transactional email body
 *
 * Extracts client metadata (IP, user agent, host) from the request and combines
 * it with form data to create a complete audit trail.
 */

import { scoreLead, labelFor } from './lead-scoring';

interface ContactFormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  businessType: string;
  monthlyBudget: string;
  role: string;
  dogsPerWeek: string;
  clientSource: string;
  costKnowledge: string;
  frustration: string;
  triedBefore: string;
  tenMoreClients: string;
  startTiming: string;
  receiveMessages: boolean;
  timezone?: string;
  submittedAt?: string;
}

/**
 * RequestLike accepts various header object types:
 * - Map<string, string> (from vitest mocks)
 * - Record<string, string> (plain objects)
 * - Headers (from Node.js/Web API, used by NextRequest)
 */
interface RequestLike {
  headers: Map<string, string> | Record<string, string> | { get: (key: string) => string | null };
}

/**
 * Normalize header lookup to a consistent interface.
 * Accepts Map, Record, or Headers objects.
 */
function createHeaderGetter(
  headers: Map<string, string> | Record<string, string> | { get: (key: string) => string | null }
): (key: string) => string | undefined {
  if (headers instanceof Map) {
    return (key) => headers.get(key.toLowerCase());
  }

  if (typeof (headers as any).get === 'function') {
    // Headers object (has .get() method, case-insensitive internally)
    return (key) => (headers as any).get(key) ?? undefined;
  }

  // Plain object
  return (key) => {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === key.toLowerCase()) {
        return v;
      }
    }
    return undefined;
  };
}

/**
 * Extract client IP from request headers.
 *
 * Checks in order: X-Real-IP, X-Forwarded-For (first IP), fallback to empty string.
 * X-Real-IP is set by nginx proxy_set_header; X-Forwarded-For is a chain.
 */
function extractClientIP(
  headers: Map<string, string> | Record<string, string> | { get: (key: string) => string | null }
): string {
  const getHeader = createHeaderGetter(headers);

  // Check X-Real-IP first (set by nginx)
  const realIP = getHeader('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fall back to X-Forwarded-For (may be a chain: "client, proxy1, proxy2")
  const forwardedFor = getHeader('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain
    return forwardedFor.split(',')[0].trim();
  }

  return '';
}

/**
 * Extract user agent string from request headers.
 */
function extractUserAgent(
  headers: Map<string, string> | Record<string, string> | { get: (key: string) => string | null }
): string {
  const getHeader = createHeaderGetter(headers);
  return getHeader('user-agent') || '';
}

/**
 * Extract request host from headers.
 */
function extractHost(
  headers: Map<string, string> | Record<string, string> | { get: (key: string) => string | null }
): string {
  const getHeader = createHeaderGetter(headers);
  return getHeader('host') || '';
}

/**
 * Format form data and request metadata into a plaintext email body.
 *
 * Includes all form fields, timestamp, and request details (IP, user agent, host).
 * Compatible with contact-email-sender's plaintext-only requirement.
 */
export function formatContactSubmissionEmail(
  formData: ContactFormData,
  request: RequestLike
): string {
  const clientIP = extractClientIP(request.headers);
  const userAgent = extractUserAgent(request.headers);
  const host = extractHost(request.headers);

  // Build the email body with clear section separators
  const sections: string[] = [];

  // Header
  sections.push('='.repeat(60));
  sections.push('CONTACT FORM SUBMISSION');
  sections.push('='.repeat(60));
  sections.push('');

  // Form Data Section
  sections.push('FORM DATA');
  sections.push('-'.repeat(60));
  sections.push(`Full Name:        ${formData.fullName}`);
  sections.push(`Email:            ${formData.email}`);
  sections.push(`Phone:            ${formData.phone}`);
  sections.push(`Company:          ${formData.company}`);
  sections.push(`Website:          ${formData.website}`);
  sections.push(`Business Type:    ${formData.businessType}`);
  sections.push(`Monthly Budget:   ${formData.monthlyBudget}`);
  sections.push(`Receive Messages: ${formData.receiveMessages ? 'Yes' : 'No'}`);
  sections.push('');

  // Lead Qualification Section
  sections.push('LEAD QUALIFICATION');
  sections.push('-'.repeat(60));
  sections.push(`Role:                 ${labelFor('role', formData.role)}`);
  sections.push(`Dogs/Week:            ${labelFor('dogsPerWeek', formData.dogsPerWeek)}`);
  sections.push(`New Clients From:     ${labelFor('clientSource', formData.clientSource)}`);
  sections.push(`Cost/Client Known:    ${labelFor('costKnowledge', formData.costKnowledge)}`);
  sections.push(`Biggest Frustration:  ${labelFor('frustration', formData.frustration)}`);
  sections.push(`Already Tried:        ${labelFor('triedBefore', formData.triedBefore)}`);
  sections.push(`10 More Clients:      ${formData.tenMoreClients}`);
  sections.push(`Wants To Start:       ${labelFor('startTiming', formData.startTiming)}`);
  sections.push('');

  // Lead Score Section
  const score = scoreLead(formData as unknown as Record<string, string>);
  sections.push('LEAD SCORE');
  sections.push('-'.repeat(60));
  sections.push(`ICP Match:        ${score.icp}/${score.max.icp} (${score.tiers.icp})`);
  sections.push(`Ability To Pay:   ${score.pay}/${score.max.pay} (${score.tiers.pay})`);
  sections.push(`Readiness:        ${score.readiness}/${score.max.readiness} (${score.tiers.readiness})`);
  sections.push(`Total:            ${score.total}/${score.max.icp + score.max.pay + score.max.readiness}`);
  sections.push(`Sophistication:   ${score.sophistication.score}/${score.sophistication.max} (${score.sophistication.tier})`);
  sections.push(`Fit Risk:         ${score.fitRisk.label}`);
  sections.push('');

  // Timestamp Section
  sections.push('SUBMISSION TIME');
  sections.push('-'.repeat(60));
  sections.push(`Submitted At: ${formData.submittedAt || 'Not provided'}`);
  if (formData.timezone) {
    sections.push(`Timezone:     ${formData.timezone}`);
  }
  sections.push('');

  // Request Metadata Section
  sections.push('REQUEST METADATA');
  sections.push('-'.repeat(60));
  if (clientIP) {
    sections.push(`Client IP:    ${clientIP}`);
  }
  if (host) {
    sections.push(`Host:         ${host}`);
  }
  if (userAgent) {
    sections.push(`User Agent:   ${userAgent}`);
  }
  sections.push('');

  sections.push('='.repeat(60));

  return sections.join('\n');
}

/**
 * Contact Sequence Manager
 *
 * Manages the sequential contact flow:
 * 1. Phone call (initial)
 * 2. SMS (followup)
 * 3. Email (informational)
 * 4. Phone call (retry attempts)
 */

enum ContactStage {
  PHONE_CALL = 'phone_call',
  SMS = 'sms',
  EMAIL = 'email',
  PHONE_RETRY = 'phone_retry',
  COMPLETED = 'completed',
}

interface ContactSequenceRow {
  id: string;
  phone: string;
  name: string;
  email: string;
  company: string;
  challenge: string;
  stage: ContactStage;
  attemptCount: number;
  status: string;
  notes: string;
}

/**
 * Determine the next stage in the contact flow
 */
export function getNextStage(currentStage: ContactStage): ContactStage {
  const sequence = [
    ContactStage.PHONE_CALL,
    ContactStage.SMS,
    ContactStage.EMAIL,
    ContactStage.PHONE_RETRY,
  ];

  const currentIndex = sequence.indexOf(currentStage);
  const nextIndex = currentIndex + 1;

  return nextIndex < sequence.length ? sequence[nextIndex] : ContactStage.COMPLETED;
}

/**
 * Get the delay (in minutes) before moving to the next stage
 */
export function getStageDelay(stage: ContactStage): number {
  const delays: Record<ContactStage, number> = {
    [ContactStage.PHONE_CALL]: 0, // Immediate
    [ContactStage.SMS]: 30, // 30 minutes after phone call attempt
    [ContactStage.EMAIL]: 60, // 1 hour after SMS
    [ContactStage.PHONE_RETRY]: 1440, // 24 hours before first retry
    [ContactStage.COMPLETED]: 0,
  };

  return delays[stage] || 0;
}

/**
 * Get retry delays for phone retry stage (in minutes)
 */
export function getPhoneRetryDelays(): number[] {
  return [1440, 2880, 7200]; // 24h, 48h, 5 days
}

/**
 * Get the message template for each stage
 */
export function getStageMessage(
  stage: ContactStage,
  contactName: string,
  attemptNumber: number = 1
): string | null {
  const messages: Record<ContactStage, string> = {
    [ContactStage.PHONE_CALL]:
      `Initial outreach call to ${contactName}`,
    [ContactStage.SMS]:
      `Hi ${contactName}! Following up on our earlier message. We'd love to help with your scheduling needs. Reply or call us back anytime!`,
    [ContactStage.EMAIL]:
      `Hi ${contactName},\n\nJust wanted to reach out about your inquiry. We're here to help with scheduling. Feel free to reach out at your convenience.\n\nBest regards`,
    [ContactStage.PHONE_RETRY]:
      `Retry call ${attemptNumber} to ${contactName}`,
    [ContactStage.COMPLETED]: null,
  };

  return messages[stage] || null;
}

/**
 * Check if a stage should be skipped (e.g., SMS if no phone)
 */
export function shouldSkipStage(
  stage: ContactStage,
  contactData: { phone?: string; email?: string }
): boolean {
  if (stage === ContactStage.SMS && !contactData.phone) {
    return true;
  }
  if (stage === ContactStage.EMAIL && !contactData.email) {
    return true;
  }
  return false;
}

/**
 * Format stage name for display
 */
export function getStageName(stage: ContactStage): string {
  const names: Record<ContactStage, string> = {
    [ContactStage.PHONE_CALL]: '📞 Phone Call',
    [ContactStage.SMS]: '💬 SMS',
    [ContactStage.EMAIL]: '📧 Email',
    [ContactStage.PHONE_RETRY]: '🔄 Phone Retry',
    [ContactStage.COMPLETED]: '✅ Completed',
  };

  return names[stage] || stage;
}

export default {
  ContactStage,
  getNextStage,
  getStageDelay,
  getPhoneRetryDelays,
  getStageMessage,
  shouldSkipStage,
  getStageName,
};

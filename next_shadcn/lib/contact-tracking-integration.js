/**
 * Integration helpers for Vapi contact tracker with your form.
 * Use these utilities to wire up the tracker to your existing Happy Tails flow.
 */

/**
 * Call this from your form submission endpoint to create a tracking record.
 *
 * @param {Object} formData - From your MultiStepContactForm
 * @returns {Object} { success: boolean, contactId: string, error?: string }
 */
export async function trackContactInVapiSheet(formData) {
  try {
    const response = await fetch('/api/contact-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'form_submit',
        formData: {
          phone: formData.phone,
          name: formData.fullName,
          email: formData.email,
          company: formData.company,
          challenge: formData.challenge,
        },
        channel: 'voice', // or 'sms'
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Contact tracked:', data.contactId);
      return { success: true, contactId: data.contactId };
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    console.error('❌ Failed to track contact:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Optional: Poll for contact status.
 * Useful for showing "Your call is queued..." messages in the UI.
 *
 * @param {string} contactId - From trackContactInVapiSheet response
 * @returns {Object} { status: string, notes: string }
 */
export async function getContactStatus(contactId) {
  try {
    const response = await fetch(`/api/vapi-status/${contactId}`);
    const data = await response.json();

    if (data.success) {
      return {
        status: data.status, // PENDING, IN_PROGRESS, SUCCESS, FAILED, RETRY_EXHAUSTED
        notes: data.notes,
      };
    } else {
      return { status: 'unknown', notes: data.error };
    }
  } catch (err) {
    console.error('Failed to fetch status:', err.message);
    return { status: 'unknown', notes: err.message };
  }
}

/**
 * User-friendly status display.
 */
export function getStatusDisplay(status) {
  const display = {
    PENDING: { emoji: '⏳', text: 'Queued for call', color: 'text-yellow-500' },
    IN_PROGRESS: { emoji: '📞', text: 'Call in progress...', color: 'text-blue-500' },
    SUCCESS: { emoji: '✅', text: 'Call connected', color: 'text-green-500' },
    FAILED: { emoji: '⚠️', text: 'Call failed, will retry', color: 'text-orange-500' },
    RETRY_EXHAUSTED: { emoji: '❌', text: 'Unable to reach', color: 'text-red-500' },
    unknown: { emoji: '❓', text: 'Checking status...', color: 'text-gray-500' },
  };

  return display[status] || display.unknown;
}

/**
 * Recommended: Add a status check to your post-submission flow.
 *
 * Usage in your component:
 *
 * ```javascript
 * // After successful form submission:
 * const trackResult = await trackContactInVapiSheet(formData);
 *
 * if (trackResult.success) {
 *   // Show status for 2 minutes, updating every 10 seconds
 *   let attempts = 0;
 *   const interval = setInterval(async () => {
 *     const { status, notes } = await getContactStatus(trackResult.contactId);
 *     const display = getStatusDisplay(status);
 *
 *     // Update UI with display.emoji, display.text, display.color
 *
 *     if (['SUCCESS', 'RETRY_EXHAUSTED'].includes(status) || attempts > 12) {
 *       clearInterval(interval);
 *     }
 *     attempts++;
 *   }, 10000);
 * }
 * ```
 */

export default {
  trackContactInVapiSheet,
  getContactStatus,
  getStatusDisplay,
};

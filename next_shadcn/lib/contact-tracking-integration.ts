/**
 * Integration helpers for Vapi contact tracker with your form.
 * Use these utilities to wire up the tracker to your existing Happy Tails flow.
 */

/**
 * Call this from your form submission endpoint to create a tracking record.
 *
 * @param formData - From your MultiStepContactForm
 * @returns Result with success status and contactId
 */
export async function trackContactInVapiSheet(formData: {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  challenge: string;
}): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const response = await fetch('/api/contact-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'form_submit',
        formData,
        channel: 'voice', // or 'sms'
      }),
    });

    const data = (await response.json()) as {
      success: boolean;
      contactId?: string;
      error?: string;
    };

    if (data.success) {
      console.log('✅ Contact tracked:', data.contactId);
      return { success: true, contactId: data.contactId };
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to track contact:', errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Optional: Poll for contact status.
 * Useful for showing "Your call is queued..." messages in the UI.
 *
 * @param contactId - From trackContactInVapiSheet response
 * @returns Status and notes
 */
export async function getContactStatus(
  contactId: string
): Promise<{ status: string; notes: string }> {
  try {
    const response = await fetch(`/api/vapi-status/${contactId}`);
    const data = (await response.json()) as {
      success: boolean;
      status?: string;
      notes?: string;
      error?: string;
    };

    if (data.success) {
      return {
        status: data.status || 'unknown',
        notes: data.notes || '',
      };
    } else {
      return { status: 'unknown', notes: data.error || 'Unknown error' };
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Failed to fetch status:', errMsg);
    return { status: 'unknown', notes: errMsg };
  }
}

/**
 * User-friendly status display.
 */
export function getStatusDisplay(status: string): {
  emoji: string;
  text: string;
  color: string;
} {
  const display: Record<
    string,
    { emoji: string; text: string; color: string }
  > = {
    PENDING: {
      emoji: '⏳',
      text: 'Queued for call',
      color: 'text-yellow-500',
    },
    IN_PROGRESS: {
      emoji: '📞',
      text: 'Call in progress...',
      color: 'text-blue-500',
    },
    SUCCESS: { emoji: '✅', text: 'Call connected', color: 'text-green-500' },
    FAILED: {
      emoji: '⚠️',
      text: 'Call failed, will retry',
      color: 'text-orange-500',
    },
    RETRY_EXHAUSTED: {
      emoji: '❌',
      text: 'Unable to reach',
      color: 'text-red-500',
    },
    unknown: {
      emoji: '❓',
      text: 'Checking status...',
      color: 'text-gray-500',
    },
  };

  return display[status] || display.unknown;
}

export default {
  trackContactInVapiSheet,
  getContactStatus,
  getStatusDisplay,
};

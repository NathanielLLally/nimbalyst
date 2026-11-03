import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sheets = vi.hoisted(() => {
  const mock = () => vi.fn<(...args: any[]) => Promise<any>>(async () => ({}));
  return {
    getTrackerData: mock(),
    createContactRow: mock(),
    updateContactRow: mock(),
    appendContactNote: mock(),
    findContactRows: mock(),
  };
});

// Google Sheets, Cal.com and Twilio are external; the tracker logic runs for real
vi.mock('../lib/googleSheetUtils', () => sheets);

import { processContacts } from '../lib/vapi-contact-tracker';

const MEET = 'https://meet.google.com/iju-itgx-uqv';

// contact_tracking: A ID | B Phone | C Name | ... F Status | G Attempt Count ... N Timezone | O Cal Booking | P Meeting SMS Sent
function bookedRow({ uid = 'cal_uid_1', smsSent = '', timezone = 'America/New_York', status = 'SUCCESS' } = {}) {
  const row: any[] = ['contact_1', '+15555550100', 'Jane Lead', 'jane@acme.com', 'voice', status, '1 of 4'];
  row[13] = timezone;
  row[14] = uid;
  row[15] = smsSent;
  return row;
}

type Booking = Record<string, unknown> | null;

describe('contact tracker texts the meeting details once per Cal booking', () => {
  const fetchMock = vi.fn();
  let bookings: Record<string, Booking>;
  let twilioOk: boolean;

  function sheetWith(row: any[]) {
    sheets.getTrackerData.mockResolvedValue([['header'], row]);
  }

  const calCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).startsWith('https://api.cal.com/'));
  const smsBodies = () =>
    fetchMock.mock.calls
      .filter(([url]) => String(url).includes('api.twilio.com'))
      .map(([, init]) => Object.fromEntries(new URLSearchParams(init.body)));
  // Cells written to O (Cal Booking) and P (Meeting SMS Sent)
  const cellWrites = () =>
    sheets.updateContactRow.mock.calls
      .map((c: any[]) => c[2])
      .filter((u: any) => 14 in u || 15 in u);

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('GOOGLE_SHEET_ID', 'sheet');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'svc@example.com');
    vi.stubEnv('GOOGLE_PRIVATE_KEY', 'key');
    vi.stubEnv('VAPI_API_KEY', 'vapi-key');
    vi.stubEnv('VAPI_PHONE_NUMBER_ID', 'phone-id');
    vi.stubEnv('VAPI_ASSISTANT_ID', 'assistant-id');
    vi.stubEnv('CAL_API_KEY', 'cal-key');
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC1');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'tw-token');
    vi.stubEnv('TWILIO_PHONE_NUMBER', '+15555550000');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Tuesday, November 3 2026, 10:00 AM in New York
    vi.setSystemTime(new Date('2026-11-03T15:00:00Z'));

    bookings = {
      cal_uid_1: { uid: 'cal_uid_1', status: 'accepted', start: '2026-11-04T17:00:00.000Z', meetingUrl: MEET },
    };
    twilioOk = true;
    fetchMock.mockImplementation(async (url: string) => {
      const cal = String(url).match(/^https:\/\/api\.cal\.com\/v2\/bookings\/([^/?]+)$/);
      if (cal) {
        const booking = bookings[cal[1]];
        return booking
          ? new Response(JSON.stringify({ status: 'success', data: booking }), { status: 200 })
          : new Response(JSON.stringify({ status: 'error', error: { code: 'NotFoundException' } }), { status: 404 });
      }
      if (String(url).includes('api.twilio.com')) {
        return twilioOk
          ? new Response(JSON.stringify({ sid: 'SM1' }), { status: 201 })
          : new Response(JSON.stringify({ message: 'invalid number' }), { status: 400 });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
    Object.values(sheets).forEach((fn) => fn.mockReset());
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('should_text_meeting_day_time_and_link_to_the_contact', async () => {
    // Given
    sheetWith(bookedRow());

    // When
    await processContacts();

    // Then
    expect(smsBodies()).toEqual([
      {
        From: '+15555550000',
        To: '+15555550100',
        Body: `Hi Jane Lead, your call with Happy Tails Paw Care is confirmed for Wednesday, November 4 at 12:00 PM EST. Join on Google Meet: ${MEET}`,
      },
    ]);
  });

  it('should_mark_meeting_sms_sent_with_the_send_time', async () => {
    // Given
    sheetWith(bookedRow());

    // When
    await processContacts();

    // Then
    expect(cellWrites()).toEqual([{ 15: '2026-11-03T15:00:00.000Z' }]);
  });

  it('should_use_the_contacts_timezone', async () => {
    // Given
    sheetWith(bookedRow({ timezone: 'America/Chicago' }));

    // When
    await processContacts();

    // Then
    expect(smsBodies()[0].Body).toContain('Wednesday, November 4 at 11:00 AM CST');
  });

  it.each([['a send time', '2026-11-03T14:00:00.000Z'], ['a not-sent reason', 'not sent: cancelled']])(
    'should_ignore_rows_whose_meeting_sms_sent_holds_%s',
    async (_case, smsSent) => {
      // Given
      sheetWith(bookedRow({ smsSent }));

      // When
      await processContacts();

      // Then: not even a Cal lookup
      expect(calCalls().length + smsBodies().length).toBe(0);
    }
  );

  it('should_treat_zero_as_not_sent', async () => {
    // Given
    sheetWith(bookedRow({ smsSent: '0' }));

    // When
    await processContacts();

    // Then
    expect(smsBodies().length).toBe(1);
  });

  it('should_do_nothing_for_rows_without_a_cal_booking', async () => {
    // Given
    sheetWith(bookedRow({ uid: '' }));

    // When
    await processContacts();

    // Then
    expect(calCalls().length + smsBodies().length).toBe(0);
  });

  it.each([
    ['cancelled', { uid: 'cal_uid_1', status: 'cancelled', start: '2026-11-04T17:00:00.000Z' }, 'not sent: cancelled'],
    ['rejected', { uid: 'cal_uid_1', status: 'rejected', start: '2026-11-04T17:00:00.000Z' }, 'not sent: rejected'],
    ['not found', null, 'not sent: booking not found'],
    ['already started', { uid: 'cal_uid_1', status: 'accepted', start: '2026-11-03T14:30:00.000Z', meetingUrl: MEET }, 'not sent: meeting already started'],
  ])('should_not_text_and_record_why_when_booking_is_%s', async (_case, booking, reason) => {
    // Given
    bookings.cal_uid_1 = booking;
    sheetWith(bookedRow());

    // When
    await processContacts();

    // Then
    expect({ sms: smsBodies().length, writes: cellWrites() }).toEqual({ sms: 0, writes: [{ 15: reason }] });
  });

  it('should_follow_a_reschedule_to_the_new_booking_without_texting_yet', async () => {
    // Given
    bookings.cal_uid_1 = { uid: 'cal_uid_1', status: 'cancelled', start: '2026-11-04T17:00:00.000Z', rescheduledToUid: 'cal_uid_2' };
    sheetWith(bookedRow());

    // When
    await processContacts();

    // Then
    expect({ sms: smsBodies().length, writes: cellWrites() }).toEqual({ sms: 0, writes: [{ 14: 'cal_uid_2' }] });
  });

  it('should_leave_meeting_sms_sent_empty_so_a_failed_text_is_retried', async () => {
    // Given
    twilioOk = false;
    sheetWith(bookedRow());

    // When
    await processContacts();

    // Then
    expect(cellWrites()).toEqual([]);
  });

  it('should_text_regardless_of_the_rows_call_status', async () => {
    // Given: still in the voice retry flow
    sheetWith(bookedRow({ status: 'FAILED' }));
    bookings.cal_uid_1 = { uid: 'cal_uid_1', status: 'accepted', start: '2026-11-04T17:00:00.000Z', meetingUrl: MEET };

    // When
    await processContacts();

    // Then
    expect(smsBodies().length).toBe(1);
  });
});

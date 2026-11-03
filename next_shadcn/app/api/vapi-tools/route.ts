// app/api/vapi-tools/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

// Vapi tools send the "Happy Tails Webhook" bearer credential, whose token is
// VAPI_WEBHOOK_SECRET. Fails closed when the secret isn't configured.
function isAuthorizedVapiRequest(req: NextRequest) {
  const secret = process.env.VAPI_WEBHOOK_SECRET
  if (!secret) return false

  const provided = Buffer.from(req.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedVapiRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, parameters } = body.message.toolCall

    if (name === 'check_availability') {
      if (!parameters?.timezone) {
        return NextResponse.json(
          { error: 'Missing required parameter: timezone' },
          { status: 400 }
        )
      }
      const slots = await getCalAvailability(parameters.timezone)
      return NextResponse.json({ result: slots })
    }

    if (name === 'book_meeting') {
      // Cal.com rejects undeliverable emails, so there's no usable placeholder
      if (!parameters?.email) {
        return NextResponse.json(
          { error: 'Missing required parameter: email' },
          { status: 400 }
        )
      }
      const booking = await createCalBooking(parameters)
      return NextResponse.json({ result: `Booked for ${booking.start}` })
    }

    if (name === 'cancel_booking') {
      const result = await cancelBooking(parameters.email, parameters.reason);
      return NextResponse.json({ result: result })
    }

    return NextResponse.json(
      { error: `Unknown tool: ${name}` },
      { status: 400 }
    )
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('❌ Vapi tools error:', errMsg)
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    )
  }
}

// Cal.com versions each endpoint family separately
const CAL_SLOTS_API_VERSION = '2024-09-04'
const CAL_BOOKINGS_API_VERSION = '2024-08-13'

// Every Cal.com call authenticates with the same CAL_API_KEY bearer token
function calHeaders(apiVersion: string, extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${process.env.CAL_API_KEY}`,
    'cal-api-version': apiVersion,
    ...extra,
  }
}

async function getCalAvailability(timezone: string) {
  try {
    const now = new Date()
    const startTime = now.toISOString()
    const endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    const eventTypeId = process.env.CAL_EVENT_TYPE_ID

    const res = await fetch(
      `https://api.cal.com/v2/slots?eventTypeId=${eventTypeId}&start=${encodeURIComponent(startTime)}&end=${encodeURIComponent(endTime)}&timeZone=${encodeURIComponent(timezone)}`,
      { headers: calHeaders(CAL_SLOTS_API_VERSION) }
    )

    if (!res.ok) {
      const errorData = await res.text()
      console.error('❌ Cal.com availability error:', errorData)
      throw new Error(`Cal.com API error: ${res.status} ${res.statusText} - ${errorData}`)
    }

    const data = await res.json()

    // Cal.com v2 groups slots by date: { data: { 'YYYY-MM-DD': [{ start }] } }
    const slots = Object.values(data?.data ?? {}).flat() as any[]

    if (slots.length === 0) {
      return 'No availability found'
    }

    // format into something the LLM can read back naturally
    return slots.map((s: any) => s.start).slice(0, 6).join(', ')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to get availability: ${errMsg}`)
  }
}

async function cancelBooking(email: string, reason?: string) {
  // 1. Look up upcoming bookings for this attendee
  const lookupRes = await fetch(
    `https://api.cal.com/v2/bookings?attendeeEmail=${encodeURIComponent(email)}&status=upcoming`,
    { headers: calHeaders(CAL_BOOKINGS_API_VERSION) }
  );
  const lookup = await lookupRes.json();
  const bookings = lookup.data ?? [];

  if (bookings.length === 0) {
    return { success: false, message: 'No upcoming booking found for that email.' };
  }

  // If they have multiple upcoming bookings, cancel the soonest one
  const booking = bookings.sort(
    (a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )[0];

  // 2. Cancel it
  const cancelRes = await fetch(
    `https://api.cal.com/v2/bookings/${booking.uid}/cancel`,
    {
      method: 'POST',
      headers: calHeaders(CAL_BOOKINGS_API_VERSION, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        cancellationReason: reason || 'Cancelled by lead via voice agent',
      }),
    }
  );

  if (!cancelRes.ok) {
    const err = await cancelRes.text();
    return { success: false, message: `Cancellation failed: ${err}` };
  }

  return {
    success: true,
    message: `Cancelled booking originally scheduled for ${booking.start}.`,
    cancelledStart: booking.start,
  };
}

async function createCalBooking(params: any) {
  try {
    if (!params.datetime || !params.timezone) {
      throw new Error('Missing required parameters: datetime and timezone')
    }

    const eventTypeId = parseInt(process.env.CAL_EVENT_TYPE_ID || '0', 10)
    if (isNaN(eventTypeId) || eventTypeId === 0) {
      throw new Error('CAL_EVENT_TYPE_ID must be a valid number')
    }

    const res = await fetch(`https://api.cal.com/v2/bookings`, {
      method: 'POST',
      headers: calHeaders(CAL_BOOKINGS_API_VERSION, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        eventTypeId,
        start: params.datetime,
        attendee: {
          name: params.name || 'Unknown',
          email: params.email,
          timeZone: params.timezone,
          language: 'en',
        },
        metadata: {},
      }),
    })

    if (!res.ok) {
      const errorData = await res.text()
      console.error('❌ Cal.com booking error:', errorData)
      throw new Error(`Cal.com API error: ${res.status} ${res.statusText} - ${errorData}`)
    }

    // v2 wraps the booking: { status, data: { uid, start, ... } }
    const { data: booking } = await res.json()
    return booking
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create booking: ${errMsg}`)
  }
}

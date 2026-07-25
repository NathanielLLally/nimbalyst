// app/api/vapi-tools/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, parameters } = body.message.toolCall

    if (name === 'check_availability') {
      const slots = await getCalAvailability(parameters.timezone)
      return NextResponse.json({ result: slots })
    }

    if (name === 'book_meeting') {
      const booking = await createCalBooking(parameters)
      return NextResponse.json({ result: `Booked for ${booking.start}` })
    }

    if (name === 'cancel_booking') {
      const result = await cancelBooking(parameters.email, parameters.reason);
      return NextResponse.json({ result: result })';
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

async function getCalAvailability(timezone: string) {
  try {
    const now = new Date()
    const startTime = now.toISOString()
    const endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    const eventTypeId = process.env.CAL_EVENT_TYPE_ID

    const res = await fetch(
      `https://api.cal.com/v2/slots/available?apiKey=${process.env.CAL_API_KEY}&eventTypeId=${eventTypeId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&timeZone=${encodeURIComponent(timezone)}`,
    )

    if (!res.ok) {
      const errorData = await res.text()
      console.error('❌ Cal.com availability error:', errorData)
      throw new Error(`Cal.com API error: ${res.status} ${res.statusText} - ${errorData}`)
    }

    const data = await res.json()

    if (!data.slots || !Array.isArray(data.slots)) {
      return 'No availability found'
    }

    // format into something the LLM can read back naturally
    return data.slots.map((s: any) => s.time || s.start).slice(0, 6).join(', ')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to get availability: ${errMsg}`)
  }
}

async function cancelBooking(email: string, reason?: string) {
  // 1. Look up upcoming bookings for this attendee
  const lookupRes = await fetch(
    `https://api.cal.com/v2/bookings?attendeeEmail=${encodeURIComponent(email)}&status=upcoming`,
    { headers: { Authorization: `Bearer ${process.env.CAL_API_KEY}` } }
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
      headers: {
        Authorization: `Bearer ${process.env.CAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CAL_API_KEY}`,
      },
      body: JSON.stringify({
        eventTypeId,
        start: params.datetime,
        timeZone: params.timezone,
        language: 'en',
        metadata: {},
        responses: {
          name: params.name || 'Unknown',
          email: params.email || 'noemail@placeholder.com',
        },
      }),
    })

    if (!res.ok) {
      const errorData = await res.text()
      console.error('❌ Cal.com booking error:', errorData)
      throw new Error(`Cal.com API error: ${res.status} ${res.statusText} - ${errorData}`)
    }

    const booking = await res.json()
    return booking
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create booking: ${errMsg}`)
  }
}

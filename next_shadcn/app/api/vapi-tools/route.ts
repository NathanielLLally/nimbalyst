// app/api/vapi-tools/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, parameters } = body.message.toolCall

  if (name === 'check_availability') {
    const slots = await getCalAvailability(parameters.timezone)
    return NextResponse.json({ result: slots })
  }

  if (name === 'book_meeting') {
    const booking = await createCalBooking(parameters)
    return NextResponse.json({ result: `Booked for ${booking.startTime}` })
  }
}

async function getCalAvailability(timezone: string) {
  const res = await fetch(
    `https://api.cal.com/v1/availability?apiKey=${process.env.CAL_API_KEY}&dateFrom=...&dateTo=...`,
  )
  const data = await res.json()
  // format into something the LLM can read back naturally
  return data.slots.map((s: any) => s.time).slice(0, 6).join(', ')
}

async function createCalBooking(params: any) {
  const res = await fetch(`https://api.cal.com/v1/bookings?apiKey=${process.env.CAL_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventTypeId: process.env.CAL_EVENT_TYPE_ID,
      start: params.datetime,
      timeZone: params.timezone,
      responses: {
        name: params.name,
        email: params.email || 'noemail@placeholder.com',
      },
    }),
  })
  return res.json()
}

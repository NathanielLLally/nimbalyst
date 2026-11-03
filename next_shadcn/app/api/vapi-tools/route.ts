// app/api/vapi-tools/route.ts
import { NextRequest, NextResponse, after } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import * as SheetUtils from '@/lib/googleSheetUtils'

// Vapi tools send the "Happy Tails Webhook" bearer credential, whose token is
// VAPI_WEBHOOK_SECRET. Fails closed when the secret isn't configured.
function isAuthorizedVapiRequest(req: NextRequest) {
  const secret = process.env.VAPI_WEBHOOK_SECRET
  if (!secret) return false

  const provided = Buffer.from(req.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

// Describes the Authorization header without revealing tokens: compare
// tokenSha256 against the first 12 hex chars of sha256(VAPI_WEBHOOK_SECRET)
function describeAuthHeader(req: NextRequest) {
  const header = req.headers.get('authorization')
  if (!header) return 'no Authorization header'

  const [scheme, ...rest] = header.split(' ')
  const token = rest.join(' ')
  const fingerprint = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12)
  return [
    `scheme=${scheme}`,
    `tokenLength=${token.length}`,
    `tokenSha256=${fingerprint(token)}`,
    `expectedLength=${process.env.VAPI_WEBHOOK_SECRET?.length ?? 0}`,
    `expectedSha256=${process.env.VAPI_WEBHOOK_SECRET ? fingerprint(process.env.VAPI_WEBHOOK_SECRET) : 'unset'}`,
  ].join(' ')
}

// Live calls come server-to-server from Vapi and need no CORS; this only lets
// the dashboard's tool "Test" button, which runs in the browser, reach the route
const CORS_ALLOWED_ORIGINS = ['https://dashboard.vapi.ai']

function withCors(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get('origin')
  if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.headers.set('Vary', 'Origin')
  }
  return res
}

export async function OPTIONS(req: NextRequest) {
  return withCors(req, new NextResponse(null, { status: 204 }))
}

export async function POST(req: NextRequest) {
  return withCors(req, await handleToolCalls(req))
}

// nginx sets X-Real-IP to the connecting address. Without it, take the last
// X-Forwarded-For entry (the one the proxy appended); earlier entries come
// from the client and can be spoofed.
function sourceIp(req: NextRequest) {
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const forwarded = req.headers.get('x-forwarded-for')?.split(',').pop()?.trim()
  return forwarded || 'unknown'
}

async function handleToolCalls(req: NextRequest) {
  const ip = sourceIp(req)

  if (!isAuthorizedVapiRequest(req)) {
    console.warn(`❌ Vapi tools unauthorized: ip=${ip}`, describeAuthHeader(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const toolCalls = body?.message?.toolCallList
  if (!Array.isArray(toolCalls)) {
    return NextResponse.json(
      { error: 'Expected a Vapi tool-calls message with message.toolCallList' },
      { status: 400 }
    )
  }

  // Vapi expects HTTP 200 with one { toolCallId, result | error } per call;
  // result and error must be strings
  const results = await Promise.all(
    toolCalls.map(async (toolCall: any) => {
      const { name, parameters } = parseToolCall(toolCall)
      const label = `🔧 Vapi tool ${name} id=${toolCall.id} ip=${ip}`
      const startedAt = Date.now()
      try {
        const raw = await runTool(name, parameters, body.message.call)
        const result = typeof raw === 'string' ? raw : JSON.stringify(raw)
        console.log(`${label} → ok (${Date.now() - startedAt}ms) result="${truncate(result.replace(/\n/g, ' | '), 200)}"`)
        return { name, toolCallId: toolCall.id, result }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        console.error(`${label} → error: ${errMsg} (${Date.now() - startedAt}ms)`)
        return { name, toolCallId: toolCall.id, error: errMsg }
      }
    })
  )

  return NextResponse.json({ results })
}

function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

// toolCallList entries arrive either flat ({ name, parameters }) or as OpenAI
// tool calls ({ function: { name, arguments } }) with arguments as a JSON string
function parseToolCall(toolCall: any) {
  const name = toolCall.name ?? toolCall.function?.name
  const rawParams = toolCall.parameters ?? toolCall.function?.arguments ?? {}
  const parameters = typeof rawParams === 'string' ? JSON.parse(rawParams) : rawParams
  return { name, parameters }
}

// Used when the agent doesn't pass a timezone; results always name the
// timezone so the agent reads times back correctly
const DEFAULT_TIMEZONE = 'America/New_York'

// The Vapi call a tool request belongs to: its id, and the variables the
// contact tracker started it with (including contactId)
interface VapiCall {
  id?: string
  assistantOverrides?: { variableValues?: Record<string, unknown> }
}

async function runTool(name: string, parameters: any, call?: VapiCall) {
  if (name === 'check_availability') {
    const timezone = parameters?.timezone || DEFAULT_TIMEZONE
    const slots = await getCalAvailability(timezone)
    return slots.length === 0
      ? `No availability found (${timezone})`
      : describeSlots(slots, timezone)
  }

  if (name === 'book_meeting') {
    // Cal.com rejects undeliverable emails, so there's no usable placeholder
    if (!parameters?.email) {
      throw new Error('Missing required parameter: email')
    }
    const timezone = parameters.timezone || DEFAULT_TIMEZONE
    const booking = await createCalBooking({ ...parameters, timezone })
    // Record the booking after the response so Vapi isn't kept waiting
    after(() => recordCalBooking(booking.uid, call))
    const localStart = plainSpaces(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(booking.start))
    )
    return `Booked for ${localStart} (${timezone})`
  }

  if (name === 'cancel_booking') {
    return cancelBooking(parameters.email, parameters.reason)
  }

  throw new Error(`Unknown tool: ${name}`)
}

// contact_tracking columns: A ID, L Vapi Call ID, O Cal Booking
const CONTACT_ID_COLUMN = 0
const VAPI_CALL_ID_COLUMN = 11
const CAL_BOOKING_COLUMN = 14

/**
 * Write a Cal booking uid to the contact's row. The row is found by the
 * contactId the tracker sent with the call, falling back to the Vapi call ID
 * for calls placed before contactId was sent. Never throws: a failed write is
 * logged and must not affect the booking.
 */
async function recordCalBooking(uid: string, call?: VapiCall) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    const sheetName = process.env.SHEET_NAME || 'Sheet1'
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID not set')

    const contactId = call?.assistantOverrides?.variableValues?.contactId
    let matches = contactId
      ? await SheetUtils.findContactRows(sheetId, CONTACT_ID_COLUMN, String(contactId), sheetName)
      : []
    if (matches.length === 0 && call?.id) {
      matches = await SheetUtils.findContactRows(sheetId, VAPI_CALL_ID_COLUMN, call.id, sheetName)
    }
    if (matches.length === 0) {
      console.warn(`⚠️ Cal booking ${uid}: no contact_tracking row for contactId=${contactId ?? '-'} call=${call?.id ?? '-'}`)
      return
    }

    const { rowIndex } = matches[0]
    await SheetUtils.updateContactRow(sheetId, rowIndex, { [CAL_BOOKING_COLUMN]: uid } as any, sheetName)
    console.log(`📅 Cal booking ${uid} → ${sheetName} row ${rowIndex}`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.warn(`⚠️ Cal booking ${uid}: could not record in sheet: ${errMsg}`)
  }
}

// Newer ICU puts a narrow no-break space before AM/PM; keep plain spaces for TTS
function plainSpaces(text: string) {
  return text.replace(/[  ]/g, ' ')
}

function joinWithOr(items: string[]) {
  if (items.length <= 2) return items.join(' or ')
  return `${items.slice(0, -1).join(', ')}, or ${items[items.length - 1]}`
}

/**
 * Spoken-style availability ("today at 7 PM; tomorrow (Wednesday, November 4)
 * at 12 PM or 1:30 PM") plus the exact datetimes book_meeting needs. Data only:
 * how to offer the times is up to the assistant's system prompt. Days are
 * judged in the caller's timezone.
 */
function describeSlots(slots: string[], timezone: string, now = new Date()) {
  const dateKey = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const weekdayDate = (d: Date) =>
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long', month: 'long', day: 'numeric' }).format(d)
  const spokenTime = (d: Date) =>
    plainSpaces(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(d)
    ).replace(':00', '')

  const today = dateKey(now)
  // Step from today's calendar date, not now + 24h, so DST changes can't skip a day
  const tomorrowDate = new Date(`${today}T00:00:00Z`)
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
  const tomorrow = tomorrowDate.toISOString().slice(0, 10)

  const days: { key: string; label: string; spoken: string; slots: { time: string; iso: string }[] }[] = []
  for (const iso of slots) {
    const d = new Date(iso)
    const key = dateKey(d)
    let day = days.find((x) => x.key === key)
    if (!day) {
      const label = key === today ? 'today' : key === tomorrow ? 'tomorrow' : weekdayDate(d)
      const spoken = key === tomorrow ? `tomorrow (${weekdayDate(d)})` : label
      day = { key, label, spoken, slots: [] }
      days.push(day)
    }
    day.slots.push({ time: spokenTime(d), iso })
  }

  const spoken = days.map((day) => `${day.spoken} at ${joinWithOr(day.slots.map((s) => s.time))}`).join('; ')
  const exact = days
    .flatMap((day) => day.slots.map((s) => `${day.label} at ${s.time} = ${s.iso}`))
    .join('; ')

  return [`Available times (${timezone}): ${spoken}.`, `Exact datetimes: ${exact}.`].join('\n')
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

    return slots.map((s: any) => s.start as string).slice(0, 6)
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

import { NextRequest, NextResponse } from 'next/server';
import { processContacts } from '@/lib/vapi-contact-tracker';

/**
 * Trigger contact processing and dispatch
 * POST /api/vapi-process
 *
 * This endpoint should be called periodically (via cron or scheduler)
 * to dispatch pending contacts to Vapi and poll in-progress calls
 */

export async function POST(request: NextRequest) {
  try {
    // Optional: Check for authorization header
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.VAPI_PROCESS_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Processing contacts...');
    await processContacts();

    return NextResponse.json(
      { success: true, message: 'Contact processing completed' },
      { status: 200 }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Contact processing error:', errMsg);

    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

// Also expose as GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}

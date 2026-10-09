import { NextResponse } from 'next/server';
import { pingDb } from '@/lib/db';

// Public, unauthenticated health/keep-alive endpoint. A scheduled task hits
// this periodically so the Railway free-tier Postgres database sees regular
// traffic and isn't flagged inactive. It does a trivial round-trip query
// only - no app data is read or written.
export async function GET() {
  try {
    const db = await pingDb();
    return NextResponse.json({ success: true, db });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { pingDb } from '@/lib/db';
import { getErrorMessage } from '@/lib/errors';

// Belt-and-suspenders: force dynamic rendering even if Cache Components
// (next.config.ts) is ever re-enabled, or on a Next.js version where it's
// on by default. This directive is the long-stable mechanism for opting a
// Route Handler out of static optimization; connection() below is the
// Cache-Components-specific escape hatch. Belonging to both worlds means
// this route can never again get silently baked into a build-time cache.
export const dynamic = 'force-dynamic';

// Public, unauthenticated health/keep-alive endpoint. A scheduled task hits
// this periodically so the Railway free-tier Postgres database sees regular
// traffic and isn't flagged inactive. It does a trivial round-trip query
// only - no app data is read or written.
export async function GET() {
  // Forces per-request execution. Without this, Cache Components (Next.js
  // 16) sees no cookies()/headers() call, treats the DB ping as static data,
  // and bakes ONE response in at build time forever - so this would always
  // report the DB as healthy using a timestamp from the last deploy.
  await connection();
  try {
    const db = await pingDb();
    return NextResponse.json({ success: true, db });
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

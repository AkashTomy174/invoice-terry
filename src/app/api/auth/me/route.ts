import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { readDb } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

// Belt-and-suspenders: force dynamic rendering even if Cache Components
// (next.config.ts) is ever re-enabled, or on a Next.js version where it's
// on by default. This directive is the long-stable mechanism for opting a
// Route Handler out of static optimization; connection() below is the
// Cache-Components-specific escape hatch. Belonging to both worlds means
// this route can never again get silently baked into a build-time cache.
export const dynamic = 'force-dynamic';

export async function GET() {
  // Reads the session cookie per-request. Must happen before the try/catch:
  // under Cache Components, the dynamic bail-out this (and getServerSession's
  // cookies() call) triggers is a throw, and a surrounding try/catch would
  // swallow it, letting Next.js statically cache this route at build time
  // with a permanent "not authenticated" response (the bug that broke login).
  await connection();
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const db = await readDb();
    const user = db.users.find((u) => u.id === session.id);

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

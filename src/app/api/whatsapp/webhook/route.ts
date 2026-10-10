import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { readDb, withTransaction } from '@/lib/db';
import { getErrorMessage } from '@/lib/errors';

// Belt-and-suspenders: force dynamic rendering even if Cache Components
// (next.config.ts) is ever re-enabled, or on a Next.js version where it's
// on by default. This directive is the long-stable mechanism for opting a
// Route Handler out of static optimization; connection() below is the
// Cache-Components-specific escape hatch. Belonging to both worlds means
// this route can never again get silently baked into a build-time cache.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // See src/app/api/health/route.ts - without this, Cache Components could
  // bake in a single build-time response (a 403, since the build has no
  // real hub.verify_token query param), permanently breaking Meta's webhook
  // verification handshake.
  await connection();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const db = await readDb();
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || db.shop_settings.whatsapp_verify_token;

  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge || '', { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Process Meta WhatsApp status updates
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const statuses = value?.statuses;

    if (statuses && Array.isArray(statuses)) {
      await withTransaction((db) => {
        for (const item of statuses) {
          const wamid = item.id;
          const status: string | undefined = item.status?.toUpperCase(); // SENT, DELIVERED, READ, FAILED
          const msg = db.whatsapp_messages.find((m) => m.message_id === wamid);
          if (msg && status && ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(status)) {
            // Narrowed by the includes() check above, so this cast is safe.
            msg.status = status === 'READ' ? 'DELIVERED' : (status as 'SENT' | 'DELIVERED' | 'FAILED');
            msg.updated_at = new Date().toISOString();
          }
        }
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ status: 'error', error: getErrorMessage(err) }, { status: 200 });
  }
}

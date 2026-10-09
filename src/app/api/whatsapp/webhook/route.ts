import { NextResponse } from 'next/server';
import { readDb, withTransaction } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const db = readDb();
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
          const status = item.status?.toUpperCase(); // SENT, DELIVERED, READ, FAILED
          const msg = db.whatsapp_messages.find((m) => m.message_id === wamid);
          if (msg && ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(status)) {
            msg.status = status === 'READ' ? 'DELIVERED' : (status as any);
            msg.updated_at = new Date().toISOString();
          }
        }
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ status: 'error', error: err.message }, { status: 200 });
  }
}

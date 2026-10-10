import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // See src/app/api/health/route.ts - forces per-request execution instead
  // of a build-time static snapshot under Cache Components.
  await connection();
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing invoice id' }, { status: 400 });
    }

    const db = await readDb();
    const purchase = db.purchases.find(
      (p) => p.id === id || p.invoice_number.toLowerCase() === id.toLowerCase()
    );

    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      purchase,
      settings: db.shop_settings,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

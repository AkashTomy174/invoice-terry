import { NextResponse } from 'next/server';
import { readDb, normalizePhone } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone: rawPhone } = await params;
    const phone = normalizePhone(rawPhone);

    const db = readDb();
    const customer = db.customers.find((c) => c.phone === phone);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const purchases = db.purchases
      .filter((p) => p.customer_id === customer.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      customer,
      purchases,
      loyalty: {
        count: customer.loyalty_count,
        max: db.shop_settings.required_visits,
        unlocked: customer.loyalty_reward_unlocked,
        remaining: Math.max(0, db.shop_settings.required_visits - customer.loyalty_count),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

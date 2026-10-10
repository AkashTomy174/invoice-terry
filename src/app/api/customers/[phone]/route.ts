import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { readDb, normalizePhone } from '@/lib/db';
import { getErrorMessage } from '@/lib/errors';

// Belt-and-suspenders: force dynamic rendering even if Cache Components
// (next.config.ts) is ever re-enabled, or on a Next.js version where it's
// on by default. This directive is the long-stable mechanism for opting a
// Route Handler out of static optimization; connection() below is the
// Cache-Components-specific escape hatch. Belonging to both worlds means
// this route can never again get silently baked into a build-time cache.
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  // See src/app/api/health/route.ts - forces per-request execution instead
  // of a build-time static snapshot under Cache Components.
  await connection();
  try {
    const { phone: rawPhone } = await params;
    const phone = normalizePhone(rawPhone);

    const db = await readDb();
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
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

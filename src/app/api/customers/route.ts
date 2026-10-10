import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { readDb, withTransaction, generateId, normalizePhone } from '@/lib/db';
import { Customer } from '@/lib/types';
import { getErrorMessage } from '@/lib/errors';

// Belt-and-suspenders: force dynamic rendering even if Cache Components
// (next.config.ts) is ever re-enabled, or on a Next.js version where it's
// on by default. This directive is the long-stable mechanism for opting a
// Route Handler out of static optimization; connection() below is the
// Cache-Components-specific escape hatch. Belonging to both worlds means
// this route can never again get silently baked into a build-time cache.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // See src/app/api/health/route.ts - without this, Cache Components bakes
  // one static snapshot of the customer list in at build time forever.
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim().toLowerCase() || '';
    const pageSize = Math.max(1, Math.min(200, parseInt(searchParams.get('pageSize') || '20', 10) || 20));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    // 'reward' narrows to customers whose loyalty reward is currently unlocked.
    const rewardOnly = searchParams.get('reward') === 'unlocked';
    // Date range filters against when the customer joined (created_at), yyyy-mm-dd, inclusive.
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const fromTime = fromParam ? new Date(`${fromParam}T00:00:00.000Z`).getTime() : null;
    const toTime = toParam ? new Date(`${toParam}T23:59:59.999Z`).getTime() : null;

    const db = await readDb();
    let customers = [...db.customers];

    if (query) {
      customers = customers.filter(
        (c) =>
          c.phone.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query)
      );
    }

    if (rewardOnly) {
      customers = customers.filter((c) => c.loyalty_reward_unlocked);
    }

    if (fromTime !== null && !isNaN(fromTime)) {
      customers = customers.filter((c) => new Date(c.created_at).getTime() >= fromTime);
    }

    if (toTime !== null && !isNaN(toTime)) {
      customers = customers.filter((c) => new Date(c.created_at).getTime() <= toTime);
    }

    // Sort newest customer first by default.
    customers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = customers.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const paginated = customers.slice(offset, offset + pageSize);

    return NextResponse.json({
      success: true,
      customers: paginated,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawPhone = body.phone?.trim();
    const name = body.name?.trim();
    const address = body.address?.trim() || '';

    if (!rawPhone || !name) {
      return NextResponse.json(
        { success: false, error: 'Phone number and Name are required' },
        { status: 400 }
      );
    }

    const phone = normalizePhone(rawPhone);
    if (phone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    const customer = await withTransaction((db) => {
      const existing = db.customers.find((c) => c.phone === phone);
      const now = new Date().toISOString();

      if (existing) {
        existing.name = name;
        if (address) existing.address = address;
        existing.updated_at = now;
        return existing;
      }

      const newCustomer: Customer = {
        id: generateId('cust'),
        phone,
        name,
        address,
        total_purchases: 0,
        total_weight_grams: 0,
        total_amount_spent: 0,
        loyalty_count: 0,
        loyalty_reward_unlocked: false,
        last_purchase_at: null,
        created_at: now,
        updated_at: now,
      };

      db.customers.push(newCustomer);
      return newCustomer;
    });

    return NextResponse.json({ success: true, customer });
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

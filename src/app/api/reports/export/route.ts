import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { readDb } from '@/lib/db';
import { getErrorMessage } from '@/lib/errors';

// Belt-and-suspenders: force dynamic rendering even if Cache Components
// (next.config.ts) is ever re-enabled, or on a Next.js version where it's
// on by default. This directive is the long-stable mechanism for opting a
// Route Handler out of static optimization; connection() below is the
// Cache-Components-specific escape hatch. Belonging to both worlds means
// this route can never again get silently baked into a build-time cache.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // See src/app/api/health/route.ts - forces per-request execution instead
  // of a build-time static snapshot under Cache Components.
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'purchases'; // purchases | customers | loyalty

    const db = await readDb();

    if (type === 'customers') {
      const headers = [
        'Customer ID',
        'Name',
        'Phone',
        'Address',
        'Total Purchases',
        'Total Weight (g)',
        'Total Spent (INR)',
        'Loyalty Count',
        'Reward Unlocked',
        'Last Purchase Date',
      ];

      const rows = db.customers.map((c) => [
        `"${c.id}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        c.total_purchases,
        c.total_weight_grams,
        c.total_amount_spent.toFixed(2),
        `${c.loyalty_count}/5`,
        c.loyalty_reward_unlocked ? 'YES' : 'NO',
        c.last_purchase_at ? `"${c.last_purchase_at}"` : '""',
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="terry_customers_${Date.now()}.csv"`,
        },
      });
    }

    // Default: Purchases export
    const headers = [
      'Invoice Number',
      'Date',
      'Customer Name',
      'Phone',
      'Weight (Grams)',
      'Weight (KG)',
      'Rate/KG (INR)',
      'Subtotal (INR)',
      'Loyalty Discount (INR)',
      'Final Amount (INR)',
      'Payment Method',
      'Status',
      'Loyalty Applied',
      'Loyalty Progress After',
    ];

    const rows = db.purchases.map((p) => [
      `"${p.invoice_number}"`,
      `"${p.created_at}"`,
      `"${p.customer_name.replace(/"/g, '""')}"`,
      `"${p.customer_phone}"`,
      p.weight_grams,
      p.weight_kg.toFixed(3),
      p.rate_per_kg,
      p.subtotal.toFixed(2),
      p.discount_amount.toFixed(2),
      p.final_amount.toFixed(2),
      `"${p.payment_method}"`,
      `"${p.status}"`,
      p.loyalty_applied ? 'YES' : 'NO',
      `"${p.loyalty_progress_after}/5"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="terry_sales_report_${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { withTransaction, generateId } from '@/lib/db';
import { LoyaltyTransaction } from '@/lib/types';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await withTransaction((db) => {
      const purchase = db.purchases.find((p) => p.id === id);
      if (!purchase) {
        throw new Error('Purchase not found');
      }

      if (purchase.status === 'CANCELLED') {
        throw new Error('Purchase is already cancelled');
      }

      const now = new Date().toISOString();
      const customer = db.customers.find((c) => c.id === purchase.customer_id);

      // 1. Mark transaction as Cancelled (never delete audit record)
      purchase.status = 'CANCELLED';
      purchase.updated_at = now;

      if (customer) {
        // 2. Reverse customer financials
        customer.total_purchases = Math.max(0, customer.total_purchases - 1);
        customer.total_weight_grams = Math.max(0, customer.total_weight_grams - purchase.weight_grams);
        customer.total_amount_spent = Math.max(
          0,
          Math.round((customer.total_amount_spent - purchase.final_amount) * 100) / 100
        );

        const countBefore = customer.loyalty_count;
        let countAfter = countBefore;

        // 3. Reverse loyalty status
        if (purchase.loyalty_applied) {
          // If customer used their reward on this purchase, restore the unlocked reward to them!
          customer.loyalty_count = db.shop_settings.required_visits;
          customer.loyalty_reward_unlocked = true;
          countAfter = db.shop_settings.required_visits;
        } else {
          // If this purchase contributed to their progress, roll it back
          customer.loyalty_count = Math.max(0, customer.loyalty_count - 1);
          countAfter = customer.loyalty_count;
          if (customer.loyalty_count < db.shop_settings.required_visits) {
            customer.loyalty_reward_unlocked = false;
          }
        }
        customer.updated_at = now;

        // 4. Log Reversal in loyalty_transactions table
        const reversalTx: LoyaltyTransaction = {
          id: generateId('ltx'),
          customer_id: customer.id,
          purchase_id: purchase.id,
          type: 'REVERSED',
          count_before: countBefore,
          count_after: countAfter,
          notes: `Purchase ${purchase.invoice_number} cancelled. Loyalty progress restored from ${countBefore} to ${countAfter}.`,
          created_at: now,
        };
        db.loyalty_transactions.push(reversalTx);
      }

      return { purchase, customer };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

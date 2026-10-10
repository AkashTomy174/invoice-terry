import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDb, withTransaction, generateId, normalizePhone, INVOICES_DIR, getInvoiceImageCache } from '@/lib/db';
import { calculateBilling } from '@/lib/billing';
import { sendWhatsAppInvoice } from '@/lib/whatsapp';
import { Purchase, LoyaltyTransaction, WhatsAppMessage, PaymentMethod, RoundOffMode } from '@/lib/types';
import { getErrorMessage } from '@/lib/errors';

// Belt-and-suspenders: force dynamic rendering even if Cache Components
// (next.config.ts) is ever re-enabled, or on a Next.js version where it's
// on by default. This directive is the long-stable mechanism for opting a
// Route Handler out of static optimization; connection() below is the
// Cache-Components-specific escape hatch. Belonging to both worlds means
// this route can never again get silently baked into a build-time cache.
export const dynamic = 'force-dynamic';

function saveInvoiceImage(purchaseId: string, imageDataUrl: string) {
  try {
    if (!imageDataUrl || !imageDataUrl.includes('base64,')) return;
    const base64Content = imageDataUrl.split('base64,')[1];
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Store in global memory cache
    getInvoiceImageCache().set(purchaseId, buffer);

    // Store in filesystem if writable
    try {
      if (!fs.existsSync(INVOICES_DIR)) {
        fs.mkdirSync(INVOICES_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(INVOICES_DIR, `${purchaseId}.png`), buffer);
    } catch (fsErr) {
      console.warn('Could not write image to disk, stored in memory cache:', fsErr);
    }
  } catch (err) {
    console.warn('Could not save invoice image:', err);
  }
}

export async function GET(request: Request) {
  // See src/app/api/health/route.ts - forces per-request execution instead
  // of a build-time static snapshot under Cache Components.
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const pageSize = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '50', 10) || 50));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const status = searchParams.get('status');
    const search = searchParams.get('q')?.toLowerCase();
    const paymentMethod = searchParams.get('payment_method');
    // Date range filters: 'from'/'to' are yyyy-mm-dd, inclusive, matched against created_at.
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const fromTime = fromParam ? new Date(`${fromParam}T00:00:00.000Z`).getTime() : null;
    const toTime = toParam ? new Date(`${toParam}T23:59:59.999Z`).getTime() : null;

    const db = await readDb();
    let purchases = [...db.purchases];

    if (status) {
      purchases = purchases.filter((p) => p.status === status);
    }

    if (paymentMethod) {
      purchases = purchases.filter((p) => p.payment_method === paymentMethod);
    }

    if (fromTime !== null && !isNaN(fromTime)) {
      purchases = purchases.filter((p) => new Date(p.created_at).getTime() >= fromTime);
    }

    if (toTime !== null && !isNaN(toTime)) {
      purchases = purchases.filter((p) => new Date(p.created_at).getTime() <= toTime);
    }

    if (search) {
      purchases = purchases.filter(
        (p) =>
          p.invoice_number.toLowerCase().includes(search) ||
          p.customer_name.toLowerCase().includes(search) ||
          p.customer_phone.includes(search)
      );
    }

    // Sort descending by date
    purchases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = purchases.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const paginated = purchases.slice(offset, offset + pageSize);

    return NextResponse.json({
      success: true,
      purchases: paginated,
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
    const customerName = body.name?.trim();
    const customerAddress = body.address?.trim() || '';
    const weight = parseFloat(body.weight);
    const unit = (body.unit === 'kg' ? 'kg' : 'g') as 'g' | 'kg';
    const paymentMethod = (body.payment_method || 'CASH') as PaymentMethod;
    const itemDesc = body.description?.trim() || 'Ladies Readymade Garment / Dress Material';

    // Validation
    if (!rawPhone || !customerName) {
      return NextResponse.json(
        { success: false, error: 'Customer phone number and name are required' },
        { status: 400 }
      );
    }

    const phone = normalizePhone(rawPhone);
    if (phone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Phone number must be at least 10 digits' },
        { status: 400 }
      );
    }

    if (isNaN(weight) || weight <= 0) {
      return NextResponse.json(
        { success: false, error: 'Weight must be greater than 0' },
        { status: 400 }
      );
    }

    if (weight > 100000 && unit === 'g') {
      return NextResponse.json(
        { success: false, error: 'Weight exceeds maximum allowable limit' },
        { status: 400 }
      );
    }

    const roundOffMode = body.round_off_mode as RoundOffMode | undefined;
    const manualAmount = typeof body.manual_amount === 'number'
      ? body.manual_amount
      : body.manual_amount ? parseFloat(body.manual_amount) : undefined;
    const customRoundOff = typeof body.custom_round_off === 'number' ? body.custom_round_off : undefined;

    // Atomic transaction execution
    const { createdPurchase, updatedCustomer, shopSettingsSnapshot } = await withTransaction(async (db) => {
      const now = new Date().toISOString();
      const currentYear = new Date().getFullYear();

      // Find or create customer
      let customer = db.customers.find((c) => c.phone === phone);
      if (!customer) {
        customer = {
          id: generateId('cust'),
          phone,
          name: customerName,
          address: customerAddress,
          total_purchases: 0,
          total_weight_grams: 0,
          total_amount_spent: 0,
          loyalty_count: 0,
          loyalty_reward_unlocked: false,
          last_purchase_at: null,
          created_at: now,
          updated_at: now,
        };
        db.customers.push(customer);
      } else {
        // Update name and address if provided
        customer.name = customerName;
        if (customerAddress) customer.address = customerAddress;
      }

      // Calculate exact billing and loyalty status
      const calc = calculateBilling({
        weight,
        unit,
        ratePerKg: db.shop_settings.rate_per_kg,
        customer,
        shopSettings: db.shop_settings,
        roundOffMode,
        manualAmount,
        customRoundOff,
      });

      // Generate sequential invoice number: INV-YYYY-000001
      const seq = db.meta.invoice_sequence++;
      const invoiceNumber = `INV-${currentYear}-${String(seq).padStart(6, '0')}`;

      // Create Purchase Record
      const purchase: Purchase = {
        id: generateId('pur'),
        invoice_number: invoiceNumber,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        weight_grams: calc.weightGrams,
        weight_kg: calc.weightKg,
        rate_per_kg: calc.ratePerKg,
        subtotal: calc.subtotal,
        discount_amount: calc.discountAmount,
        round_off: calc.roundOffAmount,
        final_amount: calc.finalAmount,
        payment_method: paymentMethod,
        status: 'COMPLETED',
        loyalty_applied: calc.canApplyReward,
        loyalty_progress_before: customer.loyalty_count,
        loyalty_progress_after: calc.nextLoyaltyCount,
        loyalty_message: calc.loyaltyMessage,
        created_at: now,
        updated_at: now,
        items: [
          {
            id: generateId('item'),
            purchase_id: '',
            description: itemDesc,
            weight_grams: calc.weightGrams,
            rate_per_kg: calc.ratePerKg,
            amount: calc.subtotal,
          },
        ],
      };
      purchase.items![0].purchase_id = purchase.id;

      const invoiceImage = body.invoice_image;
      if (invoiceImage) {
        saveInvoiceImage(purchase.id, invoiceImage);
        purchase.invoice_image_url = `/api/invoices/${purchase.id}/image`;
      }

      // Update Customer Stats
      customer.total_purchases += 1;
      customer.total_weight_grams += calc.weightGrams;
      customer.total_amount_spent = Math.round((customer.total_amount_spent + calc.finalAmount) * 100) / 100;
      customer.loyalty_count = calc.nextLoyaltyCount;
      customer.loyalty_reward_unlocked = calc.nextRewardUnlocked;
      customer.last_purchase_at = now;
      customer.updated_at = now;

      // Record Loyalty Transaction Audit Log
      const loyaltyTx: LoyaltyTransaction = {
        id: generateId('ltx'),
        customer_id: customer.id,
        purchase_id: purchase.id,
        type: calc.canApplyReward ? 'REDEEMED' : 'EARNED',
        count_before: purchase.loyalty_progress_before,
        count_after: purchase.loyalty_progress_after,
        notes: calc.canApplyReward
          ? `Redeemed 50% OFF on 1 KG (₹${calc.discountAmount}) reward on ${calc.weightGrams}g purchase`
          : `Completed purchase ${customer.total_purchases}. Loyalty progress now ${calc.nextLoyaltyCount}/${db.shop_settings.required_visits}`,
        created_at: now,
      };

      db.purchases.push(purchase);
      db.loyalty_transactions.push(loyaltyTx);

      return {
        createdPurchase: purchase,
        updatedCustomer: { ...customer },
        shopSettingsSnapshot: db.shop_settings,
      };
    });

    // Determine public origin for absolute invoice photo link
    const host = request.headers.get('host') || 'terrybilling.netlify.app';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const publicOrigin = `${proto}://${host}`;
    const fullImageUrl = `${publicOrigin}/api/invoices/${createdPurchase.id}/image`;

    // Trigger WhatsApp Sending (Meta API or Demo simulation)
    const waResult = await sendWhatsAppInvoice(
      createdPurchase,
      shopSettingsSnapshot,
      fullImageUrl
    );

    // Save WhatsApp message record to database
    await withTransaction((db) => {
      const waMsg: WhatsAppMessage = {
        id: generateId('wamsg'),
        purchase_id: createdPurchase.id,
        customer_id: updatedCustomer.id,
        phone: updatedCustomer.phone,
        message_type: 'INVOICE',
        content: waResult.formattedText,
        status: waResult.status,
        message_id: waResult.messageId,
        error_message: waResult.errorMessage,
        is_demo: waResult.isDemo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.whatsapp_messages.push(waMsg);
    });

    return NextResponse.json({
      success: true,
      purchase: createdPurchase,
      customer: updatedCustomer,
      whatsapp: waResult,
    });
  } catch (err) {
    console.error('Purchase creation error:', err);
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

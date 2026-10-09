import { NextResponse } from 'next/server';
import { readDb, withTransaction, generateId, normalizePhone } from '@/lib/db';
import { Customer } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim().toLowerCase() || '';

    const db = readDb();
    let customers = db.customers;

    if (query) {
      customers = customers.filter(
        (c) =>
          c.phone.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({ success: true, customers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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
      let existing = db.customers.find((c) => c.phone === phone);
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
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

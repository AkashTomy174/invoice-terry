import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { readDb, withTransaction } from '@/lib/db';
import { ShopSettings } from '@/lib/types';
import { getServerSession, isAdmin } from '@/lib/auth';

export async function GET() {
  // See src/app/api/health/route.ts - forces per-request execution instead
  // of a build-time static snapshot under Cache Components.
  await connection();
  try {
    const db = await readDb();
    const { whatsapp_access_token, ...settings } = db.shop_settings;
    // Secret token never leaves the server; mask it so the settings form
    // can show "a token is set" without exposing the real value.
    const settingsForClient = {
      ...settings,
      whatsapp_access_token: whatsapp_access_token ? '••••••••' : '',
    };
    const currentYear = new Date().getFullYear();
    const nextSeq = db.meta.invoice_sequence || 1;
    const next_invoice_number = `INV-${currentYear}-${String(nextSeq).padStart(6, '0')}`;
    return NextResponse.json({ success: true, settings: settingsForClient, next_invoice_number });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    // Proxy already blocks non-admins from reaching this route; this check
    // is a second, independent line of defense in case proxy is ever
    // bypassed, misconfigured, or this route is called from elsewhere.
    const session = await getServerSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    const updated = await withTransaction((db) => {
      const current = db.shop_settings;

      if (body.shop_name) current.shop_name = body.shop_name.trim();
      if (body.address !== undefined) current.address = body.address.trim();
      if (body.phone !== undefined) current.phone = body.phone.trim();
      if (body.whatsapp_number !== undefined) current.whatsapp_number = body.whatsapp_number.trim();
      if (body.gstin !== undefined) current.gstin = body.gstin.trim();

      if (body.rate_per_kg !== undefined) {
        const rate = parseFloat(body.rate_per_kg);
        if (!isNaN(rate) && rate > 0) current.rate_per_kg = rate;
      }

      if (body.loyalty_discount !== undefined) {
        const disc = parseFloat(body.loyalty_discount);
        if (!isNaN(disc) && disc >= 0) current.loyalty_discount = disc;
      }

      if (body.min_weight_grams !== undefined) {
        const minG = parseInt(body.min_weight_grams, 10);
        if (!isNaN(minG) && minG > 0) current.min_weight_grams = minG;
      }

      if (body.required_visits !== undefined) {
        const reqV = parseInt(body.required_visits, 10);
        if (!isNaN(reqV) && reqV > 0) current.required_visits = reqV;
      }

      if (body.round_off_mode) {
        current.round_off_mode = body.round_off_mode;
      }

      if (body.whatsapp_mode === 'DEMO' || body.whatsapp_mode === 'PRODUCTION') {
        current.whatsapp_mode = body.whatsapp_mode;
      }

      if (body.whatsapp_phone_number_id !== undefined) {
        current.whatsapp_phone_number_id = body.whatsapp_phone_number_id.trim();
      }

      if (body.whatsapp_business_account_id !== undefined) {
        current.whatsapp_business_account_id = body.whatsapp_business_account_id.trim();
      }

      if (body.whatsapp_api_version !== undefined) {
        current.whatsapp_api_version = body.whatsapp_api_version.trim();
      }

      if (body.whatsapp_verify_token !== undefined) {
        current.whatsapp_verify_token = body.whatsapp_verify_token.trim();
      }

      // Only update token if a new real token is provided (not masked)
      if (body.whatsapp_access_token && !body.whatsapp_access_token.includes('••••')) {
        current.whatsapp_access_token = body.whatsapp_access_token.trim();
      }

      if (body.message_templates) {
        current.message_templates = {
          ...current.message_templates,
          ...body.message_templates,
        };
      }

      current.updated_at = new Date().toISOString();
      return current;
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { readDb, withTransaction, generateId } from '@/lib/db';
import { sendWhatsAppInvoice } from '@/lib/whatsapp';
import { WhatsAppMessage } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { purchaseId } = await request.json();
    if (!purchaseId) {
      return NextResponse.json({ success: false, error: 'purchaseId is required' }, { status: 400 });
    }

    const db = readDb();
    const purchase = db.purchases.find((p) => p.id === purchaseId);
    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    const waResult = await sendWhatsAppInvoice(purchase, db.shop_settings);

    await withTransaction((database) => {
      let existingMsg = database.whatsapp_messages.find((m) => m.purchase_id === purchaseId);
      const now = new Date().toISOString();

      if (existingMsg) {
        existingMsg.status = waResult.status;
        existingMsg.content = waResult.formattedText;
        existingMsg.message_id = waResult.messageId;
        existingMsg.error_message = waResult.errorMessage;
        existingMsg.is_demo = waResult.isDemo;
        existingMsg.updated_at = now;
      } else {
        const newMsg: WhatsAppMessage = {
          id: generateId('wamsg'),
          purchase_id: purchase.id,
          customer_id: purchase.customer_id,
          phone: purchase.customer_phone,
          message_type: 'INVOICE',
          content: waResult.formattedText,
          status: waResult.status,
          message_id: waResult.messageId,
          error_message: waResult.errorMessage,
          is_demo: waResult.isDemo,
          created_at: now,
          updated_at: now,
        };
        database.whatsapp_messages.push(newMsg);
      }
    });

    return NextResponse.json({ success: true, result: waResult });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

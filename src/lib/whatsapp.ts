import { Purchase, ShopSettings } from './types';

export interface SendWhatsAppResult {
  success: boolean;
  isDemo: boolean;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  messageId?: string;
  errorMessage?: string;
  formattedText: string;
  /**
   * A wa.me manual-send link pre-filled with the invoice text. Present only
   * for non-demo sends. Opening it (or web.whatsapp.com/send) requires a
   * human to tap "Send" - there is no automated dispatch and no Meta
   * Business API call anywhere in this flow, so no per-message cost can
   * ever be incurred.
   */
  manualLink?: string;
}

/**
 * Format official WhatsApp invoice text as specified in Section 7
 */
export function formatWhatsAppInvoiceText(purchase: Purchase, settings: ShopSettings, imageUrl?: string): string {
  const dateFormatted = new Date(purchase.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let loyaltyStatusText = 'Progress: ' + purchase.loyalty_progress_after + '/' + settings.required_visits;
  if (purchase.loyalty_applied) {
    loyaltyStatusText = '🎁 Reward Used (50% OFF on 1 KG: ₹' + purchase.discount_amount.toFixed(2) + ' Discount Applied!)';
  } else if (purchase.loyalty_progress_after >= settings.required_visits) {
    loyaltyStatusText = '🔥 50% OFF on 1 KG Reward UNLOCKED! (Applicable on next 1 KG+ purchase)';
  }

  const photoLink = imageUrl || purchase.invoice_image_url;

  return (
    `🧾 *PURCHASE INVOICE - ${settings.shop_name}*\n\n` +
    `*Customer:* ${purchase.customer_name}\n` +
    `*Invoice No:* ${purchase.invoice_number}\n` +
    `*Date:* ${dateFormatted}\n\n` +
    `*Weight:* ${purchase.weight_kg.toFixed(2)} KG (${purchase.weight_grams}g)\n` +
    `*Rate:* ₹${purchase.rate_per_kg}/KG\n` +
    `*Subtotal:* ₹${purchase.subtotal.toFixed(2)}\n` +
    `*Loyalty Discount:* ${purchase.discount_amount > 0 ? '₹' + purchase.discount_amount.toFixed(2) + ' (50% OFF on 1 KG)' : '₹0.00'}\n` +
    (typeof purchase.round_off === 'number' && purchase.round_off !== 0
      ? `*Round Off:* ${purchase.round_off > 0 ? '+' : ''}₹${purchase.round_off.toFixed(2)}\n`
      : '') +
    `*Final Amount:* ₹${purchase.final_amount.toFixed(2)}\n` +
    `*Payment Method:* ${purchase.payment_method}\n\n` +
    `🎁 *Loyalty Status:* ${loyaltyStatusText}\n\n` +
    `*Message:* ${purchase.loyalty_message}\n\n` +
    (photoLink ? `📸 *Bill Photo:* ${photoLink}\n\n` : '') +
    `Thank you for shopping with us ❤️\n` +
    `${settings.address} | Tel: ${settings.phone || '+91 7736723917'} | WhatsApp: ${settings.whatsapp_number || '+91 7736723917'}`
  );
}

/**
 * Normalize a customer phone number to the digits-only, country-coded form
 * wa.me and Meta's API both expect (default India country code for bare
 * 10-digit numbers).
 */
function normalizeRecipientPhone(rawPhone: string): string {
  let recipientPhone = rawPhone.replace(/\D/g, '');
  if (recipientPhone.length === 10) {
    recipientPhone = `91${recipientPhone}`;
  }
  return recipientPhone;
}

/**
 * Build a wa.me manual-send link pre-filled with the invoice text.
 */
export function buildWhatsAppManualLink(purchase: Purchase, formattedText: string): string {
  const recipientPhone = normalizeRecipientPhone(purchase.customer_phone);
  return `https://wa.me/${recipientPhone}?text=${encodeURIComponent(formattedText)}`;
}

/**
 * Prepare a WhatsApp invoice send.
 *
 * There is NO Meta WhatsApp Business Cloud API call anywhere in this
 * module - it was removed deliberately so this app can never incur a
 * per-message Meta charge, regardless of what whatsapp_mode or credentials
 * are configured. Every non-demo "send" is a wa.me manual link: a human
 * (the cashier) still has to open it and tap Send in WhatsApp themselves,
 * so the status is reported as PENDING until that happens.
 */
export async function sendWhatsAppInvoice(
  purchase: Purchase,
  settings: ShopSettings,
  imageUrl?: string
): Promise<SendWhatsAppResult> {
  const formattedText = formatWhatsAppInvoiceText(purchase, settings, imageUrl);
  const isDemo = settings.whatsapp_mode === 'DEMO';

  // Demo Mode Simulation - no message of any kind leaves the app.
  if (isDemo) {
    return {
      success: true,
      isDemo: true,
      status: 'DELIVERED',
      messageId: `sim_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      formattedText,
    };
  }

  // Manual mode: build a wa.me link instead of calling Meta's paid API.
  // This always succeeds - there's no network call, no credentials to be
  // missing, and nothing that can be rejected by Meta.
  const manualLink = buildWhatsAppManualLink(purchase, formattedText);

  return {
    success: true,
    isDemo: false,
    status: 'PENDING',
    formattedText,
    manualLink,
  };
}

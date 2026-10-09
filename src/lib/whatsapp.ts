import { Purchase, ShopSettings, WhatsAppMessage } from './types';

export interface SendWhatsAppResult {
  success: boolean;
  isDemo: boolean;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  messageId?: string;
  errorMessage?: string;
  formattedText: string;
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
 * Send WhatsApp Invoice via Meta Business Cloud API or Demo Simulator
 */
export async function sendWhatsAppInvoice(
  purchase: Purchase,
  settings: ShopSettings,
  imageUrl?: string
): Promise<SendWhatsAppResult> {
  const formattedText = formatWhatsAppInvoiceText(purchase, settings, imageUrl);
  const isDemo = settings.whatsapp_mode === 'DEMO';

  // Demo Mode Simulation
  if (isDemo) {
    return {
      success: true,
      isDemo: true,
      status: 'DELIVERED',
      messageId: `sim_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      formattedText,
    };
  }

  // Production Mode: Meta WhatsApp Business Cloud API
  const token = process.env.WHATSAPP_ACCESS_TOKEN || settings.whatsapp_access_token;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || settings.whatsapp_phone_number_id;
  const apiVersion = process.env.WHATSAPP_API_VERSION || settings.whatsapp_api_version || 'v20.0';

  if (!token || !phoneNumberId) {
    return {
      success: false,
      isDemo: false,
      status: 'FAILED',
      errorMessage: 'WhatsApp credentials missing: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured.',
      formattedText,
    };
  }

  try {
    // Normalize destination number to E.164 without '+'
    let recipientPhone = purchase.customer_phone.replace(/\D/g, '');
    if (recipientPhone.length === 10) {
      recipientPhone = `91${recipientPhone}`; // Default India country code
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const hasValidImage = Boolean(imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')));

    const payload = hasValidImage
      ? {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'image',
          image: {
            link: imageUrl,
            caption: formattedText,
          },
        }
      : {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: formattedText,
          },
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return {
        success: false,
        isDemo: false,
        status: 'FAILED',
        errorMessage: data.error?.message || `WhatsApp API error ${response.status}`,
        formattedText,
      };
    }

    const messageId = data.messages?.[0]?.id || `wamid_${Date.now()}`;
    return {
      success: true,
      isDemo: false,
      status: 'SENT',
      messageId,
      formattedText,
    };
  } catch (err: any) {
    console.error('Network error sending WhatsApp message:', err);
    return {
      success: false,
      isDemo: false,
      status: 'FAILED',
      errorMessage: err.message || 'Unknown network error occurred',
      formattedText,
    };
  }
}

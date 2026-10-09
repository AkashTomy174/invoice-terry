import jsPDF from 'jspdf';
import { Purchase, ShopSettings } from './types';

/**
 * Generate a clean, elegant PDF invoice matching the retail Cash Memo standard
 */
export function generateInvoicePdf(purchase: Purchase, settings: ShopSettings): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Standard A5 receipt size
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header Bar: GSTIN & Cash Memo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`GSTIN: ${settings.gstin || '32AAAAA0000A1Z5'}`, 12, y);
  doc.setFont('helvetica', 'bold');
  doc.text('CASH MEMO / INVOICE', pageWidth / 2, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Tel: ${settings.phone}`, pageWidth - 12, y, { align: 'right' });

  y += 5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(12, y, pageWidth - 12, y);

  // Shop Name & Brand
  y += 9;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.shop_name, pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Exclusive Women\'s Wear, Boutique Collections & Readymade Garments', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(settings.address, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Deals in banner
  y += 4;
  doc.setFillColor(0, 0, 0);
  doc.rect(12, y, pageWidth - 24, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DEALS IN: LADIES READYMADE GARMENTS, DRESS MATERIALS & WEIGHT-BASED TEXTILES', pageWidth / 2, y + 3.8, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Customer & Invoice Details Table Box
  y += 8;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(12, y, pageWidth - 24, 22);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No:', 15, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(purchase.invoice_number, 33, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth - 55, y + 5);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date(purchase.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(dateStr, pageWidth - 45, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Customer:', 15, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(purchase.customer_name, 33, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Payment:', pageWidth - 55, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(purchase.payment_method, pageWidth - 40, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Phone No:', 15, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(purchase.customer_phone, 33, y + 17);

  if (purchase.customer_address) {
    doc.setFont('helvetica', 'bold');
    doc.text('City:', pageWidth - 55, y + 17);
    doc.setFont('helvetica', 'normal');
    doc.text(purchase.customer_address, pageWidth - 47, y + 17);
  }

  // Items Table
  y += 25;
  const colSr = 12;
  const colDesc = 24;
  const colRate = 80;
  const colWeight = 100;
  const colAmt = pageWidth - 12;

  // Table Header
  doc.setFillColor(245, 245, 245);
  doc.rect(12, y, pageWidth - 24, 7, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Sr.', colSr + 3, y + 4.8);
  doc.text('Description of Goods', colDesc, y + 4.8);
  doc.text('Rate / KG', colRate, y + 4.8);
  doc.text('Weight (Qty)', colWeight, y + 4.8);
  doc.text('Amount (Rs)', colAmt - 3, y + 4.8, { align: 'right' });

  // Main Item Row
  y += 7;
  doc.rect(12, y, pageWidth - 24, 8);
  doc.setFont('helvetica', 'normal');
  doc.text('1', colSr + 3, y + 5.5);
  doc.text('Ladies Dress Material / Garment', colDesc, y + 5.5);
  doc.text(`₹${purchase.rate_per_kg}`, colRate, y + 5.5);
  doc.text(`${purchase.weight_grams}g (${purchase.weight_kg.toFixed(2)} KG)`, colWeight, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹${purchase.subtotal.toFixed(2)}`, colAmt - 3, y + 5.5, { align: 'right' });

  // Discount Row if applied
  if (purchase.discount_amount > 0) {
    y += 8;
    doc.rect(12, y, pageWidth - 24, 8);
    doc.setFont('helvetica', 'normal');
    doc.text('2', colSr + 3, y + 5.5);
    doc.text('🎁 6th Visit Loyalty Reward (50% OFF on 1 KG)', colDesc, y + 5.5);
    doc.text('-', colRate, y + 5.5);
    doc.text('-', colWeight, y + 5.5);
    doc.setTextColor(0, 120, 0);
    doc.text(`-₹${purchase.discount_amount.toFixed(2)}`, colAmt - 3, y + 5.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  // Summary Totals
  y += 12;
  const summaryX = pageWidth - 65;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX, y);
  doc.text(`₹${purchase.subtotal.toFixed(2)}`, colAmt - 3, y, { align: 'right' });

  if (purchase.discount_amount > 0) {
    y += 5;
    doc.text('50% OFF 1KG Discount:', summaryX, y);
    doc.setTextColor(0, 120, 0);
    doc.text(`-₹${purchase.discount_amount.toFixed(2)}`, colAmt - 3, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  if (typeof purchase.round_off === 'number' && purchase.round_off !== 0) {
    y += 5;
    doc.text('Round Off:', summaryX, y);
    if (purchase.round_off < 0) doc.setTextColor(0, 120, 0);
    doc.text(
      `${purchase.round_off > 0 ? '+₹' : '-₹'}${Math.abs(purchase.round_off).toFixed(2)}`,
      colAmt - 3,
      y,
      { align: 'right' }
    );
    doc.setTextColor(0, 0, 0);
  }

  y += 6;
  doc.setFillColor(0, 0, 0);
  doc.rect(summaryX - 5, y - 4.5, 60, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('NET PAYABLE:', summaryX - 2, y + 1);
  doc.text(`₹${purchase.final_amount.toFixed(2)}`, colAmt - 3, y + 1, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Loyalty Program Status Box
  y += 10;
  doc.setFillColor(250, 250, 250);
  doc.rect(12, y, summaryX - 20, 16, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('LOYALTY REWARD STATUS', 15, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Current Loyalty Progress: ${purchase.loyalty_progress_after}/5 completed purchases`, 15, y + 9);
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text(purchase.loyalty_message, 15, y + 13);
  doc.setTextColor(0, 0, 0);

  // Terms and Signature
  y += 22;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', 12, y);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Goods once sold will NOT be exchanged or returned under any circumstances.', 12, y + 3.5);
  doc.text('2. Loyalty Reward: Earn points every visit (50% OFF on 1 KG upon completing 5 visits).', 12, y + 6.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('For TERRY', pageWidth - 16, y + 4, { align: 'right' });
  doc.setFontSize(7);
  doc.text('Auth. Signatory', pageWidth - 16, y + 10, { align: 'right' });

  // Bottom Center Footer
  y += 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for shopping at Terry! Please visit again ❤️', pageWidth / 2, y, { align: 'center' });

  return doc;
}

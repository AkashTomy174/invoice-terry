import jsPDF from 'jspdf';
import { Purchase, ShopSettings } from './types';

/**
 * Loads an image from a URL as an HTMLImageElement so it can be embedded
 * directly into the PDF via jsPDF's addImage (browser-only).
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Generate a clean, boutique-style PDF invoice that mirrors the on-screen
 * Cash Memo preview: logo badge, script "Invoice" heading, a simple
 * Items / Qty / Price / Total table, and a Sub-Total / Discount / Grand
 * Total footer finishing with a "Thank You" note.
 */
export async function generateInvoicePdf(purchase: Purchase, settings: ShopSettings): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Standard A5 receipt size
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let y = 16;

  const weightGrams = purchase.weight_grams || 0;
  const discountAmount = purchase.discount_amount || 0;
  const roundOff = purchase.round_off || 0;
  const concession = roundOff < 0 ? Math.abs(roundOff) : 0;
  const totalDiscount = discountAmount + concession;

  const qtyFormatted =
    weightGrams >= 1000
      ? `${(weightGrams / 1000).toFixed(weightGrams % 1000 === 0 ? 0 : 2)}`
      : `${weightGrams}g`;

  const dateStr = new Date(purchase.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const displayInvoiceNo = purchase.invoice_number?.startsWith('INV-')
    ? purchase.invoice_number.replace('INV-', '')
    : purchase.invoice_number || '';

  // ----------------------------------------------------------------
  // 1. Header: No. & Date (left) | Logo badge (center) | Invoice to (right)
  // ----------------------------------------------------------------
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`No. ${displayInvoiceNo}`, marginX, y);
  doc.text(dateStr, marginX, y + 5);

  try {
    const logoImg = await loadImage(settings.logo_url || '/logo.png');
    const logoSize = 20;
    doc.addImage(logoImg, pageWidth / 2 - logoSize / 2, y - 8, logoSize, logoSize);
  } catch {
    // If the logo can't be loaded (e.g. offline), skip it silently rather
    // than breaking PDF generation.
  }

  doc.setFontSize(9);
  doc.text('Invoice to:', pageWidth - marginX, y, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(purchase.customer_name || '', pageWidth - marginX, y + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let rightY = y + 10;
  if (purchase.customer_phone) {
    doc.text(purchase.customer_phone, pageWidth - marginX, rightY, { align: 'right' });
    rightY += 4.5;
  }
  if (purchase.customer_address) {
    doc.text(purchase.customer_address, pageWidth - marginX, rightY, {
      align: 'right',
      maxWidth: 55,
    });
  }

  // ----------------------------------------------------------------
  // 2. Script-style "Invoice" heading
  // ----------------------------------------------------------------
  y += 24;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(34);
  doc.text('Invoice', pageWidth / 2, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  // ----------------------------------------------------------------
  // 3. Table header row
  // ----------------------------------------------------------------
  y += 10;
  const colItemsX = marginX;
  const colQtyX = marginX + contentWidth * 0.46;
  const colPriceX = marginX + contentWidth * 0.64;
  const colTotalRightX = pageWidth - marginX;
  const tableDividerX = marginX + contentWidth * 0.46;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);

  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Items', colItemsX, y);
  doc.text('Qty', colQtyX + 6, y, { align: 'center' });
  doc.text('Price', colPriceX + 8, y, { align: 'center' });
  doc.text('Total', colTotalRightX, y, { align: 'right' });

  y += 2.5;
  doc.line(marginX, y, pageWidth - marginX, y);
  const tableTopY = y;

  // ----------------------------------------------------------------
  // 4. Table body
  // ----------------------------------------------------------------
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Ladies Wear & Dress Material', colItemsX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Weight-based clothing selection (${(weightGrams / 1000).toFixed(2)} KG)`, colItemsX, y + 4);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(8.5);
  doc.text(qtyFormatted, colQtyX + 6, y, { align: 'center' });
  doc.text(`Rs.${purchase.rate_per_kg}`, colPriceX + 8, y, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs.${(purchase.subtotal || 0).toFixed(2)}`, colTotalRightX, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  if (discountAmount > 0) {
    y += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Loyalty Reward (50% OFF 1 KG)', colItemsX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('6th Visit Special Offer', colItemsX, y + 4);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(8.5);
    doc.text('-', colQtyX + 6, y, { align: 'center' });
    doc.text('-', colPriceX + 8, y, { align: 'center' });
    doc.text(`-Rs.${discountAmount.toFixed(2)}`, colTotalRightX, y, { align: 'right' });
  }

  if (concession > 0) {
    y += discountAmount > 0 ? 8 : 10;
    doc.setFontSize(8);
    doc.text('Concession / Round Off', colItemsX, y);
    doc.text('-', colQtyX + 6, y, { align: 'center' });
    doc.text('-', colPriceX + 8, y, { align: 'center' });
    doc.text(`-Rs.${concession.toFixed(2)}`, colTotalRightX, y, { align: 'right' });
  }

  const tableBottomY = Math.max(y + 10, tableTopY + 32);
  doc.line(marginX, tableBottomY, pageWidth - marginX, tableBottomY);
  doc.line(tableDividerX, tableTopY, tableDividerX, tableBottomY);

  // ----------------------------------------------------------------
  // 5. Footer: Payment info (left) | Sub-Total / Discount / Grand Total (right)
  // ----------------------------------------------------------------
  y = tableBottomY + 7;
  const paymentLabel = purchase.payment_method?.toLowerCase().includes('card')
    ? 'Card Payment'
    : purchase.payment_method?.toLowerCase().includes('upi')
    ? 'UPI Payment'
    : purchase.payment_method?.toLowerCase().includes('cash')
    ? 'Cash Payment'
    : `${purchase.payment_method || 'Cash'} Payment`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(paymentLabel, colItemsX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.phone || '', colItemsX, y + 5);

  const summaryLabelX = tableDividerX + 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Sub-Total', summaryLabelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rs.${(purchase.subtotal || 0).toFixed(2)}`, colTotalRightX, y, { align: 'right' });

  y += 5.5;
  if (totalDiscount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Discount', summaryLabelX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`-Rs.${totalDiscount.toFixed(2)}`, colTotalRightX, y, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text('Tax (0%)', summaryLabelX, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Rs.0.00', colTotalRightX, y, { align: 'right' });
  }

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Grand Total', summaryLabelX, y);
  doc.text(`Rs.${(purchase.final_amount || 0).toFixed(2)}`, colTotalRightX, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  y += 5;
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);

  // ----------------------------------------------------------------
  // 6. "— Thank You —" footer
  // ----------------------------------------------------------------
  y += 16;
  doc.setFont('times', 'italic');
  doc.setFontSize(24);
  doc.text('—  Thank You  —', pageWidth / 2, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  return doc;
}

'use client';

import React from 'react';
import { Purchase, ShopSettings } from '@/lib/types';

interface CashMemoPreviewProps {
  purchase?: Partial<Purchase>;
  settings?: Partial<ShopSettings>;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  weightGrams?: number;
  ratePerKg?: number;
  subtotal?: number;
  discountAmount?: number;
  roundOff?: number;
  finalAmount?: number;
  paymentMethod?: string;
  invoiceNumber?: string;
  dateStr?: string;
  loyaltyMessage?: string;
}

export default function CashMemoPreview({
  customerName = 'Ethan Clarke',
  customerPhone = '123-456-7890',
  customerAddress = '-',
  weightGrams = 1000,
  ratePerKg = 899,
  subtotal = 899,
  discountAmount = 0,
  roundOff = 0,
  finalAmount = 899,
  paymentMethod = 'Card Payment',
  invoiceNumber = '019',
  dateStr,
  settings,
}: CashMemoPreviewProps) {
  const rawShopName = settings?.shop_name || 'BRIGHTSIDE STUDIO';
  const shopPhone = settings?.phone || '123-456-7890';

  // Format shop name for oval badge (Top line and Bottom line)
  const nameParts = rawShopName.trim().split(/\s+/);
  const badgeTop = nameParts[0]?.toUpperCase() || 'BRIGHTSIDE';
  const badgeBottom = nameParts.slice(1).join(' ').toUpperCase() || 'STUDIO';

  const [displayDate, setDisplayDate] = React.useState<string>('30/04/2026');

  React.useEffect(() => {
    if (dateStr) {
      setDisplayDate(dateStr);
    } else {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      setDisplayDate(`${dd}/${mm}/${yyyy}`);
    }
  }, [dateStr]);

  const totalDiscount = (discountAmount || 0) + (roundOff && roundOff < 0 ? Math.abs(roundOff) : 0);

  // Normalize display of invoice number to match 'No. 019' style
  const displayInvoiceNo = invoiceNumber?.startsWith('INV-')
    ? invoiceNumber.replace('INV-', '')
    : invoiceNumber || '019';

  const qtyFormatted =
    weightGrams >= 1000
      ? `${(weightGrams / 1000).toFixed(weightGrams % 1000 === 0 ? 0 : 2)}`
      : `${weightGrams}g`;

  return (
    <>
      {/* Inline styles to ensure Google Fonts load cleanly for print and html-to-image capture */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap');
        
        .script-invoice-heading {
          font-family: 'Pinyon Script', 'Alex Brush', cursive;
        }
        .serif-studio-heading {
          font-family: 'Playfair Display', Georgia, serif;
        }
      `}</style>

      <div
        id="cash-memo-preview-node"
        className="cash-memo-sheet w-full max-w-[580px] sm:max-w-[620px] mx-auto bg-white text-black px-8 py-10 sm:px-12 sm:py-14 shadow-2xl border border-neutral-300 font-sans select-none"
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
        }}
      >
        {/* ==============================================================
            1. TOP HEADER: [No. & Date] | [OVAL BADGE] | [Invoice to]
           ============================================================== */}
        <div className="grid grid-cols-12 items-start justify-between pb-4">
          {/* Top Left: No. & Date */}
          <div className="col-span-4 text-left space-y-0.5">
            <p className="text-xs sm:text-sm font-medium tracking-tight text-neutral-900 serif-studio-heading">
              No. {displayInvoiceNo}
            </p>
            <p className="text-xs sm:text-sm font-medium tracking-tight text-neutral-800">
              {displayDate}
            </p>
          </div>

          {/* Top Center: Iconic Oval Badge */}
          <div className="col-span-4 flex justify-center">
            <div className="border border-black rounded-[9999px] px-5 py-2 text-center min-w-[140px] sm:min-w-[160px] flex flex-col items-center justify-center">
              <span className="serif-studio-heading text-[11px] sm:text-xs font-bold tracking-[0.22em] uppercase text-black leading-tight">
                {badgeTop}
              </span>
              <span className="serif-studio-heading text-[10px] sm:text-[11px] font-medium tracking-[0.26em] uppercase text-black leading-tight">
                {badgeBottom}
              </span>
            </div>
          </div>

          {/* Top Right: Invoice to */}
          <div className="col-span-4 text-right space-y-0.5">
            <p className="text-xs sm:text-sm font-normal text-neutral-600">
              Invoice to:
            </p>
            <p className="text-xs sm:text-sm font-bold text-neutral-950 capitalize serif-studio-heading">
              {customerName || 'Ethan Clarke'}
            </p>
            {customerPhone && customerPhone !== '-' && (
              <p className="text-[11px] text-neutral-500 font-mono">
                {customerPhone}
              </p>
            )}
          </div>
        </div>

        {/* ==============================================================
            2. DRAMATIC SCRIPT CALLIGRAPHY: "Invoice"
           ============================================================== */}
        <div className="my-6 sm:my-8 text-center flex items-center justify-center">
          <h1
            className="script-invoice-heading text-7xl sm:text-8xl text-black font-normal leading-none select-none tracking-wide"
            style={{ fontSize: 'clamp(4.5rem, 14vw, 6.5rem)' }}
          >
            Invoice
          </h1>
        </div>

        {/* ==============================================================
            3. TABLE HEADER ROW (Divided by Crisp 1px Black Lines)
           ============================================================== */}
        <div className="border-t border-black w-full" />

        <div className="grid grid-cols-12 py-2.5 text-xs sm:text-sm font-bold text-black tracking-normal">
          <div className="col-span-5 sm:col-span-6 pl-1 text-left font-bold">
            Items
          </div>
          <div className="col-span-2 text-center font-bold">
            Qty
          </div>
          <div className="col-span-2 text-center font-bold">
            Price
          </div>
          <div className="col-span-3 sm:col-span-2 text-right pr-1 font-bold">
            Total
          </div>
        </div>

        <div className="border-t border-black w-full" />

        {/* ==============================================================
            4. TABLE BODY WITH VERTICAL DIVIDING LINE
           ============================================================== */}
        <div className="grid grid-cols-12 min-h-[220px] sm:min-h-[260px]">
          {/* Left Side: Items Description */}
          <div className="col-span-5 sm:col-span-6 py-4 pr-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-xs sm:text-sm font-bold text-black">
                  Ladies Wear & Dress Material
                </p>
                <p className="text-[11px] text-neutral-500">
                  Weight-based clothing selection ({((weightGrams || 1000) / 1000).toFixed(2)} KG)
                </p>
              </div>

              {discountAmount > 0 && (
                <div>
                  <p className="text-xs font-bold text-neutral-800">
                    Loyalty Reward (50% OFF 1 KG)
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    6th Visit Special Offer
                  </p>
                </div>
              )}

              {typeof roundOff === 'number' && roundOff < 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-700">
                    Concession / Round Off
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Qty, Price, Total (Separated by Vertical Line) */}
          <div className="col-span-7 sm:col-span-6 border-l border-black py-4 pl-3 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Primary Item Row Values */}
              <div className="grid grid-cols-7 text-xs sm:text-sm items-center">
                <div className="col-span-2 text-center font-medium">
                  {qtyFormatted}
                </div>
                <div className="col-span-2 text-center font-medium">
                  ₹{ratePerKg}
                </div>
                <div className="col-span-3 text-right pr-1 font-semibold">
                  ₹{(subtotal || 0).toFixed(2)}
                </div>
              </div>

              {/* Loyalty Discount Row Values */}
              {discountAmount > 0 && (
                <div className="grid grid-cols-7 text-xs sm:text-sm items-center text-neutral-700">
                  <div className="col-span-2 text-center font-medium">1</div>
                  <div className="col-span-2 text-center font-medium">-</div>
                  <div className="col-span-3 text-right pr-1 font-semibold text-neutral-900">
                    -₹{(discountAmount || 0).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Concession Row Values */}
              {typeof roundOff === 'number' && roundOff < 0 && (
                <div className="grid grid-cols-7 text-xs sm:text-sm items-center text-neutral-700">
                  <div className="col-span-2 text-center font-medium">-</div>
                  <div className="col-span-2 text-center font-medium">-</div>
                  <div className="col-span-3 text-right pr-1 font-semibold text-neutral-900">
                    -₹{Math.abs(roundOff).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==============================================================
            5. FOOTER SECTION: PAYMENT INFO & TOTALS (Divided by Lines)
           ============================================================== */}
        <div className="border-t border-black w-full" />

        <div className="grid grid-cols-12">
          {/* Left Bottom Box: Payment Mode & Phone/Account */}
          <div className="col-span-5 sm:col-span-6 py-4 pr-3 flex flex-col justify-center space-y-1">
            <p className="text-xs sm:text-sm font-semibold text-black">
              {paymentMethod.toLowerCase().includes('card')
                ? 'Card Payment'
                : paymentMethod.toLowerCase().includes('cash')
                ? 'Cash Payment'
                : paymentMethod.toLowerCase().includes('upi')
                ? 'UPI Payment'
                : `${paymentMethod} Payment`}
            </p>
            <p className="text-xs sm:text-sm font-normal text-neutral-800">
              {shopPhone}
            </p>
          </div>

          {/* Right Bottom Box: Sub-Total, Tax/Discount, Grand Total */}
          <div className="col-span-7 sm:col-span-6 border-l border-black py-4 pl-3 sm:pl-4 space-y-1.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center text-neutral-900">
              <span className="font-bold">Sub-Total</span>
              <span className="font-semibold pr-1">₹{(subtotal || 0).toFixed(2)}</span>
            </div>

            {totalDiscount > 0 ? (
              <div className="flex justify-between items-center text-neutral-800">
                <span className="font-bold">Discount</span>
                <span className="font-semibold pr-1">-₹{totalDiscount.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-neutral-800">
                <span className="font-bold">Tax (0%)</span>
                <span className="font-semibold pr-1">₹0.00</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 font-bold text-black text-sm sm:text-base">
              <span className="font-extrabold">Grand Total</span>
              <span className="font-black pr-1">₹{(finalAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-black w-full" />

        {/* ==============================================================
            6. BOTTOM SCRIPT CALLIGRAPHY: "Thank You"
           ============================================================== */}
        <div className="mt-8 mb-4 sm:mt-10 sm:mb-6 text-center flex items-center justify-center">
          <p
            className="script-invoice-heading text-6xl sm:text-7xl text-black font-normal leading-none select-none tracking-wide"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 5rem)' }}
          >
            Thank You
          </p>
        </div>
      </div>
    </>
  );
}

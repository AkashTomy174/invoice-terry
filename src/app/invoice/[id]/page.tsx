'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Download, Printer, ArrowLeft } from 'lucide-react';
import CashMemoPreview from '@/components/CashMemoPreview';
import { Purchase, ShopSettings } from '@/lib/types';
import { generateInvoicePdf } from '@/lib/pdf';
import Link from 'next/link';

function InvoiceContent() {
  const params = useParams();
  const id = params?.id as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/purchases/${id}`);
        const data = await res.json();
        if (data.success && data.purchase) {
          setPurchase(data.purchase);
          setSettings(data.settings);
        } else {
          setError(data.error || 'Invoice not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  const handleDownloadPdf = () => {
    if (!purchase || !settings) return;
    const doc = generateInvoicePdf(purchase, settings);
    doc.save(`${purchase.invoice_number}.pdf`);
  };

  const handleDownloadPhoto = () => {
    if (!purchase) return;
    const link = document.createElement('a');
    link.href = `/api/invoices/${purchase.id}/image`;
    link.download = `${purchase.invoice_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2eee5] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#487ec3] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-neutral-700">Loading Boutique Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-[#f2eee5] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-neutral-200 text-center max-w-md w-full space-y-4">
          <div className="text-4xl">🧾</div>
          <h2 className="text-xl font-bold text-neutral-900">Invoice Not Found</h2>
          <p className="text-xs text-neutral-600">{error || 'The requested invoice could not be located.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Billing</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-6 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs no-print">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
              ✓
            </span>
            <div>
              <h1 className="text-sm font-bold text-neutral-900">Official Purchase Invoice</h1>
              <p className="text-xs text-neutral-500 font-mono">#{purchase.invoice_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPhoto}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Bill Photo</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-bold transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* The Boutique Floral Bill */}
        <div className="flex justify-center">
          <CashMemoPreview
            customerName={purchase.customer_name}
            customerPhone={purchase.customer_phone}
            customerAddress={purchase.customer_address}
            weightGrams={purchase.weight_grams}
            ratePerKg={purchase.rate_per_kg}
            subtotal={purchase.subtotal}
            discountAmount={purchase.discount_amount}
            roundOff={purchase.round_off}
            finalAmount={purchase.final_amount}
            paymentMethod={purchase.payment_method}
            invoiceNumber={purchase.invoice_number}
            dateStr={new Date(purchase.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
            settings={settings || undefined}
          />
        </div>

        {/* Store Support Card */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 text-center space-y-1 text-xs text-neutral-600 no-print">
          <p className="font-bold text-neutral-800">
            {settings?.shop_name || 'TERRY WOMEN'} &bull; Exclusive Women&apos;s Wear
          </p>
          <p>{settings?.address || 'Calicut, Kerala'}</p>
          <p className="font-mono text-neutral-700">
            Tel / WhatsApp: {settings?.phone || '+91 7736723917'} | UPI: 7736723917@okaxis
          </p>
          <p className="text-[11px] text-neutral-400 pt-1">
            Goods once sold will not be exchanged or returned.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f2eee5] flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#487ec3] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-neutral-700">Loading Invoice...</p>
          </div>
        </div>
      }
    >
      <InvoiceContent />
    </Suspense>
  );
}

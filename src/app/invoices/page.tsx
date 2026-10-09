'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  Download,
  RotateCw,
  Ban,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { Purchase, ShopSettings } from '@/lib/types';
import { generateInvoicePdf } from '@/lib/pdf';
import CashMemoPreview from '@/components/CashMemoPreview';

export default function InvoicesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);

  // Preview Modal
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);

  // Cancellation Modal
  const [cancellingPurchase, setCancellingPurchase] = useState<Purchase | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Resending state
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
    fetchSettings();
  }, [search, filterStatus]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) setShopSettings(data.settings);
    } catch {}
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      let url = `/api/purchases?q=${encodeURIComponent(search)}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPurchases(data.purchases || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = (purchase: Purchase) => {
    if (!shopSettings) return;
    const doc = generateInvoicePdf(purchase, shopSettings);
    doc.save(`${purchase.invoice_number}.pdf`);
  };

  const handleResendWhatsApp = async (purchase: Purchase) => {
    setResendingId(purchase.id);
    try {
      const res = await fetch('/api/whatsapp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: purchase.id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchInvoices();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResendingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingPurchase) return;
    setIsCancelling(true);
    setCancelError('');
    try {
      const res = await fetch(`/api/purchases/${cancellingPurchase.id}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel purchase');
      }
      setCancellingPurchase(null);
      fetchInvoices();
    } catch (err: any) {
      setCancelError(err.message || 'Error during cancellation');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-neutral-900" />
            <span>Invoice Management & Purchase Audit History</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            View, print, download PDF, resend WhatsApp messages, or cancel transactions with automatic loyalty reversal.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number, customer name, or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-neutral-300 focus:border-black text-xs outline-hidden shadow-xs"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 outline-hidden"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed Only</option>
          <option value="CANCELLED">Cancelled Only</option>
        </select>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Final Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">WhatsApp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-500">
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => {
                  const isCancelled = p.status === 'CANCELLED';
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-neutral-50 transition-colors ${
                        isCancelled ? 'bg-neutral-50/70 opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">{p.invoice_number}</td>
                      <td className="py-3 px-4 text-neutral-500">
                        {new Date(p.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-neutral-900 block">{p.customer_name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">{p.customer_phone}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold">{p.weight_grams}g</span>
                        <span className="text-[10px] text-neutral-400 block">({p.weight_kg}kg)</span>
                      </td>
                      <td className="py-3 px-4 font-bold font-mono text-neutral-900">
                        ₹{p.final_amount.toFixed(2)}
                        {p.discount_amount > 0 && (
                          <span className="text-[10px] text-emerald-600 block">(-₹{p.discount_amount})</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-700">{p.payment_method}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCancelled
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sent</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewPurchase(p)}
                            title="View Cash Memo"
                            className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(p)}
                            title="Download PDF"
                            className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {!isCancelled && (
                            <>
                              <button
                                onClick={() => handleResendWhatsApp(p)}
                                disabled={resendingId === p.id}
                                title="Resend WhatsApp Message"
                                className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded disabled:opacity-50"
                              >
                                <RotateCw className={`w-4 h-4 ${resendingId === p.id ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                onClick={() => setCancellingPurchase(p)}
                                title="Cancel Purchase & Reverse Loyalty"
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Memo View Modal */}
      {viewPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm">Invoice #{viewPurchase.invoice_number}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-black text-white rounded text-xs font-bold hover:bg-neutral-800 flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => handleDownloadPdf(viewPurchase)}
                  className="px-3 py-1 bg-neutral-100 border text-neutral-800 rounded text-xs font-bold hover:bg-neutral-200 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => setViewPurchase(null)}
                  className="text-neutral-400 hover:text-black font-bold px-2 py-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <CashMemoPreview
              customerName={viewPurchase.customer_name}
              customerPhone={viewPurchase.customer_phone}
              customerAddress={viewPurchase.customer_address}
              weightGrams={viewPurchase.weight_grams}
              ratePerKg={viewPurchase.rate_per_kg}
              subtotal={viewPurchase.subtotal}
              discountAmount={viewPurchase.discount_amount}
              roundOff={viewPurchase.round_off}
              finalAmount={viewPurchase.final_amount}
              paymentMethod={viewPurchase.payment_method}
              invoiceNumber={viewPurchase.invoice_number}
              settings={shopSettings || undefined}
            />
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancellingPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-neutral-900">Cancel Purchase Transaction?</h3>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to cancel invoice{' '}
              <strong className="font-mono">{cancellingPurchase.invoice_number}</strong> for{' '}
              <strong>{cancellingPurchase.customer_name}</strong>?
            </p>

            <div className="bg-neutral-50 p-3 rounded-lg border text-xs text-neutral-700 space-y-1">
              <p>&bull; The invoice record is retained for audit history (marked as CANCELLED).</p>
              <p>&bull; The customer&apos;s spending and weight totals will be reversed.</p>
              <p>
                &bull; Loyalty progress will be accurately rolled back (restoring reward if it was used).
              </p>
            </div>

            {cancelError && <p className="text-xs text-rose-600 font-medium">{cancelError}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingPurchase(null)}
                className="flex-1 py-2 border rounded-lg text-xs font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  User,
  Scale,
  Sparkles,
  Printer,
  Send,
  RotateCcw,
  AlertCircle,
  Gift,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import CashMemoPreview from '@/components/CashMemoPreview';
import WhatsAppSuccessModal from '@/components/WhatsAppSuccessModal';
import { Customer, ShopSettings, PaymentMethod, Purchase, RoundOffMode } from '@/lib/types';
import { calculateBilling } from '@/lib/billing';
import { toPng, toBlob } from 'html-to-image';

export default function BillingPage() {
  // Input States
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [weight, setWeight] = useState<number | string>(1000);
  const [unit, setUnit] = useState<'g' | 'kg'>('g');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [itemDesc, setItemDesc] = useState('Ladies Readymade Garment / Dress Material');
  const [roundOffMode, setRoundOffMode] = useState<RoundOffMode>('FLOOR_10');
  const [manualAmount, setManualAmount] = useState<string>('');

  // Customer & System States
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Success Modal States
  const [completedPurchase, setCompletedPurchase] = useState<Purchase | null>(null);
  const [whatsappResult, setWhatsappResult] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [billImageDataUrl, setBillImageDataUrl] = useState<string | null>(null);

  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>('INV-2026-000101');

  // Fetch shop settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setShopSettings(data.settings);
        if (data.next_invoice_number) {
          setNextInvoiceNumber(data.next_invoice_number);
        }
        if (data.settings.round_off_mode) {
          setRoundOffMode(data.settings.round_off_mode);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Debounced Phone Search
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      searchCustomer(cleanPhone);
    } else {
      setCustomer(null);
    }
  }, [phone]);

  const searchCustomer = async (searchPhone: string) => {
    setIsSearchingCustomer(true);
    try {
      const res = await fetch(`/api/customers/${searchPhone}`);
      const data = await res.json();
      if (data.success && data.customer) {
        setCustomer(data.customer);
        if (!name || name === 'Walk-in Customer') {
          setName(data.customer.name);
        }
        if (data.customer.address && !address) {
          setAddress(data.customer.address);
        }
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  // Perform Real-Time Billing Calculation
  const numericWeight = typeof weight === 'number' ? weight : parseFloat(weight) || 0;

  const billingCalc = useMemo(() => {
    return calculateBilling({
      weight: numericWeight,
      unit,
      ratePerKg: shopSettings?.rate_per_kg ?? 899,
      customer,
      shopSettings: shopSettings ?? undefined,
      roundOffMode,
      manualAmount: roundOffMode === 'MANUAL' ? manualAmount : undefined,
    });
  }, [numericWeight, unit, customer, shopSettings, roundOffMode, manualAmount]);

  // Handle Quick Chips
  const handleQuickGrams = (grams: number) => {
    setUnit('g');
    setWeight(grams);
  };

  // Form Submission (Complete Purchase)
  const handleCompletePurchase = async (shouldPrintDirectly: boolean = false) => {
    setErrorMessage('');
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit customer phone number.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter customer name.');
      return;
    }
    if (numericWeight <= 0) {
      setErrorMessage('Please enter a valid weight greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Submit purchase to backend to get real purchase record & invoice number
      const payload = {
        phone,
        name,
        address,
        weight: numericWeight,
        unit,
        payment_method: paymentMethod,
        description: itemDesc,
        round_off_mode: roundOffMode,
        manual_amount: roundOffMode === 'MANUAL' ? parseFloat(manualAmount) || undefined : undefined,
      };

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete purchase');
      }

      setCompletedPurchase(data.purchase);
      setCustomer(data.customer);
      setWhatsappResult(data.whatsapp);

      // Step 2: Allow React DOM to refresh with exact purchase details and capture the boutique floral invoice snapshot
      await new Promise((r) => setTimeout(r, 60));
      let capturedDataUrl = '';
      let capturedBlob: Blob | null = null;
      const memoNode = document.getElementById('cash-memo-preview-node');
      if (memoNode) {
        try {
          capturedDataUrl = await toPng(memoNode, { quality: 0.95, pixelRatio: 2 });
          capturedBlob = await toBlob(memoNode, { quality: 0.95, pixelRatio: 2 });
          setBillImageDataUrl(capturedDataUrl);

          // Upload image to server for public hosting link
          fetch(`/api/invoices/${data.purchase.id}/image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: capturedDataUrl }),
          }).catch((imgPostErr) => console.warn('Could not post invoice image:', imgPostErr));

          // Auto-download bill photo file directly to computer
          try {
            const dl = document.createElement('a');
            dl.href = capturedDataUrl;
            dl.download = `${data.purchase.invoice_number}.png`;
            document.body.appendChild(dl);
            dl.click();
            document.body.removeChild(dl);
          } catch (dlErr) {
            console.warn('Auto-download warning:', dlErr);
          }
        } catch (imgErr) {
          console.warn('Could not generate bill image snapshot:', imgErr);
        }
      }

      // Step 3: Copy image to clipboard so Ctrl+V in WhatsApp Web pastes photo directly!
      if (capturedBlob && navigator.clipboard && (window as any).ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ 'image/png': capturedBlob }),
          ]);
        } catch (clipErr) {
          console.warn('Clipboard write warning:', clipErr);
        }
      }

      // Step 4: Open WhatsApp Web / Mobile wa.me with destination and text
      if (!shouldPrintDirectly) {
        const cleanDigits = phone.replace(/\D/g, '');
        const destination = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
        const encodedText = encodeURIComponent(data.whatsapp?.formattedText || '');
        const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const waUrl = isMobile
          ? `https://wa.me/${destination}?text=${encodedText}`
          : `https://web.whatsapp.com/send?phone=${destination}&text=${encodedText}`;
        try {
          window.open(waUrl, '_blank');
        } catch (openErr) {
          console.warn('Could not open WhatsApp window:', openErr);
        }
      }

      setShowSuccessModal(true);

      if (shouldPrintDirectly) {
        setTimeout(() => {
          window.print();
        }, 300);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error completing purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend WhatsApp handler
  const handleResendWhatsApp = async () => {
    if (!completedPurchase) return;
    setIsResending(true);
    try {
      const res = await fetch('/api/whatsapp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: completedPurchase.id }),
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappResult(data.result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResending(false);
    }
  };

  // Reset form for next customer
  const handleReset = () => {
    setPhone('');
    setName('');
    setAddress('');
    setWeight(1000);
    setUnit('g');
    setCustomer(null);
    setPaymentMethod('CASH');
    setErrorMessage('');
    setManualAmount('');
    setRoundOffMode('FLOOR_10');
    setBillImageDataUrl(null);
    setCompletedPurchase(null);
    setShowSuccessModal(false);
    fetchSettings();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-100 p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==============================================================
            LEFT PANEL: POS BILLING COUNTER FORM (COLUMNS 1 to 7)
           ============================================================== */}
        <div className="lg:col-span-7 space-y-5 no-print">
          {/* Card: Customer Details */}
          <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-neutral-800" />
                <h2 className="text-base font-bold text-neutral-900">1. Customer Details</h2>
              </div>
              <span className="text-xs bg-neutral-100 text-neutral-600 font-semibold px-2.5 py-0.5 rounded-full border border-neutral-200">
                Primary ID: Phone
              </span>
            </div>

            <div className="space-y-4">
              {/* Phone Input with live search */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  WhatsApp Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 7736723917 (10 digits)"
                    maxLength={15}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black text-base font-medium outline-hidden transition-all bg-neutral-50/50 focus:bg-white"
                  />
                  {isSearchingCustomer && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-neutral-400">
                      Searching...
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Loyalty Banner if found */}
              {customer && (
                <div
                  className={`p-3.5 rounded-lg border text-xs space-y-1.5 transition-all ${
                    customer.loyalty_reward_unlocked
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-amber-600" />
                      <span>
                        {customer.name} &bull; {customer.total_purchases} Completed Purchases
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-white border rounded font-mono text-[11px]">
                      Spent: ₹{customer.total_amount_spent.toFixed(2)}
                    </span>
                  </div>

                  {/* Loyalty Progress Tracker */}
                  <div className="pt-1">
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span>Loyalty Reward Progress:</span>
                      <span className="font-bold">
                        {customer.loyalty_reward_unlocked
                          ? '🔥 REWARD UNLOCKED (50% OFF on 1 KG)'
                          : `${customer.loyalty_count}/5 Purchases`}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          customer.loyalty_reward_unlocked ? 'bg-amber-500' : 'bg-black'
                        }`}
                        style={{
                          width: `${Math.min(100, (customer.loyalty_count / 5) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1">
                      {customer.loyalty_reward_unlocked
                        ? '🎁 Customer is entitled to 50% discount on 1000g (1 KG) today if purchase is at least 1 KG (1000g)!'
                        : `${5 - customer.loyalty_count} more purchase(s) required to unlock 50% OFF on 1 KG reward.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Name & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black text-sm outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    City / Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Kozhikode"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black text-sm outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Weight & Calculation */}
          <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-neutral-800" />
                <h2 className="text-base font-bold text-neutral-900">2. Weight & Pricing</h2>
              </div>
              <span className="text-xs bg-black text-white font-bold px-2.5 py-1 rounded">
                Rate: ₹{shopSettings?.rate_per_kg || 899} / KG
              </span>
            </div>

            <div className="space-y-4">
              {/* Unit Toggle and Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Enter Dress Weight
                  </label>
                  {/* Grams vs KG Switcher */}
                  <div className="inline-flex rounded-md shadow-xs bg-neutral-100 p-0.5 border border-neutral-300">
                    <button
                      type="button"
                      onClick={() => setUnit('g')}
                      className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                        unit === 'g'
                          ? 'bg-black text-white shadow-xs'
                          : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      Grams (g)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnit('kg')}
                      className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                        unit === 'kg'
                          ? 'bg-black text-white shadow-xs'
                          : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      Kilograms (KG)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step={unit === 'kg' ? '0.01' : '1'}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder={unit === 'kg' ? 'e.g. 0.7 or 1.2' : 'e.g. 500, 700, 1000'}
                    className="w-full px-4 py-3.5 text-2xl font-black rounded-lg border-2 border-black focus:ring-2 focus:ring-black outline-hidden bg-neutral-50/30"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-sm font-bold text-neutral-500 uppercase">
                    {unit === 'kg' ? 'KG' : 'Grams'}
                  </div>
                </div>
              </div>

              {/* Quick Grams Chips */}
              <div>
                <span className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Quick Select Weight:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[250, 500, 700, 1000, 1200, 1500, 2000].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleQuickGrams(g)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                        billingCalc.weightGrams === g && unit === 'g'
                          ? 'bg-black text-white border-black'
                          : 'bg-neutral-50 text-neutral-800 border-neutral-300 hover:bg-neutral-200'
                      }`}
                    >
                      {g}g {g >= 1000 ? `(${(g / 1000).toFixed(1)}kg)` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loyalty Reward Status Feedback */}
              {billingCalc.isRewardUnlocked && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    billingCalc.canApplyReward
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    {billingCalc.canApplyReward ? (
                      <p>
                        🎉 <strong>50% OFF on 1 KG Loyalty Discount Applied!</strong> Customer is taking{' '}
                        {billingCalc.weightGrams}g (≥ 1 KG). 50% discount on 1000g (-₹{billingCalc.discountAmount.toFixed(2)}) is deducted from total.
                      </p>
                    ) : (
                      <p>
                        ⚠️ <strong>Reward Unlocked (50% OFF on 1 KG):</strong> {billingCalc.rewardReason}{' '}
                        (Customer is taking {billingCalc.weightGrams}g). Reward remains saved for their next 1 KG+ purchase.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Simplified Bill Amount Options: Round Down, Exact, Manual */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Bill Amount Option
                  </label>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    Round Down &bull; Exact &bull; Manual Amount
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Option 1: Round Down */}
                  {(() => {
                    const floorVal = Math.floor(billingCalc.baseAmount / 10) * 10;
                    const diff = Math.round((floorVal - billingCalc.baseAmount) * 100) / 100;
                    const isSelected = roundOffMode === 'FLOOR_10';
                    return (
                      <button
                        type="button"
                        onClick={() => setRoundOffMode('FLOOR_10')}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-black text-white border-black shadow-xs ring-2 ring-black'
                            : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>Round Down</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                              isSelected
                                ? 'bg-emerald-500 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Discount
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between">
                          <span className="font-mono text-base font-black">₹{floorVal.toFixed(0)}</span>
                          {diff < 0 && (
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                isSelected ? 'text-emerald-300' : 'text-emerald-600'
                              }`}
                            >
                              -₹{Math.abs(diff).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })()}

                  {/* Option 2: Exact */}
                  {(() => {
                    const isSelected = roundOffMode === 'NONE';
                    return (
                      <button
                        type="button"
                        onClick={() => setRoundOffMode('NONE')}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-black text-white border-black shadow-xs ring-2 ring-black'
                            : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>Exact</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
                            }`}
                          >
                            Exact
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between">
                          <span className="font-mono text-base font-black">
                            ₹{billingCalc.baseAmount.toFixed(0)}
                          </span>
                          <span
                            className={`text-[10px] font-mono ${
                              isSelected ? 'text-neutral-400' : 'text-neutral-500'
                            }`}
                          >
                            No round
                          </span>
                        </div>
                      </button>
                    );
                  })()}

                  {/* Option 3: Manual Amount */}
                  {(() => {
                    const isSelected = roundOffMode === 'MANUAL';
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setRoundOffMode('MANUAL');
                          if (!manualAmount) {
                            setManualAmount(billingCalc.baseAmount.toFixed(0));
                          }
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-black text-white border-black shadow-xs ring-2 ring-black'
                            : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>Manual</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                              isSelected ? 'bg-amber-400 text-black' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Custom
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between">
                          <span className="font-mono text-base font-black">
                            {manualAmount ? `₹${manualAmount}` : 'Custom ₹'}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              isSelected ? 'text-amber-300' : 'text-amber-700'
                            }`}
                          >
                            Edit ✏️
                          </span>
                        </div>
                      </button>
                    );
                  })()}
                </div>

                {/* If MANUAL is active, render interactive input field */}
                {roundOffMode === 'MANUAL' && (
                  <div className="p-3 bg-white rounded-lg border-2 border-black space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                        Enter Custom Final Amount (₹)
                      </label>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        Standard calculated: ₹{billingCalc.baseAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xl font-black text-neutral-800">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="1"
                        autoFocus
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        placeholder={billingCalc.baseAmount.toFixed(0)}
                        className="w-full pl-9 pr-4 py-2.5 text-2xl font-black rounded-lg border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-neutral-50/50 focus:bg-white"
                      />
                    </div>

                    {billingCalc.roundOffAmount !== 0 && (
                      <div className="flex items-center justify-between text-xs font-bold pt-1">
                        <span className="text-neutral-600">Manual Price Adjustment:</span>
                        <span
                          className={`font-mono ${
                            billingCalc.roundOffAmount < 0 ? 'text-emerald-700' : 'text-neutral-800'
                          }`}
                        >
                          {billingCalc.roundOffAmount < 0
                            ? `Extra Discount (Store Loss): -₹${Math.abs(billingCalc.roundOffAmount).toFixed(2)}`
                            : `Extra Charge: +₹${billingCalc.roundOffAmount.toFixed(2)}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Huge Live Amount Display Card */}
              <div className="bg-black text-white p-5 rounded-xl space-y-2">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Weight: {billingCalc.weightGrams}g ({billingCalc.weightKg} KG)</span>
                  <span>Rate: ₹{billingCalc.ratePerKg}/KG</span>
                </div>

                <div className="flex justify-between text-sm text-neutral-300 border-b border-neutral-800 pb-2">
                  <span>Exact Gross Amount:</span>
                  <span className="font-semibold font-mono">₹{billingCalc.subtotal.toFixed(2)}</span>
                </div>

                {billingCalc.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400 border-b border-neutral-800 pb-2">
                    <span className="flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" /> 6th Visit Loyalty Reward (50% OFF on 1 KG):
                    </span>
                    <span className="font-bold font-mono">-₹{billingCalc.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {billingCalc.roundOffAmount !== 0 && (
                  <div className="flex justify-between text-sm text-neutral-300 border-b border-neutral-800 pb-2">
                    <span className="flex items-center gap-1">
                      {roundOffMode === 'MANUAL'
                        ? 'Manual Price Adjustment:'
                        : 'Round Down Discount:'}
                    </span>
                    <span className={`font-mono font-bold ${billingCalc.roundOffAmount < 0 ? 'text-emerald-400' : 'text-neutral-300'}`}>
                      {billingCalc.roundOffAmount > 0
                        ? `+₹${billingCalc.roundOffAmount.toFixed(2)}`
                        : `-₹${Math.abs(billingCalc.roundOffAmount).toFixed(2)}`}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-1">
                  <div>
                    <span className="text-sm font-bold uppercase tracking-wider text-neutral-200 block">
                      Net Amount Payable:
                    </span>
                    {billingCalc.subtotal - billingCalc.finalAmount > 0 && (
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        Total Discount / Savings: ₹{(billingCalc.subtotal - billingCalc.finalAmount).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                    ₹{billingCalc.finalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  3. Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash', icon: Banknote },
                    { id: 'UPI', label: 'UPI / GPay', icon: Smartphone },
                    { id: 'CARD', label: 'Debit/Credit', icon: CreditCard },
                    { id: 'OTHER', label: 'Other', icon: ChevronRight },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = paymentMethod === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentMethod(p.id as PaymentMethod)}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-black text-white border-black shadow-xs'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-300 text-rose-700 text-xs rounded-lg font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Main Submit Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCompletePurchase(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-black hover:bg-neutral-800 text-white rounded-lg text-sm font-extrabold uppercase tracking-wider transition-all disabled:opacity-50 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isSubmitting ? 'Processing...' : 'Complete & Print Bill'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCompletePurchase(false)}
                  className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-sm font-extrabold uppercase tracking-wider transition-all disabled:opacity-50 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Processing...' : 'Complete & WhatsApp'}</span>
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Form</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==============================================================
            RIGHT PANEL: LIVE CASH MEMO BILL PAD PREVIEW (COLUMNS 8 to 12)
           ============================================================== */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 px-1 no-print">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Live Cash Memo Preview
            </span>
            <button
              onClick={() => window.print()}
              className="text-xs text-black font-bold flex items-center gap-1 hover:underline"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Preview</span>
            </button>
          </div>

          {/* Authentic Printable Cash Memo Pad */}
          <CashMemoPreview
            customerName={name.trim() || 'Walk-in Customer'}
            customerPhone={phone.trim() || '-'}
            customerAddress={address.trim() || '-'}
            weightGrams={billingCalc.weightGrams}
            ratePerKg={billingCalc.ratePerKg}
            subtotal={billingCalc.subtotal}
            discountAmount={billingCalc.discountAmount}
            roundOff={billingCalc.roundOffAmount}
            finalAmount={billingCalc.finalAmount}
            paymentMethod={paymentMethod}
            invoiceNumber={completedPurchase ? completedPurchase.invoice_number : nextInvoiceNumber}
            settings={shopSettings || undefined}
          />
        </div>
      </div>

      {/* Success Modal with WhatsApp Delivery and PDF Export */}
      <WhatsAppSuccessModal
        isOpen={showSuccessModal}
        onClose={handleReset}
        purchase={completedPurchase}
        settings={shopSettings || undefined}
        billImageDataUrl={billImageDataUrl}
        whatsappResult={whatsappResult}
        onResend={handleResendWhatsApp}
        isResending={isResending}
      />
    </div>
  );
}

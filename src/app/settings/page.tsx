'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Tag,
  Gift,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { ShopSettings, RoundOffMode } from '@/lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Shop Info
  const [shopName, setShopName] = useState('TERRY');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [gstin, setGstin] = useState('');

  // Pricing & Loyalty
  const [ratePerKg, setRatePerKg] = useState('899');
  const [loyaltyDiscount, setLoyaltyDiscount] = useState('449.50');
  const [minWeightGrams, setMinWeightGrams] = useState('1000');
  const [requiredVisits, setRequiredVisits] = useState('5');
  const [roundOffMode, setRoundOffMode] = useState<RoundOffMode>('NEAREST_10');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setSettings(s);
        setShopName(s.shop_name || 'TERRY');
        setAddress(s.address || '');
        setPhone(s.phone || '+91 7736723917');
        setWhatsappNumber(s.whatsapp_number || '+91 7736723917');
        setGstin(s.gstin || '');

        setRatePerKg(s.rate_per_kg?.toString() || '899');
        setLoyaltyDiscount(s.loyalty_discount?.toString() || '449.50');
        setMinWeightGrams(s.min_weight_grams?.toString() || '1000');
        setRequiredVisits(s.required_visits?.toString() || '5');
        if (s.round_off_mode) {
          setRoundOffMode(s.round_off_mode);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_name: shopName,
          address,
          phone,
          whatsapp_number: whatsappNumber,
          gstin,
          rate_per_kg: parseFloat(ratePerKg),
          loyalty_discount: parseFloat(loyaltyDiscount),
          min_weight_grams: parseInt(minWeightGrams, 10),
          required_visits: parseInt(requiredVisits, 10),
          round_off_mode: roundOffMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-xs text-neutral-500">
        Loading shop settings...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-neutral-900" />
          <span>Shop Configuration & Pricing Parameters</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Customize shop information for printed invoices, rate per kilogram, and the 5-purchase loyalty rule.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop Information Card */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Store className="w-5 h-5 text-neutral-800" />
            <h3 className="text-sm font-bold text-neutral-900">1. Shop Information</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Shop Name</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  GSTIN / Tax ID (Optional)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="32AAAAA0000A1Z5"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase mb-1">Shop Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Near Town Center, Main Commercial Road, Calicut - 673001"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Store Contact Number
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Official WhatsApp Number
                </label>
                <input
                  type="text"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Loyalty Parameters Card */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Tag className="w-5 h-5 text-neutral-800" />
            <h3 className="text-sm font-bold text-neutral-900">
              2. Weight-Based Pricing & Loyalty Rules
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Default Price per Kilogram (INR)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-neutral-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={ratePerKg}
                    onChange={(e) => setRatePerKg(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm font-black"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">Default: ₹899 per 1000g</p>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Loyalty Discount Reward (50% OFF on 1 KG)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-neutral-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={loyaltyDiscount}
                    onChange={(e) => setLoyaltyDiscount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm font-black"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">Default: 50% discount on 1000g (₹449.50) on 6th purchase</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Required Purchases to Unlock Reward
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={requiredVisits}
                  onChange={(e) => setRequiredVisits(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                />
                <p className="text-[11px] text-neutral-400 mt-1">Default: 5 completed purchases</p>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">
                  Minimum Eligible Weight to Redeem Reward (Grams)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={minWeightGrams}
                  onChange={(e) => setMinWeightGrams(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                />
                <p className="text-[11px] text-neutral-400 mt-1">Default: 1000 grams (1 KG)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Default Bill Round Off Policy Card */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Tag className="w-5 h-5 text-neutral-900" />
            <h3 className="text-base font-bold text-neutral-900">
              Default Bill Amount Round Off Policy
            </h3>
          </div>

          <p className="text-xs text-neutral-500">
            Choose how odd bill amounts (e.g. ₹779, ₹815, ₹459) are rounded by default during checkout. Cashiers can also toggle this instantly on each bill.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                id: 'NEAREST_10',
                title: 'Nearest ₹10',
                desc: 'Standard retail (₹779 → ₹780, ₹815 → ₹820, ₹459 → ₹460)',
              },
              {
                id: 'FLOOR_10',
                title: 'Round Down (Floor ₹10)',
                desc: 'Shop discount (₹779 → ₹770, ₹815 → ₹810, ₹459 → ₹450)',
              },
              {
                id: 'NEAREST_5',
                title: 'Nearest ₹5',
                desc: 'To 5s (₹779 → ₹780, ₹815 → ₹815, ₹459 → ₹460)',
              },
              {
                id: 'NONE',
                title: 'Exact Amount',
                desc: 'No round off (₹779.00 exact)',
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRoundOffMode(opt.id as RoundOffMode)}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  roundOffMode === opt.id
                    ? 'border-black bg-black text-white shadow-xs'
                    : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <div className="font-black text-xs uppercase mb-1">{opt.title}</div>
                <div
                  className={`text-[11px] leading-snug ${
                    roundOffMode === opt.id ? 'text-neutral-300' : 'text-neutral-500'
                  }`}
                >
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Settings updated successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

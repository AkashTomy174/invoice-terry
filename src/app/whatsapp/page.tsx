'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Purchase, ShopSettings, WhatsAppMessage } from '@/lib/types';

export default function WhatsAppCenterPage() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [mode, setMode] = useState<'DEMO' | 'PRODUCTION'>('DEMO');

  // Message template states
  const [purchaseTemplate, setPurchaseTemplate] = useState('');
  const [progressTemplate, setProgressTemplate] = useState('');
  const [rewardTemplate, setRewardTemplate] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s: ShopSettings = data.settings;
        setMode(s.whatsapp_mode || 'DEMO');

        setPurchaseTemplate(s.message_templates?.purchase_confirmation || '');
        setProgressTemplate(s.message_templates?.loyalty_progress || '');
        setRewardTemplate(s.message_templates?.reward_unlocked || '');
      }

      // Fetch message logs
      const invRes = await fetch('/api/purchases?limit=20');
      const invData = await invRes.json();
      if (invData.success) {
        // Build mock/real messages list from purchases
        const msgList: WhatsAppMessage[] = invData.purchases.map((p: Purchase) => ({
          id: p.id,
          purchase_id: p.id,
          customer_id: p.customer_id,
          phone: p.customer_phone,
          message_type: 'INVOICE' as const,
          content: `Invoice ${p.invoice_number} - Amount: ₹${p.final_amount}`,
          status: 'DELIVERED' as const,
          is_demo: mode === 'DEMO',
          created_at: p.created_at,
          updated_at: p.created_at,
        }));
        setMessages(msgList);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // One-shot fetch-on-mount: fetchData sets several pieces of state
    // itself (mode, templates, messages) as its results arrive rather than
    // the effect doing it, which is the documented escape hatch from the
    // new set-state-in-effect rule for this very common pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload: Partial<ShopSettings> = {
        whatsapp_mode: mode,
        message_templates: {
          purchase_confirmation: purchaseTemplate,
          loyalty_progress: progressTemplate,
          reward_unlocked: rewardTemplate,
          reward_redeemed: '',
        },
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-neutral-900" />
          <span>WhatsApp Integration Center</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          This app never calls Meta&apos;s paid WhatsApp Business API, so sending invoices is always free.
          Use Demo Mode to simulate sends, or Manual Send to open WhatsApp with the invoice pre-filled for a
          cashier to tap Send themselves.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Settings & Configuration Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Mode Switch Card */}
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-sm font-bold text-neutral-900">WhatsApp Operation Mode</span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    mode === 'DEMO'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  Current: {mode} MODE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setMode('DEMO')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    mode === 'DEMO'
                      ? 'border-black bg-neutral-50 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-neutral-900 mb-1">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Demo Mode</span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Zero setup required. Invoices are simulated with realistic WhatsApp previews and logs
                    - nothing is sent anywhere.
                  </p>
                </div>

                <div
                  onClick={() => setMode('PRODUCTION')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    mode === 'PRODUCTION'
                      ? 'border-black bg-neutral-50 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-neutral-900 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Manual Send</span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Opens WhatsApp (Web or mobile) with the invoice text pre-filled so a cashier can hit
                    Send. No Meta Business API, no per-message cost - ever.
                  </p>
                </div>
              </div>
            </div>

            {/* Message Templates Card */}
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 border-b pb-3">
                Configurable Message Templates
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">
                    Purchase Confirmation Template
                  </label>
                  <textarea
                    rows={4}
                    value={purchaseTemplate}
                    onChange={(e) => setPurchaseTemplate(e.target.value)}
                    className="w-full p-2.5 border rounded-lg font-sans text-xs"
                  />
                  <span className="text-[10px] text-neutral-400">
                    Variables: {'{{customer_name}}, {{weight}}, {{amount}}, {{loyalty_count}}'}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">
                    Loyalty Progress Template
                  </label>
                  <textarea
                    rows={3}
                    value={progressTemplate}
                    onChange={(e) => setProgressTemplate(e.target.value)}
                    className="w-full p-2.5 border rounded-lg font-sans text-xs"
                  />
                  <span className="text-[10px] text-neutral-400">
                    Variables: {'{{customer_name}}, {{count}}, {{remaining}}'}
                  </span>
                </div>
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
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Settings saved successfully!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Live Message Preview & Delivery Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Simulated WhatsApp Preview Device */}
          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Customer WhatsApp View (Preview)
            </h3>

            <div className="border border-neutral-300 rounded-xl overflow-hidden shadow-xs">
              {/* WhatsApp Mock Chat Header */}
              <div className="bg-[#075e54] text-white p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  T
                </div>
                <div>
                  <span className="text-xs font-bold block leading-tight">TERRY GARMENTS</span>
                  <span className="text-[10px] text-emerald-200">Official Business Account</span>
                </div>
              </div>

              {/* Chat Bubble Body */}
              <div className="bg-[#efeae2] p-4 min-h-[300px] flex flex-col justify-end">
                <div className="bg-white rounded-lg p-3 text-xs text-neutral-900 shadow-xs max-w-[95%] space-y-1.5 leading-relaxed whitespace-pre-line border border-neutral-200">
                  <p className="font-bold">🧾 *PURCHASE INVOICE - TERRY*</p>
                  <p>*Customer:* Ananya</p>
                  <p>*Invoice No:* INV-2026-000105</p>
                  <p>*Weight:* 1.00 KG (1000g)</p>
                  <p>*Rate:* ₹899/KG</p>
                  <p>*Subtotal:* ₹899.00</p>
                  <p className="text-emerald-700 font-bold">*Loyalty Discount:* ₹449.50 (50% OFF on 1 KG)</p>
                  <p className="font-bold text-sm">*Final Amount:* ₹449.50</p>
                  <p className="text-[11px] text-amber-800 pt-1">
                    🎁 *Loyalty Status:* 50% OFF on 1 KG Reward Applied! Thank you for shopping with us ❤️
                  </p>
                  <p className="text-[11px] text-blue-700 underline font-mono">
                    📸 *Bill Photo:* /api/invoices/INV-2026-000105/image
                  </p>
                  <p className="text-[10px] text-neutral-500 pt-1">
                    Terry Garments &bull; Tel/WhatsApp: +91 7736723917
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Logs */}
          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Recent WhatsApp Delivery Logs
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/70 flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-mono font-bold block">{m.phone}</span>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(m.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {mode === 'DEMO' ? 'SIMULATED' : 'LINK READY (MANUAL SEND)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

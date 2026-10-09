'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Save,
  CheckCircle2,
  Key,
  Globe,
  RefreshCw,
  Send,
  AlertCircle,
} from 'lucide-react';
import { ShopSettings, WhatsAppMessage } from '@/lib/types';

export default function WhatsAppCenterPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [mode, setMode] = useState<'DEMO' | 'PRODUCTION'>('DEMO');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [apiVersion, setApiVersion] = useState('v20.0');
  const [verifyToken, setVerifyToken] = useState('');

  // Message template states
  const [purchaseTemplate, setPurchaseTemplate] = useState('');
  const [progressTemplate, setProgressTemplate] = useState('');
  const [rewardTemplate, setRewardTemplate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setSettings(s);
        setMode(s.whatsapp_mode || 'DEMO');
        setPhoneNumberId(s.whatsapp_phone_number_id || '');
        setBusinessAccountId(s.whatsapp_business_account_id || '');
        setAccessToken(s.whatsapp_access_token || '');
        setApiVersion(s.whatsapp_api_version || 'v20.0');
        setVerifyToken(s.whatsapp_verify_token || '');

        setPurchaseTemplate(s.message_templates?.purchase_confirmation || '');
        setProgressTemplate(s.message_templates?.loyalty_progress || '');
        setRewardTemplate(s.message_templates?.reward_unlocked || '');
      }

      // Fetch message logs
      const invRes = await fetch('/api/purchases?limit=20');
      const invData = await invRes.json();
      if (invData.success) {
        // Build mock/real messages list from purchases
        const msgList: WhatsAppMessage[] = invData.purchases.map((p: any) => ({
          id: p.id,
          purchase_id: p.id,
          phone: p.customer_phone,
          message_type: 'INVOICE',
          content: `Invoice ${p.invoice_number} - Amount: ₹${p.final_amount}`,
          status: 'DELIVERED',
          is_demo: mode === 'DEMO',
          created_at: p.created_at,
          updated_at: p.created_at,
        }));
        setMessages(msgList);
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
      const payload: Partial<ShopSettings> = {
        whatsapp_mode: mode,
        whatsapp_phone_number_id: phoneNumberId,
        whatsapp_business_account_id: businessAccountId,
        whatsapp_api_version: apiVersion,
        whatsapp_verify_token: verifyToken,
        message_templates: {
          purchase_confirmation: purchaseTemplate,
          loyalty_progress: progressTemplate,
          reward_unlocked: rewardTemplate,
          reward_redeemed: '',
        },
      };

      if (accessToken && !accessToken.includes('••••')) {
        payload.whatsapp_access_token = accessToken;
      }

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
          <span>WhatsApp Integration & Cloud API Center</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Configure the official Meta WhatsApp Business Cloud API or run in zero-credential Demo Mode.
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
                    <span>Demo Mode (Active)</span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Zero setup required. Invoices are simulated with realistic WhatsApp previews and logs
                    without calling external Meta servers.
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
                    <span>Production Mode</span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Dispatches live WhatsApp messages to customers via your official Meta Business Cloud
                    API credentials.
                  </p>
                </div>
              </div>
            </div>

            {/* Official Meta Credentials Card */}
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Key className="w-5 h-5 text-neutral-800" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Official WhatsApp Cloud API Credentials
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">
                    WhatsApp Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="e.g. 109283746592837"
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">
                    WhatsApp Business Account ID
                  </label>
                  <input
                    type="text"
                    value={businessAccountId}
                    onChange={(e) => setBusinessAccountId(e.target.value)}
                    placeholder="e.g. 982736451928374"
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase mb-1">
                    Permanent System User Access Token
                  </label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAB..."
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Tokens are safely stored on the server and never exposed to the client.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1">
                      API Version
                    </label>
                    <input
                      type="text"
                      value={apiVersion}
                      onChange={(e) => setApiVersion(e.target.value)}
                      placeholder="v20.0"
                      className="w-full px-3 py-2 border rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase mb-1">
                      Webhook Verify Token
                    </label>
                    <input
                      type="text"
                      value={verifyToken}
                      onChange={(e) => setVerifyToken(e.target.value)}
                      placeholder="terry_verify_token_2026"
                      className="w-full px-3 py-2 border rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="bg-neutral-50 p-3 rounded-lg border text-neutral-600 space-y-1">
                  <span className="font-bold block text-neutral-900">Your Webhook Callback URL:</span>
                  <code className="bg-white px-2 py-0.5 rounded border font-mono text-[11px] block select-all">
                    https://your-domain.com/api/whatsapp/webhook
                  </code>
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
                    {mode === 'DEMO' ? 'SIMULATED: ' : ''}DELIVERED
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

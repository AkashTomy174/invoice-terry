'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Scale,
  Gift,
  IndianRupee,
  Calendar,
  CreditCard,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-xs text-neutral-500">
        Loading analytics dashboard...
      </div>
    );
  }

  const cards = [
    {
      title: "Today's Net Sales",
      value: `₹${(stats?.todaySales || 0).toFixed(2)}`,
      icon: IndianRupee,
      subtitle: `${stats?.todayOrders || 0} orders today (in cash/UPI)`,
      color: 'bg-black text-white',
    },
    {
      title: "Today's Exact Gross Value",
      value: `₹${(stats?.todayGrossSales || 0).toFixed(2)}`,
      icon: TrendingUp,
      subtitle: 'Original dress value before discounts',
      color: 'bg-white text-neutral-900 border border-neutral-200',
    },
    {
      title: "Today's Discount (Store Loss)",
      value: `₹${(stats?.todayDiscounts || 0).toFixed(2)}`,
      icon: TrendingUp,
      subtitle: 'Store margin discount given today',
      color: 'bg-rose-50 text-rose-950 border border-rose-200',
    },
    {
      title: 'Total Exact Gross Value',
      value: `₹${(stats?.totalGrossSales || 0).toFixed(2)}`,
      icon: Receipt,
      subtitle: 'All-time total value of stock sold',
      color: 'bg-white text-neutral-900 border border-neutral-200',
    },
    {
      title: 'Total Discounts Given (Store Loss)',
      value: `₹${(stats?.totalDiscounts || 0).toFixed(2)}`,
      icon: TrendingUp,
      subtitle: 'Customer savings / store margin loss',
      color: 'bg-amber-50 text-amber-950 border border-amber-200',
    },
    {
      title: 'Total Net Realized Revenue',
      value: `₹${(stats?.totalNetSales || 0).toFixed(2)}`,
      icon: IndianRupee,
      subtitle: `${stats?.recentPurchases?.length || 0} completed invoices`,
      color: 'bg-emerald-950 text-emerald-100 border border-emerald-800',
    },
    {
      title: 'Total Weight Sold',
      value: `${((stats?.totalWeightSoldGrams || 0) / 1000).toFixed(2)} KG`,
      icon: Scale,
      subtitle: `${stats?.totalWeightSoldGrams || 0} grams recorded`,
      color: 'bg-white text-neutral-900 border border-neutral-200',
    },
    {
      title: 'Total Customers',
      value: stats?.totalCustomers || 0,
      icon: Users,
      subtitle: 'Active database profiles',
      color: 'bg-white text-neutral-900 border border-neutral-200',
    },
    {
      title: 'Loyalty Rewards Redeemed',
      value: stats?.rewardsRedeemedCount || 0,
      icon: Gift,
      subtitle: '50% OFF on 1 KG bonuses claimed',
      color: 'bg-amber-500 text-white',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">
            Store Performance & Analytics Dashboard
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time weight-based clothing sales, discount loss tracking, and loyalty program metrics.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-bold text-neutral-700 hover:bg-neutral-50 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Reports</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-neutral-800 shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Open POS Billing</span>
          </Link>
        </div>
      </div>

      {/* Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`p-5 rounded-xl shadow-xs ${card.color} transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                  {card.title}
                </span>
                <Icon className="w-5 h-5 opacity-80" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
                  {card.value}
                </span>
                <p className="text-[11px] opacity-75 mt-1 font-medium">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Sales Chart (7 Days) - 8 cols */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">7-Day Sales & Loss Breakdown</h3>
              <p className="text-[11px] text-neutral-500">Gross exact value vs Discount concessions (Store Loss) vs Net realized revenue</p>
            </div>
            <Calendar className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-3 pt-2">
            {stats?.salesByDay?.map((day) => {
              const maxAmount = Math.max(...(stats.salesByDay.map((d) => d.gross_amount || d.amount) || [1]), 1000);
              const percentage = Math.min(100, Math.max(8, ((day.amount || 0) / maxAmount) * 100));
              const dateFormatted = new Date(day.date).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });

              return (
                <div key={day.date} className="p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between text-xs gap-1">
                    <span className="font-bold text-neutral-800">{dateFormatted}</span>
                    <span className="text-neutral-500 text-[11px]">
                      {day.orders} orders ({day.weight_kg} KG)
                    </span>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-neutral-500">
                        Gross: <strong className="text-neutral-900 font-bold">₹{(day.gross_amount || day.amount).toFixed(2)}</strong>
                      </span>
                      {day.discount_loss > 0 && (
                        <span className="text-rose-600 font-bold">
                          Loss: -₹{day.discount_loss.toFixed(2)}
                        </span>
                      )}
                      <span className="bg-black text-white px-2 py-0.5 rounded font-bold">
                        Net: ₹{day.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-black h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods Breakdown - 4 cols */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Payment Breakdown</h3>
              <p className="text-[11px] text-neutral-500">Distribution across payment modes</p>
            </div>
            <CreditCard className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-3 pt-2">
            {stats?.salesByPayment?.map((pay) => (
              <div
                key={pay.method}
                className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/70 flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-bold text-neutral-800 block">{pay.method}</span>
                  <span className="text-[11px] text-neutral-500">{pay.count} transactions</span>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-neutral-900">₹{pay.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Purchases Audit List */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">Recent Completed Purchases</h3>
          <Link
            href="/invoices"
            className="text-xs font-bold text-neutral-600 hover:text-black flex items-center gap-1"
          >
            <span>View All Invoices</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Subtotal</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Final Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Loyalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {stats?.recentPurchases?.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-900">{p.invoice_number}</td>
                  <td className="py-3 px-4 text-neutral-500">
                    {new Date(p.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-neutral-900 block">{p.customer_name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{p.customer_phone}</span>
                  </td>
                  <td className="py-3 px-4">{p.weight_grams}g ({p.weight_kg}kg)</td>
                  <td className="py-3 px-4 font-mono">₹{p.subtotal.toFixed(2)}</td>
                  <td className="py-3 px-4 text-emerald-600 font-bold font-mono">
                    {p.discount_amount > 0 ? `-₹${p.discount_amount.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3 px-4 font-bold font-mono text-neutral-900">
                    ₹{p.final_amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-neutral-700">{p.payment_method}</td>
                  <td className="py-3 px-4">
                    {p.loyalty_applied ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        Redeemed
                      </span>
                    ) : (
                      <span className="text-neutral-500 text-[11px]">{p.loyalty_progress_after}/5</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

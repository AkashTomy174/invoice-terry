import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import { DashboardStats, PaymentMethod } from '@/lib/types';

export async function GET() {
  try {
    const db = readDb();
    const purchases = db.purchases.filter((p) => p.status === 'COMPLETED');
    const todayStr = new Date().toISOString().split('T')[0];

    // Today's stats
    const todayPurchases = purchases.filter((p) => p.created_at.startsWith(todayStr));
    const todaySales = Math.round(todayPurchases.reduce((sum, p) => sum + p.final_amount, 0) * 100) / 100;
    const todayGrossSales = Math.round(todayPurchases.reduce((sum, p) => sum + p.subtotal, 0) * 100) / 100;
    const todayDiscounts = Math.round(Math.max(0, todayGrossSales - todaySales) * 100) / 100;
    const todayOrders = todayPurchases.length;

    // Totals
    const totalCustomers = db.customers.length;
    const totalWeightSoldGrams = purchases.reduce((sum, p) => sum + p.weight_grams, 0);
    const totalGrossSales = Math.round(purchases.reduce((sum, p) => sum + p.subtotal, 0) * 100) / 100;
    const totalNetSales = Math.round(purchases.reduce((sum, p) => sum + p.final_amount, 0) * 100) / 100;
    const totalDiscounts = Math.round(Math.max(0, totalGrossSales - totalNetSales) * 100) / 100;
    const rewardsRedeemedCount = purchases.filter((p) => p.loyalty_applied).length;

    // Last 7 days breakdown
    const last7DaysMap = new Map<string, { amount: number; gross_amount: number; discount_loss: number; orders: number; weight_kg: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dStr = d.toISOString().split('T')[0];
      last7DaysMap.set(dStr, { amount: 0, gross_amount: 0, discount_loss: 0, orders: 0, weight_kg: 0 });
    }

    for (const p of purchases) {
      const dStr = p.created_at.split('T')[0];
      if (last7DaysMap.has(dStr)) {
        const item = last7DaysMap.get(dStr)!;
        item.amount = Math.round((item.amount + p.final_amount) * 100) / 100;
        item.gross_amount = Math.round((item.gross_amount + p.subtotal) * 100) / 100;
        item.discount_loss = Math.round((item.discount_loss + Math.max(0, p.subtotal - p.final_amount)) * 100) / 100;
        item.orders += 1;
        item.weight_kg = Math.round((item.weight_kg + p.weight_kg) * 100) / 100;
      }
    }

    const salesByDay = Array.from(last7DaysMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    // Payment methods breakdown
    const paymentMap: Record<PaymentMethod, { amount: number; count: number }> = {
      CASH: { amount: 0, count: 0 },
      UPI: { amount: 0, count: 0 },
      CARD: { amount: 0, count: 0 },
      OTHER: { amount: 0, count: 0 },
    };

    for (const p of purchases) {
      const m = p.payment_method || 'CASH';
      if (paymentMap[m]) {
        paymentMap[m].amount = Math.round((paymentMap[m].amount + p.final_amount) * 100) / 100;
        paymentMap[m].count += 1;
      }
    }

    const salesByPayment = Object.entries(paymentMap).map(([method, data]) => ({
      method: method as PaymentMethod,
      ...data,
    }));

    const stats: DashboardStats = {
      todaySales,
      todayGrossSales,
      todayDiscounts,
      todayOrders,
      totalCustomers,
      totalWeightSoldGrams,
      totalGrossSales,
      totalDiscounts,
      totalNetSales,
      rewardsRedeemedCount,
      recentPurchases: purchases
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10),
      salesByDay,
      salesByPayment,
    };

    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

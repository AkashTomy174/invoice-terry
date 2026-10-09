export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'OTHER';
export type PurchaseStatus = 'COMPLETED' | 'CANCELLED';
export type WhatsAppStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
export type WhatsAppMode = 'DEMO' | 'PRODUCTION';
export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  name: string;
  created_at: string;
}

export interface Customer {
  id: string;
  phone: string; // Unique normalized 10+ digit
  name: string;
  address?: string;
  total_purchases: number;
  total_weight_grams: number;
  total_amount_spent: number;
  loyalty_count: number; // 0 to 5
  loyalty_reward_unlocked: boolean;
  last_purchase_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  description: string;
  weight_grams: number;
  rate_per_kg: number;
  amount: number;
}

export type RoundOffMode = 'NONE' | 'FLOOR_10' | 'MANUAL' | 'NEAREST_10' | 'NEAREST_5' | 'NEAREST_1' | 'CUSTOM';

export interface Purchase {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  weight_grams: number;
  weight_kg: number;
  rate_per_kg: number;
  subtotal: number;
  discount_amount: number;
  round_off?: number;
  final_amount: number;
  payment_method: PaymentMethod;
  status: PurchaseStatus;
  loyalty_applied: boolean;
  loyalty_progress_before: number;
  loyalty_progress_after: number;
  loyalty_message: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseItem[];
  invoice_image_url?: string;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  purchase_id: string;
  type: 'EARNED' | 'REDEEMED' | 'REVERSED';
  count_before: number;
  count_after: number;
  notes: string;
  created_at: string;
}

export interface WhatsAppMessage {
  id: string;
  purchase_id?: string;
  customer_id?: string;
  phone: string;
  message_type: 'INVOICE' | 'LOYALTY_PROGRESS' | 'REWARD_UNLOCKED' | 'CUSTOM';
  content: string;
  status: WhatsAppStatus;
  message_id?: string;
  error_message?: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopSettings {
  id: string;
  shop_name: string;
  logo_url?: string;
  address: string;
  phone: string;
  whatsapp_number: string;
  gstin: string;
  rate_per_kg: number;
  loyalty_discount: number;
  min_weight_grams: number;
  required_visits: number;
  round_off_mode?: RoundOffMode;
  whatsapp_mode: WhatsAppMode;
  whatsapp_access_token?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_business_account_id?: string;
  whatsapp_api_version: string;
  whatsapp_verify_token: string;
  message_templates?: {
    purchase_confirmation: string;
    loyalty_progress: string;
    reward_unlocked: string;
    reward_redeemed: string;
  };
  updated_at: string;
}

export interface DashboardStats {
  todaySales: number; // Net revenue realized today
  todayGrossSales: number; // Exact total bill value before discounts today
  todayDiscounts: number; // Today's total discount concessions (Store Loss)
  todayOrders: number;
  totalCustomers: number;
  totalWeightSoldGrams: number;
  totalGrossSales: number; // All-time exact bill value before discounts
  totalDiscounts: number; // All-time discounts given (Store Loss)
  totalNetSales: number; // All-time net revenue collected
  rewardsRedeemedCount: number;
  recentPurchases: Purchase[];
  salesByDay: {
    date: string;
    amount: number; // Net sales
    gross_amount: number; // Exact amount before discounts
    discount_loss: number; // Store loss / discount given
    orders: number;
    weight_kg: number;
  }[];
  salesByPayment: { method: PaymentMethod; amount: number; count: number }[];
}

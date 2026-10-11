import path from 'path';
import os from 'os';
import bcrypt from 'bcryptjs';
import { Pool, type PoolClient } from 'pg';
import {
  User,
  Customer,
  Purchase,
  PurchaseItem,
  LoyaltyTransaction,
  WhatsAppMessage,
  ShopSettings,
} from './types';

export interface DatabaseSchema {
  users: User[];
  customers: Customer[];
  purchases: Purchase[];
  purchase_items: PurchaseItem[];
  loyalty_transactions: LoyaltyTransaction[];
  whatsapp_messages: WhatsAppMessage[];
  shop_settings: ShopSettings;
  meta: {
    invoice_sequence: number;
    version: string;
  };
}

// Invoice photos are still kept on local disk (see saveInvoiceImage in the
// purchases route). On Vercel this directory lives under the serverless
// function's ephemeral /tmp and will NOT survive between cold starts or
// deployments — only the structured data below (customers, purchases,
// settings, etc.) is made durable via Postgres.
const isServerless =
  Boolean(process.env.NETLIFY) ||
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.LAMBDA_TASK_ROOT) ||
  process.cwd().startsWith('/var/task');

export const DATA_DIR = isServerless
  ? path.join(os.tmpdir(), 'terry-data')
  : path.join(process.cwd(), 'data');
export const INVOICES_DIR = path.join(DATA_DIR, 'invoices');

// ---------------------------------------------------------------------------
// In-memory invoice image fallback (serverless filesystems may be read-only
// or ephemeral). Stashed on globalThis, typed, so it survives hot-reloads in
// dev without every caller reaching for `as any`.
// ---------------------------------------------------------------------------

declare global {
  var __INVOICE_IMAGE_CACHE__: Map<string, Buffer> | undefined;
}

export function getInvoiceImageCache(): Map<string, Buffer> {
  if (!globalThis.__INVOICE_IMAGE_CACHE__) {
    globalThis.__INVOICE_IMAGE_CACHE__ = new Map<string, Buffer>();
  }
  return globalThis.__INVOICE_IMAGE_CACHE__;
}

// ---------------------------------------------------------------------------
// Postgres connection
// ---------------------------------------------------------------------------

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL (or DATABASE_PUBLIC_URL) is not set. Configure it to your Postgres connection string.'
    );
  }

  pool = new Pool({
    connectionString,
    // Railway's bare postgres:16 image does not terminate TLS on the public
    // TCP proxy or the private network, so plain TCP is expected here.
    ssl: /sslmode=require/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });
  return pool;
}

const SCHEMA_TABLE = 'app_state';
const SINGLETON_ID = 'terry';

let schemaReadyPromise: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (schemaReadyPromise) return schemaReadyPromise;
  schemaReadyPromise = (async () => {
    const p = getPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA_TABLE} (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  })();
  return schemaReadyPromise;
}

// Generate unique ID helper
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

// Normalize Indian phone numbers
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  return digits;
}

// Initial Seed Data as strictly mandated in prompt requirements 25 & 26
function createInitialSeed(): DatabaseSchema {
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const staffPasswordHash = bcrypt.hashSync('staff123', 10);
  const now = new Date().toISOString();

  const users: User[] = [
    {
      id: 'usr_admin',
      username: 'admin',
      password_hash: adminPasswordHash,
      role: 'ADMIN',
      name: 'Terry Store Manager',
      created_at: now,
    },
    {
      id: 'usr_staff',
      username: 'staff',
      password_hash: staffPasswordHash,
      role: 'STAFF',
      name: 'Terry Counter Staff',
      created_at: now,
    },
  ];

  const shop_settings: ShopSettings = {
    id: 'settings_default',
    shop_name: 'TERRY',
    logo_url: '/logo.png',
    address: 'Near Town Center, Main Commercial Road, Calicut - 673001',
    phone: '+91 7736723917',
    whatsapp_number: '+91 7736723917',
    rate_per_kg: 899,
    loyalty_discount: 449.50,
    min_weight_grams: 1000,
    required_visits: 5,
    whatsapp_mode: 'DEMO', // Demo mode enabled out of the box
    round_off_mode: 'FLOOR_10',
    message_templates: {
      purchase_confirmation: 'Hi {{customer_name}} 👋\nThank you for shopping with us!\nYour purchase of {{weight}} has been recorded.\nInvoice Amount: ₹{{amount}}\nLoyalty progress: {{loyalty_count}}/5.\nThank you ❤️',
      loyalty_progress: 'Hi {{customer_name}} 👋\nYou have completed {{count}} purchases.\nOnly {{remaining}} more purchase(s) to unlock your 50% OFF on 1 KG loyalty reward 🎁\nKeep shopping with us!',
      reward_unlocked: '🎉 Congratulations {{customer_name}}!\nYour 50% OFF on 1 KG loyalty reward is now unlocked.\nUse it on your next purchase of 1 KG or more to get 1 KG dress at half price!\nThank you for being our loyal customer ❤️',
      reward_redeemed: '🎁 Your 50% OFF on 1 KG loyalty reward (₹449.50 discount) has been successfully applied to this purchase.\nThank you for shopping with us!',
    },
    updated_at: now,
  };

  // Customers A, B, C, D as specified in Requirement 26
  const custA: Customer = {
    id: 'cust_A',
    phone: '9847011111',
    name: 'Customer A (Ananya)',
    address: 'Kozhikode, Kerala',
    total_purchases: 5,
    total_weight_grams: 4800,
    total_amount_spent: 4315.20,
    loyalty_count: 5,
    loyalty_reward_unlocked: true, // Reward Unlocked!
    last_purchase_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: now,
  };

  const custB: Customer = {
    id: 'cust_B',
    phone: '9847022222',
    name: 'Customer B (Bhavana)',
    address: 'Kannur, Kerala',
    total_purchases: 3,
    total_weight_grams: 2500,
    total_amount_spent: 2247.50,
    loyalty_count: 3, // 3 purchases, 2 more required
    loyalty_reward_unlocked: false,
    last_purchase_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: now,
  };

  const custC: Customer = {
    id: 'cust_C',
    phone: '9847033333',
    name: 'Customer C (Chitra)',
    address: 'Kochi, Kerala',
    total_purchases: 6,
    total_weight_grams: 5800,
    total_amount_spent: 4916.20,
    loyalty_count: 0, // Used reward, reset to 0
    loyalty_reward_unlocked: false,
    last_purchase_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: now,
  };

  const custD: Customer = {
    id: 'cust_D',
    phone: '9847044444',
    name: 'Customer D (Deepa)',
    address: 'Thrissur, Kerala',
    total_purchases: 6,
    total_weight_grams: 4500,
    total_amount_spent: 4045.50,
    loyalty_count: 5, // Reward unlocked, but previous purchase was 700g so reward was NOT used and still retained!
    loyalty_reward_unlocked: true,
    last_purchase_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: now,
  };

  // Sample Purchase for Customer C with 1000g and 50% OFF on 1 KG discount applied
  const purchaseC: Purchase = {
    id: 'pur_1001',
    invoice_number: 'INV-2026-000101',
    customer_id: 'cust_C',
    customer_name: 'Customer C (Chitra)',
    customer_phone: '9847033333',
    customer_address: 'Kochi, Kerala',
    weight_grams: 1000,
    weight_kg: 1.0,
    rate_per_kg: 899,
    subtotal: 899,
    discount_amount: 449.50,
    final_amount: 449.50,
    payment_method: 'UPI',
    status: 'COMPLETED',
    loyalty_applied: true,
    loyalty_progress_before: 5,
    loyalty_progress_after: 0,
    loyalty_message: '🎁 50% OFF on 1 KG Loyalty Reward applied (-₹449.50)! Thank you for shopping with us!',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  };

  // Sample Purchase for Customer D with 700g where discount was NOT applied because min 1000g required
  const purchaseD: Purchase = {
    id: 'pur_1002',
    invoice_number: 'INV-2026-000102',
    customer_id: 'cust_D',
    customer_name: 'Customer D (Deepa)',
    customer_phone: '9847044444',
    customer_address: 'Thrissur, Kerala',
    weight_grams: 700,
    weight_kg: 0.7,
    rate_per_kg: 899,
    subtotal: 629.30,
    discount_amount: 0,
    final_amount: 629.30,
    payment_method: 'CASH',
    status: 'COMPLETED',
    loyalty_applied: false,
    loyalty_progress_before: 5,
    loyalty_progress_after: 5, // still has unlocked reward
    loyalty_message: 'Minimum 1 KG (1000g) purchase required to use your 50% OFF on 1 KG reward. Your reward remains active for your next 1 KG+ purchase!',
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  };

  const whatsapp_messages: WhatsAppMessage[] = [
    {
      id: 'msg_1001',
      purchase_id: 'pur_1001',
      customer_id: 'cust_C',
      phone: '9847033333',
      message_type: 'INVOICE',
      content: '🧾 PURCHASE INVOICE - TERRY GARMENTS\nCustomer: Customer C (Chitra)\nInvoice No: INV-2026-000101\nWeight: 1.00 KG\nFinal Amount: ₹449.50\n🎁 Loyalty Status: 50% OFF on 1 KG Reward Applied (-₹449.50)!',
      status: 'DELIVERED',
      is_demo: true,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'msg_1002',
      purchase_id: 'pur_1002',
      customer_id: 'cust_D',
      phone: '9847044444',
      message_type: 'INVOICE',
      content: '🧾 PURCHASE INVOICE - TERRY GARMENTS\nCustomer: Customer D (Deepa)\nInvoice No: INV-2026-000102\nWeight: 0.70 KG\nFinal Amount: ₹629.30\n🎁 Loyalty Status: 50% OFF on 1 KG Reward Unlocked (Applicable on 1 KG+)',
      status: 'SENT',
      is_demo: true,
      created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
  ];

  return {
    users,
    customers: [custA, custB, custC, custD],
    purchases: [purchaseC, purchaseD],
    purchase_items: [],
    loyalty_transactions: [],
    whatsapp_messages,
    shop_settings,
    meta: {
      invoice_sequence: 103,
      version: '1.0.0',
    },
  };
}

// ---------------------------------------------------------------------------
// Public data-access API (same shape as the old file-backed version, now
// backed by a single JSONB row in Postgres so it survives Vercel's
// ephemeral filesystem and serverless cold starts).
// ---------------------------------------------------------------------------

/** Plain read: no row lock, safe for GET handlers that don't mutate. */
export async function readDb(): Promise<DatabaseSchema> {
  await ensureSchema();
  const p = getPool();

  const { rows } = await p.query<{ data: DatabaseSchema }>(
    `SELECT data FROM ${SCHEMA_TABLE} WHERE id = $1`,
    [SINGLETON_ID]
  );

  if (rows.length > 0) {
    return rows[0].data;
  }

  // First boot: seed the row.
  const initial = createInitialSeed();
  await p.query(
    `INSERT INTO ${SCHEMA_TABLE} (id, data) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [SINGLETON_ID, JSON.stringify(initial)]
  );
  // Re-read in case another concurrent cold start seeded it first, so every
  // caller converges on the same row.
  const { rows: afterInsert } = await p.query<{ data: DatabaseSchema }>(
    `SELECT data FROM ${SCHEMA_TABLE} WHERE id = $1`,
    [SINGLETON_ID]
  );
  return afterInsert[0].data;
}

/**
 * Atomic read-modify-write. Takes a row lock (`SELECT ... FOR UPDATE`) for
 * the duration of the transaction so two concurrent purchases can no longer
 * race each other and silently clobber one another's writes, which the old
 * read-whole-file / write-whole-file version was vulnerable to.
 */
export async function withTransaction<T>(
  callback: (db: DatabaseSchema) => Promise<T> | T
): Promise<T> {
  await ensureSchema();
  const p = getPool();
  const client: PoolClient = await p.connect();

  try {
    await client.query('BEGIN');

    let { rows } = await client.query<{ data: DatabaseSchema }>(
      `SELECT data FROM ${SCHEMA_TABLE} WHERE id = $1 FOR UPDATE`,
      [SINGLETON_ID]
    );

    if (rows.length === 0) {
      const initial = createInitialSeed();
      await client.query(
        `INSERT INTO ${SCHEMA_TABLE} (id, data) VALUES ($1, $2)`,
        [SINGLETON_ID, JSON.stringify(initial)]
      );
      rows = [{ data: initial }];
    }

    const db = rows[0].data;
    const result = await callback(db);

    await client.query(
      `UPDATE ${SCHEMA_TABLE} SET data = $1, updated_at = now() WHERE id = $2`,
      [JSON.stringify(db), SINGLETON_ID]
    );

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Lightweight connectivity check used by the keep-alive endpoint. Doesn't
 * touch app_state at all — just proves the connection pool can round-trip a
 * query, which is also what prevents the Railway free-tier database from
 * being flagged inactive and paused.
 */
export async function pingDb(): Promise<{ ok: true; now: string }> {
  const p = getPool();
  const { rows } = await p.query<{ now: Date }>('SELECT now()');
  return { ok: true, now: rows[0].now.toISOString() };
}

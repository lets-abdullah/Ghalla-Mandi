import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

let pool = null;
let isInitialized = false;
let initPromise = null;

export const getPool = () => {
  if (!pool) {
    if (!connectionString) {
      console.warn('[Postgres Warning]: DATABASE_URL is not set in environment.');
    }
    pool = new Pool({
      connectionString: connectionString || undefined,
      ssl: connectionString && !connectionString.includes('localhost')
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[Postgres Pool Error]:', err.message);
    });
  }
  return pool;
};

export const initDatabase = async () => {
  if (isInitialized) return getPool();

  if (!initPromise) {
    initPromise = (async () => {
      const p = getPool();
      try {
        await createTables();
        isInitialized = true;
        console.log('[Postgres Connected & Initialized]: All ERP tables verified.');
        return p;
      } catch (err) {
        initPromise = null;
        console.error('[Postgres Init Error]:', err.message);
        throw err;
      }
    })();
  }

  return initPromise;
};

const createTables = async () => {
  const schema = `
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'Shop Owner',
      permissions TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Shops Table
    CREATE TABLE IF NOT EXISTS shops (
      shop_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerName TEXT NOT NULL,
      city TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Categories Table
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Products Table
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      purchasePrice NUMERIC NOT NULL DEFAULT 0,
      sellingPrice NUMERIC NOT NULL DEFAULT 0,
      stockQty NUMERIC NOT NULL DEFAULT 0,
      minStock NUMERIC NOT NULL DEFAULT 10,
      unit TEXT DEFAULT 'KG',
      image TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Customers Table
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      shopName TEXT,
      phone TEXT,
      whatsapp TEXT,
      city TEXT,
      address TEXT,
      customerType TEXT DEFAULT 'Regular Party',
      openingBalance NUMERIC DEFAULT 0,
      balance NUMERIC DEFAULT 0,
      creditLimit NUMERIC DEFAULT 0,
      paymentTerms TEXT DEFAULT 'Cash / Credit',
      cnic TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE customers ADD COLUMN IF NOT EXISTS shopName TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS creditLimit NUMERIC DEFAULT 0;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS paymentTerms TEXT DEFAULT 'Cash / Credit';
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS cnic TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

    -- Suppliers Table
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      openingBalance NUMERIC DEFAULT 0,
      balance NUMERIC DEFAULT 0,
      suppliedProductsJson TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Sales Invoices Table
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      invoiceNo TEXT NOT NULL,
      partyName TEXT NOT NULL,
      customerId TEXT,
      customerType TEXT,
      date TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      paidAmount NUMERIC DEFAULT 0,
      profit NUMERIC DEFAULT 0,
      status TEXT NOT NULL,
      itemsCount INTEGER DEFAULT 0,
      cartJson TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Purchases Table
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      purchaseNo TEXT NOT NULL,
      supplierName TEXT NOT NULL,
      supplierId TEXT,
      grandTotal NUMERIC NOT NULL,
      paidAmount NUMERIC DEFAULT 0,
      paymentStatus TEXT DEFAULT 'Pending',
      notes TEXT,
      itemsJson TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Payment Logs Table
    CREATE TABLE IF NOT EXISTS payment_logs (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      partyId TEXT,
      partyType TEXT NOT NULL,
      partyName TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      mode TEXT DEFAULT 'Cash',
      date TEXT NOT NULL,
      ref TEXT,
      note TEXT,
      saleId TEXT,
      purchaseId TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Stock Movements Table
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      product TEXT NOT NULL,
      type TEXT NOT NULL,
      qty TEXT NOT NULL,
      ref TEXT,
      date TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Operating Expenses Table
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      category TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      mode TEXT DEFAULT 'Cash',
      date TEXT NOT NULL,
      desc_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Sale Returns Table
    CREATE TABLE IF NOT EXISTS sale_returns (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      returnNo TEXT NOT NULL,
      saleId TEXT,
      invoiceNo TEXT,
      customerId TEXT,
      customerName TEXT,
      refundAmount NUMERIC NOT NULL DEFAULT 0,
      refundMode TEXT DEFAULT 'Cash',
      reason TEXT,
      date TEXT NOT NULL,
      itemsJson TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Purchase Returns Table
    CREATE TABLE IF NOT EXISTS purchase_returns (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      returnNo TEXT NOT NULL,
      purchaseId TEXT,
      purchaseNo TEXT,
      supplierId TEXT,
      supplierName TEXT,
      refundAmount NUMERIC NOT NULL DEFAULT 0,
      refundMode TEXT DEFAULT 'Cash',
      reason TEXT,
      date TEXT NOT NULL,
      itemsJson TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for Tenant Multi-Tenancy Optimization
    CREATE INDEX IF NOT EXISTS idx_users_shop_id ON users(shop_id);
    CREATE INDEX IF NOT EXISTS idx_categories_shop_id ON categories(shop_id);
    CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
    CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_shop_id ON suppliers(shop_id);
    CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON sales(shop_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_shop_id ON purchases(shop_id);
    CREATE INDEX IF NOT EXISTS idx_payment_logs_shop_id ON payment_logs(shop_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_shop_id ON stock_movements(shop_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_shop_id ON expenses(shop_id);
    CREATE INDEX IF NOT EXISTS idx_sale_returns_shop_id ON sale_returns(shop_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_returns_shop_id ON purchase_returns(shop_id);
  `;

  const p = getPool();
  await p.query(schema);
};

// Async Query Helper Functions (Auto-ensures tables exist)
export const query = async (sql, params = []) => {
  await initDatabase();
  const p = getPool();
  const res = await p.query(sql, params);
  return res.rows;
};

export const get = async (sql, params = []) => {
  await initDatabase();
  const p = getPool();
  const res = await p.query(sql, params);
  return res.rows[0] || null;
};

export const run = async (sql, params = []) => {
  await initDatabase();
  const p = getPool();
  const res = await p.query(sql, params);
  return { rowCount: res.rowCount, rows: res.rows };
};

export const createBackup = async () => {
  return {
    status: 'success',
    timestamp: new Date().toISOString(),
    provider: 'Neon Cloud Postgres (Automated Snapshots)'
  };
};

export default {
  initDatabase,
  query,
  get,
  run,
  createBackup,
  getPool
};

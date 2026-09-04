import pg from 'pg';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'node:async_hooks';

dotenv.config();

const { Pool } = pg;
const txStorage = new AsyncLocalStorage();

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
      initialStock NUMERIC NOT NULL DEFAULT 0,
      initialCost NUMERIC NOT NULL DEFAULT 0,
      minStock NUMERIC NOT NULL DEFAULT 10,
      unit TEXT DEFAULT 'KG',
      image TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE products ADD COLUMN IF NOT EXISTS initialStock NUMERIC DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS initialCost NUMERIC DEFAULT 0;

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
      refundDue NUMERIC DEFAULT 0,
      suppliedProductsJson TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS refundDue NUMERIC DEFAULT 0;

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
      discount NUMERIC DEFAULT 0,
      tax NUMERIC DEFAULT 0,
      paidAmount NUMERIC DEFAULT 0,
      returnAmount NUMERIC DEFAULT 0,
      netAmount NUMERIC DEFAULT 0,
      profit NUMERIC DEFAULT 0,
      status TEXT NOT NULL,
      paymentMode TEXT DEFAULT 'Cash',
      itemsCount INTEGER DEFAULT 0,
      cartJson TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE sales ADD COLUMN IF NOT EXISTS paymentMode TEXT DEFAULT 'Cash';
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS returnAmount NUMERIC DEFAULT 0;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS netAmount NUMERIC DEFAULT 0;

    -- Purchases Table
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      purchaseNo TEXT NOT NULL,
      supplierName TEXT NOT NULL,
      supplierId TEXT,
      grandTotal NUMERIC NOT NULL,
      paidAmount NUMERIC DEFAULT 0,
      returnAmount NUMERIC DEFAULT 0,
      netAmount NUMERIC DEFAULT 0,
      paymentStatus TEXT DEFAULT 'Pending',
      paymentMode TEXT DEFAULT 'Supplier Khata',
      notes TEXT,
      itemsJson TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS paymentMode TEXT DEFAULT 'Supplier Khata';
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS returnAmount NUMERIC DEFAULT 0;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS netAmount NUMERIC DEFAULT 0;

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

    DELETE FROM payment_logs WHERE LOWER(mode) = 'supplier khata' OR LOWER(mode) = 'purchase' OR LOWER(mode) = 'bill';

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

  // Sanitize cartJson and itemsJson units to match product master units
  try {
    const prodRows = await p.query('SELECT id, name, unit FROM products');
    if (prodRows && prodRows.rows.length > 0) {
      const prodUnitMap = new Map();
      prodRows.rows.forEach(r => {
        const u = r.unit || 'KG';
        if (r.id) prodUnitMap.set(String(r.id).toLowerCase(), u);
        if (r.name) prodUnitMap.set(String(r.name).trim().toLowerCase(), u);
      });

      // 1. Sanitize sales.cartJson
      const salesRows = await p.query('SELECT id, cartJson FROM sales WHERE cartJson IS NOT NULL');
      for (const s of salesRows.rows) {
        if (!s.cartjson) continue;
        try {
          const cart = JSON.parse(s.cartjson);
          if (Array.isArray(cart)) {
            let changed = false;
            const updatedCart = cart.map(it => {
              const pId = it.productId || it.id;
              const pName = (it.name || it.productName || '').trim().toLowerCase();
              const correctUnit = prodUnitMap.get(String(pId).toLowerCase()) || prodUnitMap.get(pName);
              if (correctUnit && (it.unit !== correctUnit || it.unitName !== correctUnit)) {
                changed = true;
                return { ...it, unit: correctUnit, unitName: correctUnit };
              }
              return it;
            });
            if (changed) {
              await p.query('UPDATE sales SET cartJson = $1 WHERE id = $2', [JSON.stringify(updatedCart), s.id]);
            }
          }
        } catch (e) {}
      }

      // 2. Sanitize purchases.itemsJson
      const purRows = await p.query('SELECT id, itemsJson FROM purchases WHERE itemsJson IS NOT NULL');
      for (const pr of purRows.rows) {
        if (!pr.itemsjson) continue;
        try {
          const items = JSON.parse(pr.itemsjson);
          if (Array.isArray(items)) {
            let changed = false;
            const updatedItems = items.map(it => {
              const pId = it.productId || it.id;
              const pName = (it.name || it.productName || '').trim().toLowerCase();
              const correctUnit = prodUnitMap.get(String(pId).toLowerCase()) || prodUnitMap.get(pName);
              if (correctUnit && (it.unit !== correctUnit || it.unitName !== correctUnit || it.enteredUnit !== correctUnit)) {
                changed = true;
                return { ...it, unit: correctUnit, unitName: correctUnit, enteredUnit: correctUnit };
              }
              return it;
            });
            if (changed) {
              await p.query('UPDATE purchases SET itemsJson = $1 WHERE id = $2', [JSON.stringify(updatedItems), pr.id]);
            }
          }
        } catch (e) {}
      }

      // 3. Sanitize sale_returns.itemsJson
      const srRows = await p.query('SELECT id, itemsJson FROM sale_returns WHERE itemsJson IS NOT NULL');
      for (const sr of srRows.rows) {
        if (!sr.itemsjson) continue;
        try {
          const items = JSON.parse(sr.itemsjson);
          if (Array.isArray(items)) {
            let changed = false;
            const updatedItems = items.map(it => {
              const pId = it.productId || it.id;
              const pName = (it.name || it.productName || '').trim().toLowerCase();
              const correctUnit = prodUnitMap.get(String(pId).toLowerCase()) || prodUnitMap.get(pName);
              if (correctUnit && (it.unit !== correctUnit || it.unitName !== correctUnit)) {
                changed = true;
                return { ...it, unit: correctUnit, unitName: correctUnit };
              }
              return it;
            });
            if (changed) {
              await p.query('UPDATE sale_returns SET itemsJson = $1 WHERE id = $2', [JSON.stringify(updatedItems), sr.id]);
            }
          }
        } catch (e) {}
      }

      // 4. Sanitize purchase_returns.itemsJson
      const prRows = await p.query('SELECT id, itemsJson FROM purchase_returns WHERE itemsJson IS NOT NULL');
      for (const pr of prRows.rows) {
        if (!pr.itemsjson) continue;
        try {
          const items = JSON.parse(pr.itemsjson);
          if (Array.isArray(items)) {
            let changed = false;
            const updatedItems = items.map(it => {
              const pId = it.productId || it.id;
              const pName = (it.name || it.productName || '').trim().toLowerCase();
              const correctUnit = prodUnitMap.get(String(pId).toLowerCase()) || prodUnitMap.get(pName);
              if (correctUnit && (it.unit !== correctUnit || it.unitName !== correctUnit)) {
                changed = true;
                return { ...it, unit: correctUnit, unitName: correctUnit };
              }
              return it;
            });
            if (changed) {
              await p.query('UPDATE purchase_returns SET itemsJson = $1 WHERE id = $2', [JSON.stringify(updatedItems), pr.id]);
            }
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('[DB Sanitization Note]:', err.message);
  }
};

// Async Query Helper Functions (Auto-ensures tables exist)
export const query = async (sql, params = []) => {
  const txClient = txStorage.getStore();
  if (txClient) {
    const res = await txClient.query(sql, params);
    return res.rows;
  }
  await initDatabase();
  const p = getPool();
  const res = await p.query(sql, params);
  return res.rows;
};

export const get = async (sql, params = []) => {
  const txClient = txStorage.getStore();
  if (txClient) {
    const res = await txClient.query(sql, params);
    return res.rows[0] || null;
  }
  await initDatabase();
  const p = getPool();
  const res = await p.query(sql, params);
  return res.rows[0] || null;
};

export const run = async (sql, params = []) => {
  const txClient = txStorage.getStore();
  if (txClient) {
    const res = await txClient.query(sql, params);
    return { rowCount: res.rowCount, rows: res.rows };
  }
  await initDatabase();
  const p = getPool();
  const res = await p.query(sql, params);
  return { rowCount: res.rowCount, rows: res.rows };
};

export const withTransaction = async (callback) => {
  await initDatabase();
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const tx = {
      query: (sql, params = []) => client.query(sql, params).then(r => r.rows),
      get: (sql, params = []) => client.query(sql, params).then(r => r.rows[0] || null),
      run: (sql, params = []) => client.query(sql, params).then(r => ({ rowCount: r.rowCount, rows: r.rows }))
    };
    const result = await txStorage.run(client, async () => {
      return await callback(tx);
    });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
  withTransaction,
  createBackup,
  getPool
};

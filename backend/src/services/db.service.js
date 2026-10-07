import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
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
        await seedDemoAccount(p);
        isInitialized = true;
        console.log('[Postgres Connected & Initialized]: All ERP tables verified & demo account ready.');
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
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS initialPaidAmount NUMERIC DEFAULT 0;

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

export const seedDemoAccount = async (pClient) => {
  try {
    const p = pClient || getPool();
    const demoEmail = 'admin@ghallamandi.com';
    const demoShopId = 'shp-demo-admin-001';
    const demoUserId = 'usr-demo-admin-001';

    // Hash password admin123 using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // 1. Ensure Demo Shop exists
    await p.query(
      `INSERT INTO shops (shop_id, name, ownerName, city, phone, email, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (shop_id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email`,
      [demoShopId, 'Al-Rehman Ghalla Mandi Traders', 'Ghalla Mandi Admin', 'Faisalabad Mandi', '0300-1234567', demoEmail, 'Shop # 42, Main Grain Market, Faisalabad']
    );

    // 2. Ensure Demo User exists with admin123 password
    const userRes = await p.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [demoEmail]);
    if (!userRes.rows || userRes.rows.length === 0) {
      await p.query(
        `INSERT INTO users (id, shop_id, fullName, email, password, phone, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [demoUserId, demoShopId, 'Ghalla Mandi Admin', demoEmail, hashedPassword, '0300-1234567', 'Admin']
      );
      console.log('[DB Seed]: Created demo user admin@ghallamandi.com with password admin123');
    } else {
      await p.query(
        `UPDATE users SET password = $1, shop_id = $2 WHERE LOWER(email) = LOWER($3)`,
        [hashedPassword, demoShopId, demoEmail]
      );
    }

    // 3. Seed sample categories & products if none exist for demo shop
    const prodCount = await p.query('SELECT COUNT(*) FROM products WHERE shop_id = $1', [demoShopId]);
    if (prodCount.rows && parseInt(prodCount.rows[0].count, 10) === 0) {
      await p.query(`INSERT INTO categories (id, shop_id, name, description) VALUES
        ('cat-demo-01', '${demoShopId}', 'Grains & Cereals', 'Wheat, Rice, Corn and Cereals'),
        ('cat-demo-02', '${demoShopId}', 'Pulses & Lentils', 'Chana, Moong, Mash and Lentils'),
        ('cat-demo-03', '${demoShopId}', 'Oilseeds & Cash Crops', 'Cotton, Mustard, Sunflower')
        ON CONFLICT (id) DO NOTHING`);

      /*
       * PRODUCT STOCK CALCULATIONS (corrected):
       * Wheat:  initialStock=300, purchased +50, sold -30  → currentStock = 300 + 50 - 30 = 320
       * Rice:   initialStock=200, sold -10               → currentStock = 200 - 10       = 190
       * Corn:   initialStock=500, no transactions        → currentStock = 500
       * Chana:  initialStock=150, no transactions        → currentStock = 150
       * Cotton: initialStock=100, no transactions        → currentStock = 100
       */
      await p.query(`INSERT INTO products (id, shop_id, code, name, category, purchasePrice, sellingPrice, stockQty, initialStock, initialCost, minStock, unit, image) VALUES
        ('prd-demo-101', '${demoShopId}', 'PRD-101', 'Wheat (Gandum) - Super Grade',  'Grains & Cereals',      4200,  4500,  320, 300, 4200, 20, 'Mann (40 KG)', ''),
        ('prd-demo-102', '${demoShopId}', 'PRD-102', 'Basmati Rice 1121 Kainat',       'Grains & Cereals',      9500, 10200,  190, 200, 9500, 15, 'Mann (40 KG)', ''),
        ('prd-demo-103', '${demoShopId}', 'PRD-103', 'Corn (Makai) - Premium Feed',    'Grains & Cereals',      2400,  2700,  500, 500, 2400, 50, 'Mann (40 KG)', ''),
        ('prd-demo-104', '${demoShopId}', 'PRD-104', 'Desi Chana (Chickpeas)',         'Pulses & Lentils',      6800,  7400,  150, 150, 6800, 15, 'Mann (40 KG)', ''),
        ('prd-demo-105', '${demoShopId}', 'PRD-105', 'Cotton (Phutti) Grade-A',        'Oilseeds & Cash Crops', 8200,  8800,  100, 100, 8200, 10, 'Mann (40 KG)', '')
        ON CONFLICT (id) DO NOTHING`);

      /*
       * CUSTOMER BALANCE CALCULATIONS (corrected):
       *
       * Malik Flour Mills:
       *   openingBalance = 50,000
       *   Sale INV-2026-001: amount=135,000  paidAmount=60,000  → due from this sale = 75,000
       *   Total balance = openingBalance + sale_due = 50,000 + 75,000 = 125,000  ← this is correct as stored balance
       *   NOTE: The app shows openingBalance separately, so balance field should only store
       *         the CURRENT outstanding (sale dues), not the running total.
       *         balance = sale due = 75,000 (app adds openingBalance on top automatically)
       *
       * Chaudhry Rice Traders:
       *   openingBalance = 0
       *   Sale INV-2026-002: amount=102,000  paidAmount=102,000 → fully paid, due = 0
       *   balance = 0
       *
       * Tariq Feed Industries:
       *   openingBalance = 15,000  (only opening, no transactions yet)
       *   balance = 0  (no sale dues; opening balance tracked separately)
       */
      await p.query(`INSERT INTO customers (id, shop_id, name, shopName, phone, city, customerType, openingBalance, balance, creditLimit) VALUES
        ('cst-demo-201', '${demoShopId}', 'Malik Flour Mills',    'Malik Flour Mills Ltd',  '0300-9876543', 'Faisalabad', 'Regular Party', 50000,  75000, 500000),
        ('cst-demo-202', '${demoShopId}', 'Chaudhry Rice Traders','Chaudhry Rice Mills',    '0301-8889900', 'Lahore',     'Regular Party',     0,      0, 400000),
        ('cst-demo-203', '${demoShopId}', 'Tariq Feed Industries','Tariq Feeds Ltd',        '0321-7776655', 'Sahiwal',    'Regular Party', 15000,      0, 300000)
        ON CONFLICT (id) DO NOTHING`);

      /*
       * SUPPLIER BALANCE CALCULATIONS (corrected):
       *
       * Punjab Grain Farms & Co.:
       *   Purchase PUR-2026-001: grandTotal=210,000  paidAmount=145,000 → due=65,000
       *   balance = 65,000 ✅
       *
       * Pak Arhat Commission Shop #12:
       *   openingBalance=20,000  no purchases yet
       *   balance = 20,000 (opening only, no additional dues)
       */
      await p.query(`INSERT INTO suppliers (id, shop_id, name, phone, city, openingBalance, balance) VALUES
        ('sup-demo-301', '${demoShopId}', 'Punjab Grain Farms & Co.',       '0302-1112233', 'Multan',          0, 65000),
        ('sup-demo-302', '${demoShopId}', 'Pak Arhat Commission Shop #12',  '0303-4445566', 'Faisalabad Mandi', 20000, 20000)
        ON CONFLICT (id) DO NOTHING`);

      /*
       * SALES CALCULATIONS (corrected):
       *
       * INV-2026-001  Wheat × 30 Mann @ Rs.4,500  = Rs.135,000
       *   paidAmount       = 60,000  (partial — split payment)
       *   netAmount        = 135,000 (no discount / tax)
       *   initialPaidAmount= 60,000  (needed by ERP financial engine)
       *   profit           = 30 × (4,500 − 4,200) = Rs. 9,000  ✅
       *   status           = Partial
       *
       * INV-2026-002  Basmati Rice × 10 Mann @ Rs.10,200 = Rs.102,000
       *   paidAmount       = 102,000  (fully paid, cash)
       *   netAmount        = 102,000
       *   initialPaidAmount= 102,000
       *   profit           = 10 × (10,200 − 9,500) = Rs. 7,000  ✅
       *   status           = Paid
       */
      await p.query(`INSERT INTO sales (id, shop_id, invoiceNo, partyName, customerId, customerType, date, amount, discount, tax, paidAmount, initialPaidAmount, netAmount, profit, status, paymentMode, cartJson) VALUES
        ('sal-demo-401', '${demoShopId}', 'INV-2026-001', 'Malik Flour Mills',    'cst-demo-201', 'Regular Party', '2026-10-01', 135000, 0, 0,  60000,  60000, 135000,  9000, 'Partial', 'Split Payment', '[{"id":"prd-demo-101","name":"Wheat (Gandum) - Super Grade","qty":30,"rate":4500,"unit":"Mann (40 KG)","total":135000}]'),
        ('sal-demo-402', '${demoShopId}', 'INV-2026-002', 'Chaudhry Rice Traders','cst-demo-202', 'Regular Party', '2026-10-05', 102000, 0, 0, 102000, 102000, 102000,  7000, 'Paid',    'Cash',          '[{"id":"prd-demo-102","name":"Basmati Rice 1121 Kainat","qty":10,"rate":10200,"unit":"Mann (40 KG)","total":102000}]')
        ON CONFLICT (id) DO NOTHING`);

      /*
       * PURCHASE CALCULATIONS (corrected):
       *
       * PUR-2026-001  Wheat × 50 Mann @ Rs.4,200 = Rs.210,000
       *   grandTotal   = 210,000  ✅
       *   paidAmount   = 145,000
       *   netAmount    = 210,000
       *   due          = 210,000 − 145,000 = 65,000  ✅ (matches supplier balance)
       *   paymentStatus= Partial
       */
      await p.query(`INSERT INTO purchases (id, shop_id, purchaseNo, supplierName, supplierId, grandTotal, paidAmount, netAmount, paymentStatus, paymentMode, itemsJson) VALUES
        ('pur-demo-501', '${demoShopId}', 'PUR-2026-001', 'Punjab Grain Farms & Co.', 'sup-demo-301', 210000, 145000, 210000, 'Partial', 'Cash', '[{"id":"prd-demo-101","name":"Wheat (Gandum) - Super Grade","qty":50,"rate":4200,"unit":"Mann (40 KG)","total":210000}]')
        ON CONFLICT (id) DO NOTHING`);

      /*
       * EXPENSES:
       *   Labour Charges   = Rs. 8,500  (Cash)
       *   Electricity Bill = Rs. 14,200 (Bank Transfer)
       *   Total Expenses   = Rs. 22,700
       */
      await p.query(`INSERT INTO expenses (id, shop_id, category, amount, mode, date, desc_text) VALUES
        ('exp-demo-601', '${demoShopId}', 'Labour Charges', 8500, 'Cash',          '2026-10-02', 'Grain sack loading labour charges'),
        ('exp-demo-602', '${demoShopId}', 'Electricity Bill', 14200, 'Bank Transfer', '2026-10-04', 'Mandi shop monthly power bill')
        ON CONFLICT (id) DO NOTHING`);

      /*
       * STOCK MOVEMENTS — log all transactions so inventory history is correct
       *
       * Wheat:  +300 (initial), +50 (purchase), -30 (sale) = 320
       * Rice:   +200 (initial), -10 (sale)                 = 190
       */
      await p.query(`INSERT INTO stock_movements (id, shop_id, product, type, qty, ref, date) VALUES
        ('stk-demo-701', '${demoShopId}', 'Wheat (Gandum) - Super Grade', 'Stock In',  '300', 'INITIAL-STOCK',   '2026-09-01'),
        ('stk-demo-702', '${demoShopId}', 'Wheat (Gandum) - Super Grade', 'Stock In',  '50',  'PUR-2026-001',    '2026-10-01'),
        ('stk-demo-703', '${demoShopId}', 'Wheat (Gandum) - Super Grade', 'Stock Out', '30',  'INV-2026-001',    '2026-10-01'),
        ('stk-demo-704', '${demoShopId}', 'Basmati Rice 1121 Kainat',     'Stock In',  '200', 'INITIAL-STOCK',   '2026-09-01'),
        ('stk-demo-705', '${demoShopId}', 'Basmati Rice 1121 Kainat',     'Stock Out', '10',  'INV-2026-002',    '2026-10-05'),
        ('stk-demo-706', '${demoShopId}', 'Corn (Makai) - Premium Feed',  'Stock In',  '500', 'INITIAL-STOCK',   '2026-09-01'),
        ('stk-demo-707', '${demoShopId}', 'Desi Chana (Chickpeas)',       'Stock In',  '150', 'INITIAL-STOCK',   '2026-09-01'),
        ('stk-demo-708', '${demoShopId}', 'Cotton (Phutti) Grade-A',      'Stock In',  '100', 'INITIAL-STOCK',   '2026-09-01')
        ON CONFLICT (id) DO NOTHING`);

      console.log('[DB Seed]: Populated corrected demo dataset for shp-demo-admin-001');
    }
  } catch (err) {
    console.warn('[DB Seed Warning]:', err.message);
  }
};

export default {
  initDatabase,
  query,
  get,
  run,
  withTransaction,
  createBackup,
  seedDemoAccount,
  getPool
};

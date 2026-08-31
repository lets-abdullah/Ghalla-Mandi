import { query, get, run } from '../services/db.service.js';

const mapCustomerRow = (r) => {
  if (!r) return null;
  const openingBalance = Number(r.openingbalance !== undefined ? r.openingbalance : (r.openingBalance !== undefined ? r.openingBalance : 0));
  const balance = Number(r.balance !== undefined ? r.balance : openingBalance);
  const customerType = r.customertype || r.customerType || 'Regular Party';
  const creditLimit = Number(r.creditlimit !== undefined ? r.creditlimit : (r.creditLimit !== undefined ? r.creditLimit : 0));

  return {
    ...r,
    id: r.id,
    shop_id: r.shop_id,
    name: r.name,
    shopName: r.shopname || r.shopName || '',
    phone: r.phone || '',
    whatsapp: r.whatsapp || '',
    city: r.city || '',
    address: r.address || '',
    customerType,
    customertype: customerType,
    openingBalance,
    openingbalance: openingBalance,
    balance,
    creditLimit,
    creditlimit: creditLimit,
    paymentTerms: r.paymentterms || r.paymentTerms || 'Cash / Credit',
    cnic: r.cnic || '',
    notes: r.notes || ''
  };
};

export const Customer = {
  async find(filter = {}) {
    if (!filter.shop_id) {
      return [];
    }
    const rows = await query('SELECT * FROM customers WHERE shop_id = $1 ORDER BY name ASC', [filter.shop_id]);
    return rows.map(mapCustomerRow);
  },

  async findOne(filter = {}) {
    if (!filter.shop_id && !filter.id) return null;
    let row = null;
    if (filter.id && filter.shop_id) {
      row = await get('SELECT * FROM customers WHERE id = $1 AND shop_id = $2', [filter.id, filter.shop_id]);
    } else if (filter.id) {
      row = await get('SELECT * FROM customers WHERE id = $1', [filter.id]);
    } else if (filter.shop_id && filter.name) {
      row = await get('SELECT * FROM customers WHERE shop_id = $1 AND LOWER(name) = LOWER($2)', [filter.shop_id, filter.name]);
    }
    return mapCustomerRow(row);
  },

  async findById(id, shop_id = null) {
    if (shop_id) {
      return await this.findOne({ id, shop_id });
    }
    const row = await get('SELECT * FROM customers WHERE id = $1', [id]);
    return mapCustomerRow(row);
  },

  async create(custData) {
    if (!custData.shop_id) {
      throw new Error('shop_id is required to create a customer');
    }
    const id = custData.id || `cust-${Date.now()}`;
    const shop_id = custData.shop_id;
    const name = custData.name;
    const shopName = custData.shopName || '';
    const phone = custData.phone || '';
    const whatsapp = custData.whatsapp || '';
    const city = custData.city || custData.address || 'Local Mandi';
    const address = custData.address || '';
    const customerType = custData.customerType || 'Regular Party';
    const openingBalance = Number(custData.openingBalance) || 0;
    const balance = Number(custData.balance || custData.currentBalance) || openingBalance;
    const creditLimit = Number(custData.creditLimit) || 0;
    const paymentTerms = custData.paymentTerms || 'Cash / Credit';
    const cnic = custData.cnic || '';
    const notes = custData.notes || '';

    await run(
      'INSERT INTO customers (id, shop_id, name, shopName, phone, whatsapp, city, address, customerType, openingBalance, balance, creditLimit, paymentTerms, cnic, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
      [id, shop_id, name, shopName, phone, whatsapp, city, address, customerType, openingBalance, balance, creditLimit, paymentTerms, cnic, notes]
    );

    return await this.findById(id, shop_id);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const shop_id = options.shop_id || updateData.shop_id;
    const existing = shop_id ? await this.findOne({ id, shop_id }) : await this.findById(id);
    if (!existing) return null;

    const fields = [];
    const params = [];
    let paramIndex = 1;

    const keys = ['name', 'shopName', 'phone', 'whatsapp', 'city', 'address', 'customerType', 'openingBalance', 'balance', 'creditLimit', 'paymentTerms', 'cnic', 'notes'];
    keys.forEach(k => {
      if (updateData[k] !== undefined) {
        fields.push(`${k} = $${paramIndex++}`);
        params.push(updateData[k]);
      }
    });

    if (fields.length > 0) {
      if (shop_id) {
        params.push(id, shop_id);
        await run(`UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND shop_id = $${paramIndex}`, params);
      } else {
        params.push(id);
        await run(`UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
      }
    }

    return await this.findById(id, shop_id);
  },

  async findByIdAndDelete(id, shop_id = null) {
    const cust = shop_id ? await this.findOne({ id, shop_id }) : await this.findById(id);
    if (cust) {
      if (shop_id) {
        await run('DELETE FROM customers WHERE id = $1 AND shop_id = $2', [id, shop_id]);
      } else {
        await run('DELETE FROM customers WHERE id = $1', [id]);
      }
    }
    return cust;
  }
};


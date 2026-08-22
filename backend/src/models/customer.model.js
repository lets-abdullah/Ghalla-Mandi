import { query, get, run } from '../services/db.service.js';

const mapCustomerRow = (r) => {
  if (!r) return null;
  const openingBalance = Number(r.openingbalance !== undefined ? r.openingbalance : (r.openingBalance !== undefined ? r.openingBalance : 0));
  const balance = Number(r.balance !== undefined ? r.balance : openingBalance);
  const customerType = r.customertype || r.customerType || 'Regular Party';

  return {
    ...r,
    id: r.id,
    shop_id: r.shop_id,
    name: r.name,
    phone: r.phone || '',
    city: r.city || '',
    customerType,
    customertype: customerType,
    openingBalance,
    openingbalance: openingBalance,
    balance
  };
};

export const Customer = {
  async find(filter = {}) {
    const rows = filter.shop_id
      ? await query('SELECT * FROM customers WHERE shop_id = $1 ORDER BY name ASC', [filter.shop_id])
      : await query('SELECT * FROM customers ORDER BY name ASC');
    return rows.map(mapCustomerRow);
  },

  async findOne(filter = {}) {
    let row = null;
    if (filter.id) {
      row = await get('SELECT * FROM customers WHERE id = $1', [filter.id]);
    } else if (filter.shop_id && filter.name) {
      row = await get('SELECT * FROM customers WHERE shop_id = $1 AND LOWER(name) = LOWER($2)', [filter.shop_id, filter.name]);
    }
    return mapCustomerRow(row);
  },

  async findById(id) {
    const row = await get('SELECT * FROM customers WHERE id = $1', [id]);
    return mapCustomerRow(row);
  },

  async create(custData) {
    const id = custData.id || `cust-${Date.now()}`;
    const shop_id = custData.shop_id;
    const name = custData.name;
    const phone = custData.phone || '';
    const city = custData.city || custData.address || 'Local Mandi';
    const customerType = custData.customerType || 'Regular Party';
    const openingBalance = Number(custData.openingBalance) || 0;
    const balance = Number(custData.balance || custData.currentBalance) || openingBalance;

    await run(
      'INSERT INTO customers (id, shop_id, name, phone, city, customerType, openingBalance, balance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, shop_id, name, phone, city, customerType, openingBalance, balance]
    );

    return await this.findById(id);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    const keys = ['name', 'phone', 'city', 'customerType', 'openingBalance', 'balance'];
    keys.forEach(k => {
      if (updateData[k] !== undefined) {
        fields.push(`${k} = $${paramIndex++}`);
        params.push(updateData[k]);
      }
    });

    if (fields.length > 0) {
      params.push(id);
      await run(`UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
    }

    return await this.findById(id);
  },

  async findByIdAndDelete(id) {
    const cust = await this.findById(id);
    if (cust) {
      await run('DELETE FROM customers WHERE id = $1', [id]);
    }
    return cust;
  }
};

import { query, get, run } from '../services/db.service.js';

export const Customer = {
  async find(filter = {}) {
    if (filter.shop_id) {
      return await query('SELECT * FROM customers WHERE shop_id = $1 ORDER BY name ASC', [filter.shop_id]);
    }
    return await query('SELECT * FROM customers ORDER BY name ASC');
  },

  async findOne(filter = {}) {
    if (filter.id) {
      return await get('SELECT * FROM customers WHERE id = $1', [filter.id]);
    }
    if (filter.shop_id && filter.name) {
      return await get('SELECT * FROM customers WHERE shop_id = $1 AND LOWER(name) = LOWER($2)', [filter.shop_id, filter.name]);
    }
    return null;
  },

  async findById(id) {
    return await get('SELECT * FROM customers WHERE id = $1', [id]);
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

import { query, get, run } from '../services/db.service.js';

export const Supplier = {
  async find(filter = {}) {
    const rows = filter.shop_id
      ? await query('SELECT * FROM suppliers WHERE shop_id = $1 ORDER BY name ASC', [filter.shop_id])
      : await query('SELECT * FROM suppliers ORDER BY name ASC');

    return rows.map(r => ({
      ...r,
      suppliedProducts: r.suppliedproductsjson ? JSON.parse(r.suppliedproductsjson) : (r.suppliedProductsJson ? JSON.parse(r.suppliedProductsJson) : [])
    }));
  },

  async findOne(filter = {}) {
    let row = null;
    if (filter.id) {
      row = await get('SELECT * FROM suppliers WHERE id = $1', [filter.id]);
    } else if (filter.shop_id && filter.name) {
      row = await get('SELECT * FROM suppliers WHERE shop_id = $1 AND LOWER(name) = LOWER($2)', [filter.shop_id, filter.name]);
    }

    if (!row) return null;
    return {
      ...row,
      suppliedProducts: row.suppliedproductsjson ? JSON.parse(row.suppliedproductsjson) : (row.suppliedProductsJson ? JSON.parse(row.suppliedProductsJson) : [])
    };
  },

  async findById(id) {
    return await this.findOne({ id });
  },

  async create(supData) {
    const id = supData.id || `sup-${Date.now()}`;
    const shop_id = supData.shop_id;
    const name = supData.name;
    const phone = supData.phone || '';
    const city = supData.city || supData.address || 'Local Mandi';
    const openingBalance = Number(supData.openingBalance) || 0;
    const balance = Number(supData.balance || supData.currentBalance) || openingBalance;
    const suppliedProductsJson = JSON.stringify(supData.suppliedProducts || []);

    await run(
      'INSERT INTO suppliers (id, shop_id, name, phone, city, openingBalance, balance, suppliedProductsJson) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, shop_id, name, phone, city, openingBalance, balance, suppliedProductsJson]
    );

    return await this.findById(id);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    const keys = ['name', 'phone', 'city', 'openingBalance', 'balance'];
    keys.forEach(k => {
      if (updateData[k] !== undefined) {
        fields.push(`${k} = $${paramIndex++}`);
        params.push(updateData[k]);
      }
    });

    if (updateData.suppliedProducts !== undefined) {
      fields.push(`suppliedProductsJson = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.suppliedProducts));
    }

    if (fields.length > 0) {
      params.push(id);
      await run(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
    }

    return await this.findById(id);
  },

  async findByIdAndDelete(id) {
    const sup = await this.findById(id);
    if (sup) {
      await run('DELETE FROM suppliers WHERE id = $1', [id]);
    }
    return sup;
  }
};

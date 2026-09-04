import { query, get, run } from '../services/db.service.js';

const mapSupplierRow = (r) => {
  if (!r) return null;
  const openingBalance = Number(r.openingbalance !== undefined ? r.openingbalance : (r.openingBalance !== undefined ? r.openingBalance : 0));
  const balance = Number(r.balance !== undefined ? r.balance : openingBalance);
  const refundDue = Number(r.refunddue !== undefined ? r.refunddue : (r.refundDue !== undefined ? r.refundDue : 0));
  const suppliedProducts = r.suppliedproductsjson ? (typeof r.suppliedproductsjson === 'string' ? JSON.parse(r.suppliedproductsjson) : r.suppliedproductsjson) : (r.suppliedProductsJson ? (typeof r.suppliedProductsJson === 'string' ? JSON.parse(r.suppliedProductsJson) : r.suppliedProductsJson) : []);

  return {
    ...r,
    id: r.id,
    shop_id: r.shop_id,
    name: r.name,
    phone: r.phone || '',
    city: r.city || '',
    openingBalance,
    openingbalance: openingBalance,
    balance,
    refundDue,
    refunddue: refundDue,
    suppliedProducts,
    suppliedproductsjson: suppliedProducts
  };
};

export const Supplier = {
  async find(filter = {}) {
    if (!filter.shop_id) {
      return [];
    }
    const rows = await query('SELECT * FROM suppliers WHERE shop_id = $1 ORDER BY name ASC', [filter.shop_id]);
    return rows.map(mapSupplierRow);
  },

  async findOne(filter = {}) {
    if (!filter.shop_id && !filter.id) return null;
    let row = null;
    if (filter.id && filter.shop_id) {
      row = await get('SELECT * FROM suppliers WHERE id = $1 AND shop_id = $2', [filter.id, filter.shop_id]);
    } else if (filter.id) {
      row = await get('SELECT * FROM suppliers WHERE id = $1', [filter.id]);
    } else if (filter.shop_id && filter.name) {
      row = await get('SELECT * FROM suppliers WHERE shop_id = $1 AND LOWER(name) = LOWER($2)', [filter.shop_id, filter.name]);
    }

    return mapSupplierRow(row);
  },

  async findById(id, shop_id = null) {
    if (shop_id) {
      return await this.findOne({ id, shop_id });
    }
    const row = await get('SELECT * FROM suppliers WHERE id = $1', [id]);
    return mapSupplierRow(row);
  },

  async create(supData) {
    if (!supData.shop_id) {
      throw new Error('shop_id is required to create a supplier');
    }
    const id = supData.id || `sup-${Date.now()}`;
    const shop_id = supData.shop_id;
    const name = supData.name;
    const phone = supData.phone || '';
    const city = supData.city || supData.address || 'Local Mandi';
    const openingBalance = Number(supData.openingBalance) || 0;
    const balance = Number(supData.balance || supData.currentBalance) || openingBalance;
    const refundDue = Number(supData.refundDue) || 0;
    const suppliedProductsJson = JSON.stringify(supData.suppliedProducts || []);

    await run(
      'INSERT INTO suppliers (id, shop_id, name, phone, city, openingBalance, balance, refundDue, suppliedProductsJson) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, shop_id, name, phone, city, openingBalance, balance, refundDue, suppliedProductsJson]
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

    const keys = ['name', 'phone', 'city', 'openingBalance', 'balance', 'refundDue'];
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
      if (shop_id) {
        params.push(id, shop_id);
        await run(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND shop_id = $${paramIndex}`, params);
      } else {
        params.push(id);
        await run(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
      }
    }

    return await this.findById(id, shop_id);
  },

  async findByIdAndDelete(id, shop_id = null) {
    const sup = shop_id ? await this.findOne({ id, shop_id }) : await this.findById(id);
    if (sup) {
      if (shop_id) {
        await run('DELETE FROM suppliers WHERE id = $1 AND shop_id = $2', [id, shop_id]);
      } else {
        await run('DELETE FROM suppliers WHERE id = $1', [id]);
      }
    }
    return sup;
  }
};

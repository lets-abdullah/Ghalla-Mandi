import { query, get, run } from '../services/db.service.js';

export const Product = {
  async find(filter = {}) {
    if (filter.shop_id) {
      return await query('SELECT * FROM products WHERE shop_id = $1 ORDER BY name ASC', [filter.shop_id]);
    }
    return await query('SELECT * FROM products ORDER BY name ASC');
  },

  async findOne(filter = {}) {
    if (filter.id) {
      return await get('SELECT * FROM products WHERE id = $1', [filter.id]);
    }
    if (filter.shop_id && filter.code) {
      return await get('SELECT * FROM products WHERE shop_id = $1 AND code = $2', [filter.shop_id, filter.code]);
    }
    return null;
  },

  async findById(id) {
    return await get('SELECT * FROM products WHERE id = $1', [id]);
  },

  async create(prodData) {
    const id = prodData.id || `prd-${Date.now()}`;
    const shop_id = prodData.shop_id;
    const code = prodData.code || `PRD-${Math.floor(100 + Math.random() * 900)}`;
    const name = prodData.name;
    const category = prodData.category || 'General';
    const purchasePrice = Number(prodData.purchasePrice) || 0;
    const sellingPrice = Number(prodData.sellingPrice) || 0;
    const stockQty = Number(prodData.stockQty) || 0;
    const minStock = Number(prodData.minStock || prodData.minStockThreshold) || 10;
    const unit = prodData.unit || prodData.baseUnit || 'KG';
    const image = prodData.image || prodData.imageUrl || '';

    await run(
      'INSERT INTO products (id, shop_id, code, name, category, purchasePrice, sellingPrice, stockQty, minStock, unit, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [id, shop_id, code, name, category, purchasePrice, sellingPrice, stockQty, minStock, unit, image]
    );

    return await this.findById(id);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    const keys = ['name', 'category', 'code', 'purchasePrice', 'sellingPrice', 'stockQty', 'minStock', 'unit', 'image'];
    keys.forEach(k => {
      if (updateData[k] !== undefined) {
        fields.push(`${k} = $${paramIndex++}`);
        params.push(updateData[k]);
      }
    });

    if (fields.length > 0) {
      params.push(id);
      await run(`UPDATE products SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
    }

    return await this.findById(id);
  },

  async findByIdAndDelete(id) {
    const prod = await this.findById(id);
    if (prod) {
      await run('DELETE FROM products WHERE id = $1', [id]);
    }
    return prod;
  }
};

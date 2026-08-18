import { query, get, run } from '../services/db.service.js';

export const Category = {
  async find(filter = {}) {
    if (filter.shop_id) {
      return await query('SELECT * FROM categories WHERE shop_id = $1 ORDER BY name ASC', [filter.shop_id]);
    }
    return await query('SELECT * FROM categories ORDER BY name ASC');
  },

  async findOne(filter = {}) {
    if (filter.id) {
      return await get('SELECT * FROM categories WHERE id = $1', [filter.id]);
    }
    if (filter.shop_id && filter.name) {
      return await get('SELECT * FROM categories WHERE shop_id = $1 AND LOWER(name) = LOWER($2)', [filter.shop_id, filter.name]);
    }
    return null;
  },

  async findById(id) {
    return await get('SELECT * FROM categories WHERE id = $1', [id]);
  },

  async create(catData) {
    const id = catData.id || `cat-${Date.now()}`;
    const shop_id = catData.shop_id;
    const name = catData.name;
    const description = catData.description || '';

    await run(
      'INSERT INTO categories (id, shop_id, name, description) VALUES ($1, $2, $3, $4)',
      [id, shop_id, name, description]
    );

    return await this.findById(id);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(updateData.description);
    }

    if (fields.length > 0) {
      params.push(id);
      await run(`UPDATE categories SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
    }

    return await this.findById(id);
  },

  async findByIdAndDelete(id) {
    const cat = await this.findById(id);
    if (cat) {
      await run('DELETE FROM categories WHERE id = $1', [id]);
    }
    return cat;
  }
};

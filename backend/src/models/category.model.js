import { query, get, run } from '../services/db.service.js';

export const Category = {
  async find(filter = {}) {
    if (!filter.shop_id) {
      return [];
    }
    return await query('SELECT * FROM categories WHERE shop_id = $1 ORDER BY name ASC', [filter.shop_id]);
  },

  async findOne(filter = {}) {
    if (!filter.shop_id && !filter.id) return null;
    if (filter.id && filter.shop_id) {
      return await get('SELECT * FROM categories WHERE id = $1 AND shop_id = $2', [filter.id, filter.shop_id]);
    }
    if (filter.id) {
      return await get('SELECT * FROM categories WHERE id = $1', [filter.id]);
    }
    if (filter.shop_id && filter.name) {
      return await get('SELECT * FROM categories WHERE shop_id = $1 AND LOWER(name) = LOWER($2)', [filter.shop_id, filter.name]);
    }
    return null;
  },

  async findById(id, shop_id = null) {
    if (shop_id) {
      return await this.findOne({ id, shop_id });
    }
    return await get('SELECT * FROM categories WHERE id = $1', [id]);
  },

  async create(catData) {
    if (!catData.shop_id) {
      throw new Error('shop_id is required to create a category');
    }
    const id = catData.id || `cat-${Date.now()}`;
    const shop_id = catData.shop_id;
    const name = catData.name;
    const description = catData.description || '';

    await run(
      'INSERT INTO categories (id, shop_id, name, description) VALUES ($1, $2, $3, $4)',
      [id, shop_id, name, description]
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

    if (updateData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(updateData.description);
    }

    if (fields.length > 0) {
      if (shop_id) {
        params.push(id, shop_id);
        await run(`UPDATE categories SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND shop_id = $${paramIndex}`, params);
      } else {
        params.push(id);
        await run(`UPDATE categories SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
      }
    }

    return await this.findById(id, shop_id);
  },

  async findByIdAndDelete(id, shop_id = null) {
    const cat = shop_id ? await this.findOne({ id, shop_id }) : await this.findById(id);
    if (cat) {
      if (shop_id) {
        await run('DELETE FROM categories WHERE id = $1 AND shop_id = $2', [id, shop_id]);
      } else {
        await run('DELETE FROM categories WHERE id = $1', [id]);
      }
    }
    return cat;
  }
};

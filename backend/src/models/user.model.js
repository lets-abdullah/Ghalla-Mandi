import { query, get, run } from '../services/db.service.js';

export const User = {
  async findOne(filter = {}) {
    if (filter.email) {
      return await get('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [filter.email]);
    }
    if (filter.phone) {
      return await get('SELECT * FROM users WHERE phone = $1', [filter.phone]);
    }
    if (filter.id) {
      return await get('SELECT * FROM users WHERE id = $1', [filter.id]);
    }
    if (filter.shop_id) {
      return await get('SELECT * FROM users WHERE shop_id = $1', [filter.shop_id]);
    }
    return null;
  },

  async findById(id) {
    return await get('SELECT * FROM users WHERE id = $1', [id]);
  },

  async find(filter = {}) {
    if (filter.shop_id) {
      return await query('SELECT * FROM users WHERE shop_id = $1 ORDER BY created_at DESC', [filter.shop_id]);
    }
    return await query('SELECT * FROM users ORDER BY created_at DESC');
  },

  async create(userData) {
    const id = userData.id || `usr-${Date.now()}`;
    const shop_id = userData.shop_id;
    const fullName = userData.fullName || '';
    const email = (userData.email || '').toLowerCase();
    const password = userData.password || '';
    const phone = userData.phone || '';
    const role = userData.role || 'Shop Owner';
    const permissions = userData.permissions ? JSON.stringify(userData.permissions) : null;

    await run(
      'INSERT INTO users (id, shop_id, fullName, email, password, phone, role, permissions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, shop_id, fullName, email, password, phone, role, permissions]
    );

    return await this.findById(id);
  },

  async updateOne(filter, updateData) {
    const user = await this.findOne(filter);
    if (!user) return null;

    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (updateData.password !== undefined) {
      fields.push(`password = $${paramIndex++}`);
      params.push(updateData.password);
    }
    if (updateData.fullName !== undefined) {
      fields.push(`fullName = $${paramIndex++}`);
      params.push(updateData.fullName);
    }
    if (updateData.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      params.push(updateData.phone);
    }
    if (updateData.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      params.push(updateData.role);
    }
    if (updateData.permissions !== undefined) {
      fields.push(`permissions = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.permissions));
    }

    if (fields.length === 0) return user;

    params.push(user.id);
    await run(`UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
    return await this.findById(user.id);
  },

  async findByIdAndUpdate(id, updateData) {
    return await this.updateOne({ id }, updateData);
  }
};

import { query, get, run } from '../services/db.service.js';

export const Shop = {
  async findOne(filter = {}) {
    if (filter.shop_id) {
      return await get('SELECT * FROM shops WHERE shop_id = $1', [filter.shop_id]);
    }
    return null;
  },

  async create(shopData) {
    const shop_id = shopData.shop_id;
    const name = shopData.name || '';
    const ownerName = shopData.ownerName || '';
    const city = shopData.city || 'Faisalabad Mandi';
    const phone = shopData.phone || '';
    const email = shopData.email || '';
    const address = shopData.address || '';

    await run(
      'INSERT INTO shops (shop_id, name, ownerName, city, phone, email, address) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [shop_id, name, ownerName, city, phone, email, address]
    );

    return await this.findOne({ shop_id });
  },

  async updateOne(filter, updateData) {
    const shop = await this.findOne(filter);
    if (!shop) return null;

    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(updateData.name);
    }
    if (updateData.ownerName !== undefined) {
      fields.push(`ownerName = $${paramIndex++}`);
      params.push(updateData.ownerName);
    }
    if (updateData.city !== undefined) {
      fields.push(`city = $${paramIndex++}`);
      params.push(updateData.city);
    }
    if (updateData.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      params.push(updateData.phone);
    }
    if (updateData.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      params.push(updateData.email);
    }
    if (updateData.address !== undefined) {
      fields.push(`address = $${paramIndex++}`);
      params.push(updateData.address);
    }

    if (fields.length === 0) return shop;

    params.push(shop.shop_id);
    await run(`UPDATE shops SET ${fields.join(', ')} WHERE shop_id = $${paramIndex}`, params);
    return await this.findOne({ shop_id: shop.shop_id });
  }
};

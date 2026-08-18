import { query, get, run } from '../services/db.service.js';

export const AuditLog = {
  async find(filter = {}) {
    if (filter.shop_id) {
      return await query('SELECT * FROM stock_movements WHERE shop_id = $1 ORDER BY created_at DESC', [filter.shop_id]);
    }
    return await query('SELECT * FROM stock_movements ORDER BY created_at DESC');
  },

  async create(logData) {
    const id = logData.id || `sm-${Date.now()}`;
    const shop_id = logData.shop_id;
    const product = logData.product || logData.entity || 'Item';
    const type = logData.type || logData.action || 'LOG';
    const qty = logData.qty || '1 Unit';
    const ref = logData.ref || logData.userId || 'REF';
    const date = logData.date || new Date().toLocaleDateString('en-GB');

    await run(
      'INSERT INTO stock_movements (id, shop_id, product, type, qty, ref, date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, shop_id, product, type, qty, ref, date]
    );

    return await get('SELECT * FROM stock_movements WHERE id = $1', [id]);
  }
};

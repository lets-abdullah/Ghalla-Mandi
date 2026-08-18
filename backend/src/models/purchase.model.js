import { query, get, run } from '../services/db.service.js';

export const Purchase = {
  async find(filter = {}) {
    const rows = filter.shop_id
      ? await query('SELECT * FROM purchases WHERE shop_id = $1 ORDER BY created_at DESC', [filter.shop_id])
      : await query('SELECT * FROM purchases ORDER BY created_at DESC');

    return rows.map(r => {
      const items = r.itemsjson ? (typeof r.itemsjson === 'string' ? JSON.parse(r.itemsjson) : r.itemsjson) : (r.itemsJson ? JSON.parse(r.itemsJson) : []);
      return {
        ...r,
        items
      };
    });
  },

  async findOne(filter = {}) {
    let row = null;
    if (filter.id) {
      row = await get('SELECT * FROM purchases WHERE id = $1', [filter.id]);
    } else if (filter.shop_id && filter.purchaseNo) {
      row = await get('SELECT * FROM purchases WHERE shop_id = $1 AND purchaseNo = $2', [filter.shop_id, filter.purchaseNo]);
    }

    if (!row) return null;
    const items = row.itemsjson ? (typeof row.itemsjson === 'string' ? JSON.parse(row.itemsjson) : row.itemsjson) : (row.itemsJson ? JSON.parse(row.itemsJson) : []);
    return {
      ...row,
      items
    };
  },

  async findById(id) {
    return await this.findOne({ id });
  },

  async countDocuments(filter = {}) {
    const res = filter.shop_id
      ? await get('SELECT COUNT(*) as count FROM purchases WHERE shop_id = $1', [filter.shop_id])
      : await get('SELECT COUNT(*) as count FROM purchases');
    return res ? parseInt(res.count, 10) : 0;
  },

  async create(purData) {
    const id = purData.id || `pur-${Date.now()}`;
    const shop_id = purData.shop_id;
    const purchaseNo = purData.purchaseNo;
    const supplierName = purData.supplierName || purData.supplier || 'Supplier';
    const supplierId = purData.supplierId || null;
    const grandTotal = Number(purData.grandTotal || purData.amount) || 0;
    const paidAmount = Number(purData.paidAmount) || 0;
    const paymentStatus = purData.paymentStatus || (paidAmount >= grandTotal ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending');
    const notes = purData.notes || '';
    const items = purData.items || [];
    const itemsJson = JSON.stringify(items);

    await run(
      'INSERT INTO purchases (id, shop_id, purchaseNo, supplierName, supplierId, grandTotal, paidAmount, paymentStatus, notes, itemsJson) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [id, shop_id, purchaseNo, supplierName, supplierId, grandTotal, paidAmount, paymentStatus, notes, itemsJson]
    );

    return await this.findById(id);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    const keys = ['supplierName', 'paidAmount', 'grandTotal', 'paymentStatus', 'notes'];
    keys.forEach(k => {
      if (updateData[k] !== undefined) {
        fields.push(`${k} = $${paramIndex++}`);
        params.push(updateData[k]);
      }
    });

    if (fields.length > 0) {
      params.push(id);
      await run(`UPDATE purchases SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
    }

    return await this.findById(id);
  }
};

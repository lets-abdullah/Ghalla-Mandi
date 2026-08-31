import { query, get, run } from '../services/db.service.js';

const mapPurchaseReturnRow = (r) => {
  if (!r) return null;
  const refundAmount = Number(r.refundamount !== undefined ? r.refundamount : (r.refundAmount !== undefined ? r.refundAmount : 0));
  const items = r.itemsjson ? (typeof r.itemsjson === 'string' ? JSON.parse(r.itemsjson) : r.itemsjson) : (r.itemsJson ? (typeof r.itemsJson === 'string' ? JSON.parse(r.itemsJson) : r.itemsJson) : []);
  const returnNo = r.returnno || r.returnNo || '';
  const date = r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));

  return {
    ...r,
    id: r.id,
    shop_id: r.shop_id,
    returnNo,
    returnno: returnNo,
    purchaseId: r.purchaseid || r.purchaseId || null,
    purchaseNo: r.purchaseno || r.purchaseNo || '',
    supplierId: r.supplierid || r.supplierId || null,
    supplierName: r.suppliername || r.supplierName || 'Supplier Firm',
    refundAmount,
    refundamount: refundAmount,
    refundMode: r.refundmode || r.refundMode || 'Cash',
    reason: r.reason || '',
    date,
    items,
    itemsJson: items,
    created_at: r.created_at
  };
};

export const PurchaseReturn = {
  async find(filter = {}) {
    if (!filter.shop_id) {
      return [];
    }
    const rows = await query('SELECT * FROM purchase_returns WHERE shop_id = $1 ORDER BY created_at DESC', [filter.shop_id]);
    return rows.map(mapPurchaseReturnRow);
  },

  async findOne(filter = {}) {
    if (!filter.shop_id && !filter.id) return null;
    let row = null;
    if (filter.id && filter.shop_id) {
      row = await get('SELECT * FROM purchase_returns WHERE id = $1 AND shop_id = $2', [filter.id, filter.shop_id]);
    } else if (filter.id) {
      row = await get('SELECT * FROM purchase_returns WHERE id = $1', [filter.id]);
    }
    return mapPurchaseReturnRow(row);
  },

  async findById(id, shop_id = null) {
    if (shop_id) {
      return await this.findOne({ id, shop_id });
    }
    const row = await get('SELECT * FROM purchase_returns WHERE id = $1', [id]);
    return mapPurchaseReturnRow(row);
  },

  async countDocuments(filter = {}) {
    if (!filter.shop_id) return 0;
    const res = await get('SELECT COUNT(*) as count FROM purchase_returns WHERE shop_id = $1', [filter.shop_id]);
    return res ? parseInt(res.count, 10) : 0;
  },

  async create(returnData) {
    if (!returnData.shop_id) {
      throw new Error('shop_id is required to create a purchase return');
    }
    const id = returnData.id || `pr-${Date.now()}`;
    const shop_id = returnData.shop_id;
    const returnNo = returnData.returnNo || `PR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const purchaseId = returnData.purchaseId || null;
    const purchaseNo = returnData.purchaseNo || 'Direct Purchase Return';
    const supplierId = returnData.supplierId || null;
    const supplierName = returnData.supplierName || 'Supplier Firm';
    const refundAmount = Number(returnData.refundAmount) || 0;
    const refundMode = returnData.refundMode || 'Cash';
    const reason = returnData.reason || '';
    const date = returnData.date || new Date().toLocaleDateString('en-GB');
    const itemsJson = JSON.stringify(returnData.items || []);

    await run(
      'INSERT INTO purchase_returns (id, shop_id, returnNo, purchaseId, purchaseNo, supplierId, supplierName, refundAmount, refundMode, reason, date, itemsJson) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [id, shop_id, returnNo, purchaseId, purchaseNo, supplierId, supplierName, refundAmount, refundMode, reason, date, itemsJson]
    );

    return await this.findById(id, shop_id);
  },

  async findByIdAndUpdate(id, shop_id, updateData) {
    if (!shop_id) throw new Error('shop_id required for update');
    const existing = await this.findOne({ id, shop_id });
    if (!existing) return null;

    const fields = [];
    const params = [];
    let paramIndex = 1;

    const keys = ['refundAmount', 'refundMode', 'reason', 'date'];
    keys.forEach(k => {
      if (updateData[k] !== undefined) {
        fields.push(`${k} = $${paramIndex++}`);
        params.push(updateData[k]);
      }
    });

    if (updateData.items !== undefined) {
      fields.push(`itemsJson = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.items));
    }

    if (fields.length > 0) {
      params.push(id, shop_id);
      await run(`UPDATE purchase_returns SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND shop_id = $${paramIndex}`, params);
    }

    return await this.findById(id, shop_id);
  },

  async findByIdAndDelete(id, shop_id) {
    if (!shop_id) throw new Error('shop_id required for delete');
    const existing = await this.findOne({ id, shop_id });
    if (existing) {
      await run('DELETE FROM purchase_returns WHERE id = $1 AND shop_id = $2', [id, shop_id]);
    }
    return existing;
  }
};

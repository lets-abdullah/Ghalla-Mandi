import { query, get, run } from '../services/db.service.js';

const mapPurchaseRow = (r) => {
  if (!r) return null;
  const items = r.itemsjson ? (typeof r.itemsjson === 'string' ? JSON.parse(r.itemsjson) : r.itemsjson) : (r.itemsJson ? (typeof r.itemsJson === 'string' ? JSON.parse(r.itemsJson) : r.itemsJson) : []);
  const grandTotal = Number(r.grandtotal !== undefined ? r.grandtotal : (r.grandTotal !== undefined ? r.grandTotal : (r.amount !== undefined ? r.amount : 0)));
  const paidAmount = Number(r.paidamount !== undefined ? r.paidamount : (r.paidAmount !== undefined ? r.paidAmount : 0));
  const supplierName = r.suppliername || r.supplierName || r.supplier || 'Supplier';
  const purchaseNo = r.purchaseno || r.purchaseNo || '';
  const paymentStatus = r.paymentstatus || r.paymentStatus || r.status || (paidAmount >= grandTotal ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending');
  const date = r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));

  return {
    ...r,
    id: r.id,
    purchaseNo,
    purchaseno: purchaseNo,
    supplierName,
    supplier: supplierName,
    suppliername: supplierName,
    grandTotal,
    grandtotal: grandTotal,
    amount: grandTotal,
    paidAmount,
    paidamount: paidAmount,
    paymentStatus,
    paymentstatus: paymentStatus,
    status: paymentStatus,
    date,
    items
  };
};

export const Purchase = {
  async find(filter = {}) {
    if (!filter.shop_id) {
      return [];
    }
    const rows = await query('SELECT * FROM purchases WHERE shop_id = $1 ORDER BY created_at DESC', [filter.shop_id]);
    return rows.map(mapPurchaseRow);
  },

  async findOne(filter = {}) {
    if (!filter.shop_id && !filter.id) return null;
    let row = null;
    if (filter.id && filter.shop_id) {
      row = await get('SELECT * FROM purchases WHERE id = $1 AND shop_id = $2', [filter.id, filter.shop_id]);
    } else if (filter.id) {
      row = await get('SELECT * FROM purchases WHERE id = $1', [filter.id]);
    } else if (filter.shop_id && filter.purchaseNo) {
      row = await get('SELECT * FROM purchases WHERE shop_id = $1 AND purchaseNo = $2', [filter.shop_id, filter.purchaseNo]);
    }

    return mapPurchaseRow(row);
  },

  async findById(id, shop_id = null) {
    if (shop_id) {
      return await this.findOne({ id, shop_id });
    }
    return await this.findOne({ id });
  },

  async countDocuments(filter = {}) {
    if (!filter.shop_id) return 0;
    const res = await get('SELECT COUNT(*) as count FROM purchases WHERE shop_id = $1', [filter.shop_id]);
    return res ? parseInt(res.count, 10) : 0;
  },

  async create(purData) {
    if (!purData.shop_id) {
      throw new Error('shop_id is required to create a purchase');
    }
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

    return await this.findById(id, shop_id);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const shop_id = options.shop_id || updateData.shop_id;
    const existing = shop_id ? await this.findOne({ id, shop_id }) : await this.findById(id);
    if (!existing) return null;

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
      if (shop_id) {
        params.push(id, shop_id);
        await run(`UPDATE purchases SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND shop_id = $${paramIndex}`, params);
      } else {
        params.push(id);
        await run(`UPDATE purchases SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
      }
    }

    return await this.findById(id, shop_id);
  }
};

import { query, get, run } from '../services/db.service.js';

export const Sale = {
  async find(filter = {}) {
    const rows = filter.shop_id
      ? await query('SELECT * FROM sales WHERE shop_id = $1 ORDER BY created_at DESC', [filter.shop_id])
      : await query('SELECT * FROM sales ORDER BY created_at DESC');

    return rows.map(r => {
      const cart = r.cartjson ? (typeof r.cartjson === 'string' ? JSON.parse(r.cartjson) : r.cartjson) : (r.cartJson ? JSON.parse(r.cartJson) : []);
      return {
        ...r,
        cart,
        items: cart
      };
    });
  },

  async findOne(filter = {}) {
    let row = null;
    if (filter.id) {
      row = await get('SELECT * FROM sales WHERE id = $1', [filter.id]);
    } else if (filter.shop_id && filter.invoiceNo) {
      row = await get('SELECT * FROM sales WHERE shop_id = $1 AND invoiceNo = $2', [filter.shop_id, filter.invoiceNo]);
    }

    if (!row) return null;
    const cart = row.cartjson ? (typeof row.cartjson === 'string' ? JSON.parse(row.cartjson) : row.cartjson) : (row.cartJson ? JSON.parse(row.cartJson) : []);
    return {
      ...row,
      cart,
      items: cart
    };
  },

  async findById(id) {
    return await this.findOne({ id });
  },

  async countDocuments(filter = {}) {
    const res = filter.shop_id
      ? await get('SELECT COUNT(*) as count FROM sales WHERE shop_id = $1', [filter.shop_id])
      : await get('SELECT COUNT(*) as count FROM sales');
    return res ? parseInt(res.count, 10) : 0;
  },

  async create(saleData) {
    const id = saleData.id || `sal-${Date.now()}`;
    const shop_id = saleData.shop_id;
    const invoiceNo = saleData.invoiceNo;
    const partyName = saleData.partyName || saleData.customerName || 'Walk-in Customer';
    const customerId = saleData.customerId || null;
    const customerType = saleData.customerType || 'Regular Party';
    const date = saleData.date || new Date().toLocaleDateString('en-GB');
    const amount = Number(saleData.amount || saleData.grandTotal) || 0;
    const paidAmount = Number(saleData.paidAmount) || 0;
    const profit = Number(saleData.profit || saleData.profitMargin) || 0;
    const status = saleData.status || saleData.paymentStatus || (paidAmount >= amount ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending');
    const cart = saleData.cart || saleData.items || [];
    const itemsCount = saleData.itemsCount || cart.length;
    const cartJson = JSON.stringify(cart);

    await run(
      'INSERT INTO sales (id, shop_id, invoiceNo, partyName, customerId, customerType, date, amount, paidAmount, profit, status, itemsCount, cartJson) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [id, shop_id, invoiceNo, partyName, customerId, customerType, date, amount, paidAmount, profit, status, itemsCount, cartJson]
    );

    return await this.findById(id);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    const keys = ['partyName', 'paidAmount', 'amount', 'status', 'profit'];
    keys.forEach(k => {
      if (updateData[k] !== undefined) {
        fields.push(`${k} = $${paramIndex++}`);
        params.push(updateData[k]);
      }
    });

    if (fields.length > 0) {
      params.push(id);
      await run(`UPDATE sales SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
    }

    return await this.findById(id);
  }
};

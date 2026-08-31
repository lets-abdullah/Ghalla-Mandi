import { query, get, run } from '../services/db.service.js';

const mapSaleRow = (r) => {
  if (!r) return null;
  const cart = r.cartjson ? (typeof r.cartjson === 'string' ? JSON.parse(r.cartjson) : r.cartjson) : (r.cartJson ? (typeof r.cartJson === 'string' ? JSON.parse(r.cartJson) : r.cartJson) : []);
  const invoiceNo = r.invoiceno || r.invoiceNo || '';
  const partyName = r.partyname || r.partyName || r.customerName || 'Walk-in Customer';
  const customerId = r.customerid || r.customerId || null;
  const customerType = r.customertype || r.customerType || 'Regular Party';
  const amount = Number(r.amount !== undefined ? r.amount : (r.grandtotal !== undefined ? r.grandtotal : (r.grandTotal !== undefined ? r.grandTotal : 0)));
  const paidAmount = Number(r.paidamount !== undefined ? r.paidamount : (r.paidAmount !== undefined ? r.paidAmount : 0));
  const profit = Number(r.profit !== undefined ? r.profit : (r.profitmargin !== undefined ? r.profitmargin : (r.profitMargin !== undefined ? r.profitMargin : 0)));
  const isReturned = (r.status === 'Returned') || (r.returnStatus && r.returnStatus !== 'None');
  const status = isReturned ? 'Returned' : ((paidAmount >= amount && amount > 0) ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending'));
  const itemsCount = Number(r.itemscount !== undefined ? r.itemscount : (r.itemsCount !== undefined ? r.itemsCount : cart.length));
  const date = r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));

  return {
    ...r,
    id: r.id,
    shop_id: r.shop_id,
    invoiceNo,
    invoiceno: invoiceNo,
    partyName,
    partyname: partyName,
    customerName: partyName,
    customerId,
    customerid: customerId,
    customerType,
    customertype: customerType,
    date,
    amount,
    grandTotal: amount,
    paidAmount,
    paidamount: paidAmount,
    profit,
    status,
    paymentStatus: status,
    cart,
    items: cart,
    itemsCount,
    itemscount: itemsCount
  };
};

export const Sale = {
  async find(filter = {}) {
    if (!filter.shop_id) {
      return [];
    }
    const rows = await query('SELECT * FROM sales WHERE shop_id = $1 ORDER BY created_at DESC', [filter.shop_id]);
    return rows.map(mapSaleRow);
  },

  async findOne(filter = {}) {
    if (!filter.shop_id && !filter.id) return null;
    let row = null;
    if (filter.id && filter.shop_id) {
      row = await get('SELECT * FROM sales WHERE id = $1 AND shop_id = $2', [filter.id, filter.shop_id]);
    } else if (filter.id) {
      row = await get('SELECT * FROM sales WHERE id = $1', [filter.id]);
    } else if (filter.shop_id && (filter.invoiceNo || filter.invoiceno)) {
      row = await get('SELECT * FROM sales WHERE shop_id = $1 AND invoiceno = $2', [filter.shop_id, filter.invoiceNo || filter.invoiceno]);
    }

    return mapSaleRow(row);
  },

  async findById(id, shop_id = null) {
    if (shop_id) {
      return await this.findOne({ id, shop_id });
    }
    return await this.findOne({ id });
  },

  async countDocuments(filter = {}) {
    if (!filter.shop_id) return 0;
    const res = await get('SELECT COUNT(*) as count FROM sales WHERE shop_id = $1', [filter.shop_id]);
    return res ? parseInt(res.count, 10) : 0;
  },

  async create(saleData) {
    if (!saleData.shop_id) {
      throw new Error('shop_id is required to create a sale');
    }
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

    return await this.findById(id, shop_id);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const shop_id = options.shop_id || updateData.shop_id;
    const existing = shop_id ? await this.findOne({ id, shop_id }) : await this.findById(id);
    if (!existing) return null;

    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (updateData.partyName !== undefined) { fields.push(`partyName = $${paramIndex++}`); params.push(updateData.partyName); }
    if (updateData.customerId !== undefined) { fields.push(`customerId = $${paramIndex++}`); params.push(updateData.customerId); }
    if (updateData.customerType !== undefined) { fields.push(`customerType = $${paramIndex++}`); params.push(updateData.customerType); }
    if (updateData.amount !== undefined || updateData.grandTotal !== undefined) { fields.push(`amount = $${paramIndex++}`); params.push(Number(updateData.amount !== undefined ? updateData.amount : updateData.grandTotal)); }
    if (updateData.paidAmount !== undefined) { fields.push(`paidAmount = $${paramIndex++}`); params.push(Number(updateData.paidAmount)); }
    if (updateData.profit !== undefined) { fields.push(`profit = $${paramIndex++}`); params.push(Number(updateData.profit)); }
    if (updateData.status !== undefined) { fields.push(`status = $${paramIndex++}`); params.push(updateData.status); }
    if (updateData.itemsCount !== undefined) { fields.push(`itemsCount = $${paramIndex++}`); params.push(Number(updateData.itemsCount)); }
    if (updateData.cartJson !== undefined || updateData.cart !== undefined) { 
      const c = updateData.cartJson !== undefined ? (typeof updateData.cartJson === 'string' ? updateData.cartJson : JSON.stringify(updateData.cartJson)) : JSON.stringify(updateData.cart);
      fields.push(`cartJson = $${paramIndex++}`); 
      params.push(c); 
    }

    if (fields.length > 0) {
      if (shop_id) {
        params.push(id, shop_id);
        await run(`UPDATE sales SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND shop_id = $${paramIndex}`, params);
      } else {
        params.push(id);
        await run(`UPDATE sales SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
      }
    }

    return await this.findById(id, shop_id);
  }
};

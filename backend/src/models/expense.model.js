import { query, get, run } from '../services/db.service.js';

const mapExpenseRow = (r) => {
  if (!r) return null;
  const amount = Number(r.amount !== undefined ? r.amount : 0);
  const date = r.date || (r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

  return {
    ...r,
    id: r.id,
    shop_id: r.shop_id,
    category: r.category,
    amount,
    mode: r.mode || 'Cash',
    date,
    desc: r.desc_text || r.desc || '',
    desc_text: r.desc_text || r.desc || '',
    created_at: r.created_at
  };
};

export const Expense = {
  async find(filter = {}) {
    if (!filter.shop_id) {
      return [];
    }
    const rows = await query('SELECT * FROM expenses WHERE shop_id = $1 ORDER BY created_at DESC', [filter.shop_id]);
    return rows.map(mapExpenseRow);
  },

  async findOne(filter = {}) {
    if (!filter.shop_id && !filter.id) return null;
    let row = null;
    if (filter.id && filter.shop_id) {
      row = await get('SELECT * FROM expenses WHERE id = $1 AND shop_id = $2', [filter.id, filter.shop_id]);
    } else if (filter.id) {
      row = await get('SELECT * FROM expenses WHERE id = $1', [filter.id]);
    }
    return mapExpenseRow(row);
  },

  async findById(id, shop_id = null) {
    if (shop_id) {
      return await this.findOne({ id, shop_id });
    }
    const row = await get('SELECT * FROM expenses WHERE id = $1', [id]);
    return mapExpenseRow(row);
  },

  async create(expenseData) {
    if (!expenseData.shop_id) {
      throw new Error('shop_id is required to create an expense');
    }
    const id = expenseData.id || `exp-${Date.now()}`;
    const shop_id = expenseData.shop_id;
    const category = expenseData.category || 'General Miscellaneous';
    const amount = Number(expenseData.amount) || 0;
    const mode = expenseData.mode || 'Cash';
    const date = expenseData.date || new Date().toISOString().split('T')[0];
    const desc_text = expenseData.desc || expenseData.desc_text || '';

    await run(
      'INSERT INTO expenses (id, shop_id, category, amount, mode, date, desc_text) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, shop_id, category, amount, mode, date, desc_text]
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

    if (updateData.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      params.push(updateData.category);
    }
    if (updateData.amount !== undefined) {
      fields.push(`amount = $${paramIndex++}`);
      params.push(Number(updateData.amount) || 0);
    }
    if (updateData.mode !== undefined) {
      fields.push(`mode = $${paramIndex++}`);
      params.push(updateData.mode);
    }
    if (updateData.date !== undefined) {
      fields.push(`date = $${paramIndex++}`);
      params.push(updateData.date);
    }
    if (updateData.desc !== undefined || updateData.desc_text !== undefined) {
      fields.push(`desc_text = $${paramIndex++}`);
      params.push(updateData.desc || updateData.desc_text || '');
    }

    if (fields.length > 0) {
      params.push(id, shop_id);
      await run(`UPDATE expenses SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND shop_id = $${paramIndex}`, params);
    }

    return await this.findById(id, shop_id);
  },

  async findByIdAndDelete(id, shop_id) {
    if (!shop_id) throw new Error('shop_id required for delete');
    const existing = await this.findOne({ id, shop_id });
    if (existing) {
      await run('DELETE FROM expenses WHERE id = $1 AND shop_id = $2', [id, shop_id]);
    }
    return existing;
  }
};

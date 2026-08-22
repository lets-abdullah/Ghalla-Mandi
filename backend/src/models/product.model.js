import { query, get, run } from '../services/db.service.js';

const mapProductRow = (r) => {
  if (!r) return null;
  const purchasePrice = Number(r.purchaseprice !== undefined ? r.purchaseprice : (r.purchasePrice !== undefined ? r.purchasePrice : 0));
  const sellingPrice = Number(r.sellingprice !== undefined ? r.sellingprice : (r.sellingPrice !== undefined ? r.sellingPrice : 0));
  const stockQty = Number(r.stockqty !== undefined ? r.stockqty : (r.stockQty !== undefined ? r.stockQty : 0));
  const minStock = Number(r.minstock !== undefined ? r.minstock : (r.minStock !== undefined ? r.minStock : (r.minStockThreshold !== undefined ? r.minStockThreshold : 10)));
  const unit = r.unit || r.baseUnit || 'KG';

  return {
    ...r,
    id: r.id,
    shop_id: r.shop_id,
    code: r.code,
    name: r.name,
    category: r.category,
    purchasePrice,
    purchaseprice: purchasePrice,
    sellingPrice,
    sellingprice: sellingPrice,
    stockQty,
    stockqty: stockQty,
    minStock,
    minstock: minStock,
    unit,
    baseUnit: unit,
    image: r.image || ''
  };
};

export const Product = {
  async find(filter = {}) {
    const rows = filter.shop_id
      ? await query('SELECT * FROM products WHERE shop_id = $1 ORDER BY name ASC', [filter.shop_id])
      : await query('SELECT * FROM products ORDER BY name ASC');
    return rows.map(mapProductRow);
  },

  async findOne(filter = {}) {
    let row = null;
    if (filter.id) {
      row = await get('SELECT * FROM products WHERE id = $1', [filter.id]);
    } else if (filter.shop_id && filter.code) {
      row = await get('SELECT * FROM products WHERE shop_id = $1 AND code = $2', [filter.shop_id, filter.code]);
    }
    return mapProductRow(row);
  },

  async findById(id) {
    const row = await get('SELECT * FROM products WHERE id = $1', [id]);
    return mapProductRow(row);
  },

  async create(prodData) {
    const id = prodData.id || `prd-${Date.now()}`;
    const shop_id = prodData.shop_id;
    const code = prodData.code || `PRD-${Math.floor(100 + Math.random() * 900)}`;
    const name = prodData.name;
    const category = prodData.category || 'General';
    const purchasePrice = Number(prodData.purchasePrice !== undefined ? prodData.purchasePrice : (prodData.purchaseprice !== undefined ? prodData.purchaseprice : 0)) || 0;
    const sellingPrice = Number(prodData.sellingPrice !== undefined ? prodData.sellingPrice : (prodData.sellingprice !== undefined ? prodData.sellingprice : 0)) || 0;
    const stockQty = Number(prodData.stockQty !== undefined ? prodData.stockQty : (prodData.stockqty !== undefined ? prodData.stockqty : 0)) || 0;
    const minStock = Number(prodData.minStock || prodData.minstock || prodData.minStockThreshold) || 10;
    const unit = prodData.unit || prodData.baseUnit || 'KG';
    const image = prodData.image || prodData.imageUrl || '';

    await run(
      'INSERT INTO products (id, shop_id, code, name, category, purchasePrice, sellingPrice, stockQty, minStock, unit, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [id, shop_id, code, name, category, purchasePrice, sellingPrice, stockQty, minStock, unit, image]
    );

    return await this.findById(id);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    const mapping = {
      name: 'name',
      category: 'category',
      code: 'code',
      purchasePrice: 'purchasePrice',
      purchaseprice: 'purchasePrice',
      sellingPrice: 'sellingPrice',
      sellingprice: 'sellingPrice',
      stockQty: 'stockQty',
      stockqty: 'stockQty',
      minStock: 'minStock',
      minstock: 'minStock',
      minStockThreshold: 'minStock',
      unit: 'unit',
      baseUnit: 'unit',
      image: 'image'
    };

    const handled = new Set();
    Object.keys(updateData).forEach(k => {
      const col = mapping[k];
      if (col && !handled.has(col) && updateData[k] !== undefined) {
        handled.add(col);
        fields.push(`${col} = $${paramIndex++}`);
        params.push(
          (col === 'purchasePrice' || col === 'sellingPrice' || col === 'stockQty' || col === 'minStock')
            ? Number(updateData[k]) || 0
            : updateData[k]
        );
      }
    });

    if (fields.length > 0) {
      params.push(id);
      await run(`UPDATE products SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);
    }

    return await this.findById(id);
  },

  async findByIdAndDelete(id) {
    const prod = await this.findById(id);
    if (prod) {
      await run('DELETE FROM products WHERE id = $1', [id]);
    }
    return prod;
  }
};

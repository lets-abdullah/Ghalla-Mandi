import { query, get, run } from '../services/db.service.js';

export const Ledger = {
  async find(filter = {}) {
    if (filter.shop_id) {
      if (filter.partyId) {
        return await query('SELECT * FROM payment_logs WHERE shop_id = $1 AND partyId = $2 ORDER BY created_at DESC', [filter.shop_id, filter.partyId]);
      }
      return await query('SELECT * FROM payment_logs WHERE shop_id = $1 ORDER BY created_at DESC', [filter.shop_id]);
    }
    return await query('SELECT * FROM payment_logs ORDER BY created_at DESC');
  },

  async create(ledgerData) {
    const id = ledgerData.id || `pay-${Date.now()}`;
    const shop_id = ledgerData.shop_id;
    const partyId = ledgerData.partyId || null;
    const partyType = ledgerData.partyType || 'Customer';
    const partyName = ledgerData.partyName || 'Party';
    const amount = Number(ledgerData.amount || ledgerData.credit || ledgerData.debit) || 0;
    const mode = ledgerData.mode || ledgerData.paymentMode || 'Cash';
    const date = ledgerData.date || new Date().toLocaleDateString('en-GB');
    const ref = ledgerData.ref || ledgerData.referenceNo || `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const note = ledgerData.note || ledgerData.description || '';
    const saleId = ledgerData.saleId || null;
    const purchaseId = ledgerData.purchaseId || null;

    await run(
      'INSERT INTO payment_logs (id, shop_id, partyId, partyType, partyName, amount, mode, date, ref, note, saleId, purchaseId) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [id, shop_id, partyId, partyType, partyName, amount, mode, date, ref, note, saleId, purchaseId]
    );

    return await get('SELECT * FROM payment_logs WHERE id = $1', [id]);
  }
};

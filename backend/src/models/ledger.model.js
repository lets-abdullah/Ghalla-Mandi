import { query, get, run } from '../services/db.service.js';

const mapLedgerRow = (r) => {
  if (!r) return null;
  const partyId = r.partyid || r.partyId || null;
  const partyType = r.partytype || r.partyType || 'Customer';
  const partyName = r.partyname || r.partyName || 'Party';
  const amount = Number(r.amount !== undefined ? r.amount : 0);
  const mode = r.mode || 'Cash';
  const date = r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  const ref = r.ref || '';
  const note = r.note || '';
  const saleId = r.saleid || r.saleId || null;
  const purchaseId = r.purchaseid || r.purchaseId || null;

  return {
    ...r,
    id: r.id,
    shop_id: r.shop_id,
    partyId,
    partyid: partyId,
    partyType,
    partytype: partyType,
    partyName,
    partyname: partyName,
    amount,
    mode,
    date,
    ref,
    note,
    saleId,
    saleid: saleId,
    purchaseId,
    purchaseid: purchaseId
  };
};

export const Ledger = {
  async find(filter = {}) {
    let rows = [];
    if (filter.shop_id) {
      if (filter.partyId || filter.partyid) {
        rows = await query('SELECT * FROM payment_logs WHERE shop_id = $1 AND partyid = $2 ORDER BY created_at DESC', [filter.shop_id, filter.partyId || filter.partyid]);
      } else {
        rows = await query('SELECT * FROM payment_logs WHERE shop_id = $1 ORDER BY created_at DESC', [filter.shop_id]);
      }
    } else {
      rows = await query('SELECT * FROM payment_logs ORDER BY created_at DESC');
    }
    return rows.map(mapLedgerRow);
  },

  async create(ledgerData) {
    const id = ledgerData.id || `pay-${Date.now()}`;
    const shop_id = ledgerData.shop_id;
    const partyId = ledgerData.partyId || ledgerData.partyid || null;
    const partyType = ledgerData.partyType || ledgerData.partytype || 'Customer';
    const partyName = ledgerData.partyName || ledgerData.partyname || 'Party';
    const amount = Number(ledgerData.amount || ledgerData.credit || ledgerData.debit) || 0;
    const mode = ledgerData.mode || ledgerData.paymentMode || 'Cash';
    const date = ledgerData.date || new Date().toLocaleDateString('en-GB');
    const ref = ledgerData.ref || ledgerData.referenceNo || `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const note = ledgerData.note || ledgerData.description || '';
    const saleId = ledgerData.saleId || ledgerData.saleid || null;
    const purchaseId = ledgerData.purchaseId || ledgerData.purchaseid || null;

    await run(
      'INSERT INTO payment_logs (id, shop_id, partyId, partyType, partyName, amount, mode, date, ref, note, saleId, purchaseId) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [id, shop_id, partyId, partyType, partyName, amount, mode, date, ref, note, saleId, purchaseId]
    );

    const row = await get('SELECT * FROM payment_logs WHERE id = $1', [id]);
    return mapLedgerRow(row);
  }
};

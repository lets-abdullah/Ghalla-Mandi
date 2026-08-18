import { AuditLog } from '../models/auditLog.model.js';

export const getStockMovements = async (req, res) => {
  try {
    const movements = await AuditLog.find({ shop_id: req.shop_id });
    return res.json({ success: true, movements });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

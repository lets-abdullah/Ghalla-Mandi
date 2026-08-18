import { Shop } from '../models/shop.model.js';
import { AuditLog } from '../models/auditLog.model.js';

export const getSettings = async (req, res) => {
  try {
    const shop = await Shop.findOne({ shop_id: req.shop_id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop profile not found' });
    }
    return res.json({ success: true, shop });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { name, ownerName, phone, address, city } = req.body;

    const shop = await Shop.updateOne(
      { shop_id: req.shop_id },
      { name, ownerName, phone, address, city }
    );

    await AuditLog.create({
      shop_id: req.shop_id,
      product: 'Shop Profile',
      type: 'UPDATE',
      qty: '1 Unit',
      ref: req.user ? req.user.fullName : 'Admin',
      date: new Date().toLocaleDateString('en-GB')
    });

    return res.json({ success: true, shop });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

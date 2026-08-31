import { Supplier } from '../models/supplier.model.js';
import { Ledger } from '../models/ledger.model.js';

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ shop_id: req.shop_id });
    return res.json({ success: true, suppliers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, phone, city, address, openingBalance = 0, suppliedProducts = [] } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const supplier = await Supplier.create({
      shop_id: req.shop_id,
      name,
      phone: phone || '',
      city: city || address || 'Local Mandi',
      openingBalance: Number(openingBalance),
      balance: Number(openingBalance),
      suppliedProducts
    });

    if (Number(openingBalance) !== 0) {
      await Ledger.create({
        shop_id: req.shop_id,
        partyType: 'Supplier',
        partyId: supplier.id,
        partyName: supplier.name,
        amount: Math.abs(Number(openingBalance)),
        mode: 'Opening Balance',
        date: new Date().toLocaleDateString('en-GB'),
        note: 'Opening Payable Balance'
      });
    }

    return res.status(201).json({ success: true, supplier });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByIdAndUpdate(id, req.body, { shop_id: req.shop_id });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    return res.json({ success: true, supplier });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByIdAndDelete(id, req.shop_id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    return res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getSupplierLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id, req.shop_id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const ledgerEntries = await Ledger.find({ shop_id: req.shop_id, partyId: id });

    return res.json({
      success: true,
      supplier,
      entries: ledgerEntries
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

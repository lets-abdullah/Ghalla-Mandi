import { Customer } from '../models/customer.model.js';
import { Ledger } from '../models/ledger.model.js';

export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ shop_id: req.shop_id });
    return res.json({ success: true, customers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, phone, city, address, customerType, openingBalance = 0 } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const customer = await Customer.create({
      shop_id: req.shop_id,
      name,
      phone: phone || '',
      city: city || address || 'Local Mandi',
      customerType: customerType || 'Regular Party',
      openingBalance: Number(openingBalance),
      balance: Number(openingBalance)
    });

    if (Number(openingBalance) !== 0) {
      await Ledger.create({
        shop_id: req.shop_id,
        partyType: 'Customer',
        partyId: customer.id,
        partyName: customer.name,
        amount: Math.abs(Number(openingBalance)),
        mode: 'Opening Balance',
        date: new Date().toLocaleDateString('en-GB'),
        note: 'Opening Receivable Balance'
      });
    }

    return res.status(201).json({ success: true, customer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getCustomerLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const ledgerEntries = await Ledger.find({ shop_id: req.shop_id, partyId: id });

    return res.json({
      success: true,
      customer,
      entries: ledgerEntries
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, req.body);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    return res.json({ success: true, customer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndDelete(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    return res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


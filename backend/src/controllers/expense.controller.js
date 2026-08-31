import { Expense } from '../models/expense.model.js';

export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ shop_id: req.shop_id });
    return res.json({ success: true, expenses });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const { category, amount, mode, date, desc } = req.body;
    if (!category || !amount) {
      return res.status(400).json({ success: false, message: 'Category and valid amount are required' });
    }

    const expense = await Expense.create({
      shop_id: req.shop_id,
      category,
      amount: Number(amount),
      mode: mode || 'Cash',
      date: date || new Date().toISOString().split('T')[0],
      desc: desc || ''
    });

    return res.status(201).json({ success: true, expense });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndUpdate(id, req.shop_id, req.body);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }
    return res.json({ success: true, expense });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id, req.shop_id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }
    return res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

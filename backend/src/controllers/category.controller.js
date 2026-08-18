import { Category } from '../models/category.model.js';

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ shop_id: req.shop_id });
    return res.json({ success: true, categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const existing = await Category.findOne({ shop_id: req.shop_id, name });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({
      shop_id: req.shop_id,
      name,
      description: description || 'Custom Product category'
    });

    return res.status(201).json({ success: true, category });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, req.body);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    return res.json({ success: true, category });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    return res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

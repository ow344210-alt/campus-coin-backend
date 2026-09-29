const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({
    $or: [{ isDefault: true }, { user: req.user._id }],
  }).sort({ type: 1, name: 1 });

  res.status(200).json({ success: true, count: categories.length, data: categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, type, icon, color } = req.body;

  if (!name || !type) {
    res.status(400);
    throw new Error('Category name and type are required');
  }

  const category = await Category.create({
    name,
    type,
    icon,
    color,
    user: req.user._id,
    isDefault: false,
  });

  res.status(201).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  if (category.isDefault) {
    res.status(403);
    throw new Error('Default categories cannot be edited by students');
  }

  if (category.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to edit this category');
  }

  Object.assign(category, req.body);
  const updated = await category.save();

  res.status(200).json({ success: true, data: updated });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  if (category.isDefault) {
    res.status(403);
    throw new Error('Default categories cannot be deleted by students');
  }

  if (category.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this category');
  }

  await category.deleteOne();

  res.status(200).json({ success: true, message: 'Category deleted' });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
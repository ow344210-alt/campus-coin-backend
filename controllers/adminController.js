const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Insight = require('../models/Insight');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    message: { type: String, required: [true, 'Message is required'], trim: true },
    type: { type: String, enum: ['info', 'warning', 'maintenance'], default: 'info' },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Announcement =
  mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const failIfBadId = (req, res) => {
  if (!isValidId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid ID');
  }
};

const getDefaultCategories = asyncHandler(async (req, res) => {
  const filter = { isDefault: true, user: null };
  if (req.query.type) filter.type = req.query.type;

  const categories = await Category.find(filter).sort({ type: 1, name: 1 });

  res.status(200).json({ success: true, count: categories.length, data: categories });
});

const createDefaultCategory = asyncHandler(async (req, res) => {
  const { name, type, icon, color } = req.body;

  if (!name || !type) {
    res.status(400);
    throw new Error('Name and type are required');
  }

  if (!['income', 'expense'].includes(type)) {
    res.status(400);
    throw new Error("Type must be 'income' or 'expense'");
  }

  const exists = await Category.findOne({ name: name.trim(), type, user: null });
  if (exists) {
    res.status(409);
    throw new Error('A default category with this name and type already exists');
  }

  const category = await Category.create({
    name,
    type,
    icon,
    color,
    isDefault: true,
    user: null,
  });

  res.status(201).json({ success: true, data: category });
});

const updateDefaultCategory = asyncHandler(async (req, res) => {
  failIfBadId(req, res);

  const category = await Category.findOne({ _id: req.params.id, isDefault: true, user: null });

  if (!category) {
    res.status(404);
    throw new Error('Default category not found');
  }

  const { name, type, icon, color } = req.body;

  if (type !== undefined && !['income', 'expense'].includes(type)) {
    res.status(400);
    throw new Error("Type must be 'income' or 'expense'");
  }

  if (name !== undefined) category.name = name;
  if (type !== undefined) category.type = type;
  if (icon !== undefined) category.icon = icon;
  if (color !== undefined) category.color = color;

  await category.save();

  res.status(200).json({ success: true, data: category });
});

const deleteDefaultCategory = asyncHandler(async (req, res) => {
  failIfBadId(req, res);

  const category = await Category.findOne({ _id: req.params.id, isDefault: true, user: null });

  if (!category) {
    res.status(404);
    throw new Error('Default category not found');
  }

  const inUse = await Transaction.exists({ category: category._id });
  if (inUse) {
    res.status(400);
    throw new Error('Category is used by existing transactions and cannot be deleted');
  }

  await category.deleteOne();

  res.status(200).json({ success: true, message: 'Default category deleted' });
});

const getUsers = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

  const filter = { role: 'student' };

  if (status === 'active') filter.isActive = true;
  if (status === 'disabled') filter.isActive = false;

  if (search) {
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: users,
  });
});

const disableUser = asyncHandler(async (req, res) => {
  failIfBadId(req, res);

  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role === 'admin') {
    res.status(403);
    throw new Error('Cannot disable an admin account');
  }

  user.isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : !user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'enabled' : 'disabled'}`,
    data: user,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  failIfBadId(req, res);

  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role === 'admin') {
    res.status(403);
    throw new Error('Cannot delete an admin account');
  }

  await Promise.all([
    Transaction.deleteMany({ user: user._id }),
    Budget.deleteMany({ user: user._id }),
    Insight.deleteMany({ user: user._id }),
  ]);

  await user.deleteOne();

  res.status(200).json({ success: true, message: 'User deleted' });
});

const resetUserPassword = asyncHandler(async (req, res) => {
  failIfBadId(req, res);

  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role === 'admin') {
    res.status(403);
    throw new Error('Cannot reset an admin password from here');
  }

  const supplied = req.body.newPassword;
  if (supplied !== undefined && String(supplied).length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const newPassword = supplied ? String(supplied) : crypto.randomBytes(6).toString('base64url');

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successfully',
    ...(supplied ? {} : { temporaryPassword: newPassword }),
  });
});

const getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    totalTransactions,
    transactionsThisMonth,
    defaultCategories,
    totals,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'student', createdAt: { $gte: monthStart } }),
    Transaction.countDocuments(),
    Transaction.countDocuments({ date: { $gte: monthStart } }),
    Category.countDocuments({ isDefault: true, user: null }),
    Transaction.aggregate([{ $group: { _id: '$type', total: { $sum: '$amount' } } }]),
  ]);

  const sums = { income: 0, expense: 0 };
  totals.forEach((t) => {
    if (t._id in sums) sums[t._id] = t.total;
  });

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        active: activeUsers,
        disabled: totalUsers - activeUsers,
        newThisMonth: newUsersThisMonth,
      },
      transactions: {
        total: totalTransactions,
        thisMonth: transactionsThisMonth,
        totalIncome: sums.income,
        totalExpense: sums.expense,
      },
      defaultCategories,
    },
  });
});

const getAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: announcements.length, data: announcements });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, type, isActive, expiresAt } = req.body;

  if (!title || !message) {
    res.status(400);
    throw new Error('Title and message are required');
  }

  const announcement = await Announcement.create({
    title,
    message,
    type,
    isActive,
    expiresAt: expiresAt || null,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: announcement });
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  failIfBadId(req, res);

  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }

  ['title', 'message', 'type', 'isActive', 'expiresAt'].forEach((field) => {
    if (req.body[field] !== undefined) announcement[field] = req.body[field];
  });

  await announcement.save();

  res.status(200).json({ success: true, data: announcement });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  failIfBadId(req, res);

  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }

  await announcement.deleteOne();

  res.status(200).json({ success: true, message: 'Announcement deleted' });
});

module.exports = {
  getDefaultCategories,
  createDefaultCategory,
  updateDefaultCategory,
  deleteDefaultCategory,
  getUsers,
  disableUser,
  deleteUser,
  resetUserPassword,
  getStats,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};

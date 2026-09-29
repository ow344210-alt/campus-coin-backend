const asyncHandler = require('express-async-handler');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

const startOfMonth = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const getBudgets = asyncHandler(async (req, res) => {
  const month = startOfMonth(req.query.month || new Date());
  const nextMonth = new Date(month);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const budgets = await Budget.find({ user: req.user._id, month }).populate(
    'category',
    'name type color icon'
  );

  const categoryIds = budgets.map((b) => b.category._id);

  const spendingData = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        category: { $in: categoryIds },
        type: 'expense',
        date: { $gte: month, $lt: nextMonth },
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
      },
    },
  ]);

  const spendMap = {};
  spendingData.forEach((item) => {
    spendMap[item._id.toString()] = item.total;
  });

  const withProgress = budgets.map((budget) => {
    const spentAmount = spendMap[budget.category._id.toString()] || 0;
    const percentUsed = budget.limitAmount > 0 ? (spentAmount / budget.limitAmount) * 100 : 0;

    return {
      ...budget.toObject(),
      spentAmount,
      percentUsed: Math.round(percentUsed * 10) / 10,
      isExceeded: spentAmount > budget.limitAmount,
    };
  });

  res.status(200).json({ success: true, count: withProgress.length, data: withProgress });
});

const setBudget = asyncHandler(async (req, res) => {
  const { category, month, limitAmount, alertThresholdPercent } = req.body;

  if (!category || !month || limitAmount === undefined) {
    res.status(400);
    throw new Error('Category, month and limitAmount are required');
  }

  const normalizedMonth = startOfMonth(month);

  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, category, month: normalizedMonth },
    {
      limitAmount,
      alertThresholdPercent: alertThresholdPercent || 80,
      alertSent: false,
      exceededSent: false,
    },
    { new: true, upsert: true, runValidators: true }
  ).populate('category', 'name type color icon');

  res.status(200).json({ success: true, data: budget });
});

const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findById(req.params.id);

  if (!budget) {
    res.status(404);
    throw new Error('Budget not found');
  }

  if (budget.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this budget');
  }

  await budget.deleteOne();

  res.status(200).json({ success: true, message: 'Budget deleted' });
});

module.exports = { getBudgets, setBudget, deleteBudget };
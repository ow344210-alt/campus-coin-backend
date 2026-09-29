const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const { suggestCategory } = require('../utils/aiCategorizer');
const { checkAnomaly } = require('../utils/anomalyDetector');

const getTransactions = asyncHandler(async (req, res) => {
  const { type, category, startDate, endDate } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const filter = { user: req.user._id };
  if (type) filter.type = type;
  if (category) filter.category = category;
  
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const transactions = await Transaction.find(filter)
    .populate('category', 'name type color icon')
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Transaction.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: transactions.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: transactions,
  });
});

const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id).populate('category');

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this transaction');
  }

  res.status(200).json({ success: true, data: transaction });
});

const createTransaction = asyncHandler(async (req, res) => {
  const { category, type, amount, description, date, isRecurring, recurrence } = req.body;

  if (!category || !type || amount === undefined) {
    res.status(400);
    throw new Error('Category, type and amount are required');
  }

  const aiSuggestedCategory = description
    ? await suggestCategory(description, req.user._id)
    : null;

  const tempTransactionData = {
    user: req.user._id,
    category,
    type,
    amount,
    description,
    date: date || Date.now(),
    isRecurring: !!isRecurring,
    recurrence: isRecurring ? recurrence : { frequency: null, nextRunDate: null },
    aiSuggestedCategory: aiSuggestedCategory ? aiSuggestedCategory._id : null,
    source: 'manual',
  };

  const anomaly = await checkAnomaly(req.user._id, tempTransactionData);
  if (anomaly.isAnomaly) {
    tempTransactionData.isFlaggedAnomaly = true;
    tempTransactionData.anomalyReason = anomaly.reason;
  }

  const transaction = await Transaction.create(tempTransactionData);
  const populated = await transaction.populate('category', 'name type color icon');

  res.status(201).json({ success: true, data: populated });
});

const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to edit this transaction');
  }

  if (req.body.category && transaction.aiSuggestedCategory) {
    transaction.wasAiSuggestionAccepted =
      req.body.category.toString() === transaction.aiSuggestedCategory.toString();
  }

  Object.assign(transaction, req.body);
  await transaction.save();

  const populated = await transaction.populate('category', 'name type color icon');

  res.status(200).json({ success: true, data: populated });
});

const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this transaction');
  }

  await transaction.deleteOne();

  res.status(200).json({ success: true, message: 'Transaction deleted' });
});

const importTransactions = asyncHandler(async (req, res) => {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400);
    throw new Error('No valid rows found to import');
  }

  const docs = rows.map((row) => ({
    category: row.category,
    type: row.type,
    amount: row.amount,
    description: row.description || '',
    date: row.date || Date.now(),
    user: req.user._id,
    source: 'csv_import',
  }));

  const created = await Transaction.insertMany(docs, { ordered: false });

  res.status(201).json({
    success: true,
    message: `${created.length} transactions imported`,
    data: created,
  });
});

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
};
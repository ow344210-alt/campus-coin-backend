const asyncHandler = require('express-async-handler');
const Insight = require('../models/Insight');
const { generateMonthlyInsights } = require('../utils/insightGenerator');

const startOfMonth = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const getInsights = asyncHandler(async (req, res) => {
  const targetMonth = req.query.month ? new Date(req.query.month) : new Date();
  const monthStart = startOfMonth(targetMonth);

  const alreadyGenerated = await Insight.exists({ user: req.user._id, month: monthStart });
  if (!alreadyGenerated) {
    await generateMonthlyInsights(req.user._id, monthStart);
  }

  const filter = { user: req.user._id, isDismissed: false };
  if (req.query.month) filter.month = monthStart;
  if (req.query.type) filter.type = req.query.type;

  const insights = await Insight.find(filter)
    .populate('relatedCategory', 'name color icon')
    .sort({ isPinned: -1, impactScore: -1, generatedAt: -1 });

  res.status(200).json({ success: true, count: insights.length, data: insights });
});

const generateInsights = asyncHandler(async (req, res) => {
  const month = req.body.month ? new Date(req.body.month) : new Date();
  const insights = await generateMonthlyInsights(req.user._id, month);

  res.status(201).json({ success: true, count: insights.length, data: insights });
});

const togglePin = asyncHandler(async (req, res) => {
  const insight = await Insight.findById(req.params.id);

  if (!insight) {
    res.status(404);
    throw new Error('Insight not found');
  }

  if (insight.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  insight.isPinned = !insight.isPinned;
  await insight.save();

  res.status(200).json({ success: true, data: insight });
});

const dismissInsight = asyncHandler(async (req, res) => {
  const insight = await Insight.findById(req.params.id);

  if (!insight) {
    res.status(404);
    throw new Error('Insight not found');
  }

  if (insight.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  insight.isDismissed = true;
  await insight.save();

  res.status(200).json({ success: true, message: 'Insight dismissed' });
});

module.exports = { getInsights, generateInsights, togglePin, dismissInsight };
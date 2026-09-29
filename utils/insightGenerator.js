const Transaction = require('../models/Transaction');
const Insight = require('../models/Insight');

const startOfMonth = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const generateMonthlyInsights = async (userId, targetMonth = new Date()) => {
  const currentMonth = startOfMonth(targetMonth);
  const nextMonth = new Date(currentMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const prev3Months = new Date(currentMonth);
  prev3Months.setMonth(prev3Months.getMonth() - 3);

  const currentSpending = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: 'expense',
        date: { $gte: currentMonth,$lt: nextMonth },
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    { $unwind: '$categoryDetails' },
  ]);

  if (!currentSpending.length) return [];

  const historicalAvg = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: 'expense',
        date: { $gte: prev3Months,$lt: currentMonth },
      },
    },
    {
      $group: {
        _id: '$category',
        avgAmount: { $avg: '$amount' },
      },
    },
  ]);

  const historyMap = {};
  historicalAvg.forEach((item) => {
    historyMap[item._id.toString()] = item.avgAmount;
  });

  const generatedInsights = [];

  for (const item of currentSpending) {
    const catId = item._id.toString();
    const catName = item.categoryDetails.name;
    const currentTotal = item.total;
    const avgTotal = historyMap[catId] || 0;

    if (avgTotal > 0) {
      const pctIncrease = ((currentTotal - avgTotal) / avgTotal) * 100;

      if (pctIncrease >= 20) {
        const suggestedCap = Math.round(currentTotal * 0.8);

        const insightDoc = await Insight.create({
          user: userId,
          month: currentMonth,
          type: 'saving_tip',
          relatedCategory: item._id,
          summaryText: `High spending alert: your ${catName} spending increased by ${Math.round(pctIncrease)}% this month compared to your previous 3-month average.`,
          tipText: `Try capping your ${catName} budget at Rs ${suggestedCap} next month to balance your savings.`,
          impactScore: Math.min(Math.round(pctIncrease), 100),
          generatedAt: new Date(),
        });

        generatedInsights.push(insightDoc);
      }
    }
  }

  return generatedInsights;
};

module.exports = { generateMonthlyInsights };
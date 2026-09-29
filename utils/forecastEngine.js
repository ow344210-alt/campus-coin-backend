const Transaction = require('../models/Transaction');

const generateForecast = async (userId, categoryId = null) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const matchFilter = {
    user: userId,
    type: 'expense',
    date: { $gte: sixMonthsAgo },
  };

  if (categoryId) {
    matchFilter.category = categoryId;
  }

  const monthlyTotals = await Transaction.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
        },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  if (!monthlyTotals || monthlyTotals.length === 0) {
    return {
      forecast: 0,
      trend: 'stable',
      basis: 'insufficient transaction history',
    };
  }

  if (monthlyTotals.length === 1) {
    return {
      forecast: monthlyTotals[0].total,
      trend: 'stable',
      basis: 'based on single month historical data',
    };
  }

  const n = monthlyTotals.length;
  let weightedSum = 0;
  let weightTotal = 0;

  monthlyTotals.forEach((entry, idx) => {
    const weight = idx + 1;
    weightedSum += entry.total * weight;
    weightTotal += weight;
  });

  const weightedAvg = weightedSum / weightTotal;

  const midpoint = Math.floor(n / 2);
  const firstHalfAvg =
    monthlyTotals.slice(0, midpoint).reduce((a, b) => a + b.total, 0) / (midpoint || 1);
  const secondHalfAvg =
    monthlyTotals.slice(midpoint).reduce((a, b) => a + b.total, 0) / (n - midpoint);

  let trend = 'stable';
  if (secondHalfAvg > firstHalfAvg * 1.05) trend = 'up';
  else if (secondHalfAvg < firstHalfAvg * 0.95) trend = 'down';

  const trendAdjustment = trend === 'up' ? 1.05 : trend === 'down' ? 0.95 : 1;
  const forecast = Math.round(weightedAvg * trendAdjustment);

  return {
    forecast,
    trend,
    basis: `weighted average across ${n} month(s) with ${trend}ward adjustment`,
  };
};

module.exports = { generateForecast };
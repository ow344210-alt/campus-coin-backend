const Transaction = require('../models/Transaction');

const checkAnomaly = async (userId, newTransaction) => {
  const { category, amount, date = new Date() } = newTransaction;
  const numAmount = Number(amount);
  const txnDate = new Date(date);

  const tenMinutesBefore = new Date(txnDate.getTime() - 10 * 60 * 1000);
  const tenMinutesAfter = new Date(txnDate.getTime() + 10 * 60 * 1000);

  const duplicate = await Transaction.findOne({
    user: userId,
    category,
    amount: numAmount,
    date: { $gte: tenMinutesBefore,$lte: tenMinutesAfter },
  });

  if (duplicate) {
    return {
      isAnomaly: true,
      reason: `Possible duplicate: identical amount logged within 10 minutes.`,
    };
  }

  const pastTransactions = await Transaction.find({
    user: userId,
    category,
    type: 'expense',
  })
    .select('amount')
    .limit(50);

  if (pastTransactions.length >= 4) {
    const amounts = pastTransactions.map((t) => Number(t.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    const threshold = mean + 2 * stdDev;

    if (numAmount > threshold && stdDev > 0) {
      return {
        isAnomaly: true,
        reason: `Unusually large expense for this category (Avg: ${Math.round(mean)}, Limit: ${Math.round(threshold)}).`,
      };
    }
  }

  return { isAnomaly: false, reason: null };
};

module.exports = { checkAnomaly };
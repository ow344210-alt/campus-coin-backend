const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const { generatePdfReport } = require('../utils/pdfGenerator');

const getCategoryReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, type } = req.query;

  if (!startDate || !endDate) {
    res.status(400);
    throw new Error('startDate and endDate are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    res.status(400);
    throw new Error('startDate cannot be after endDate');
  }

  end.setHours(23, 59, 59, 999);

  const match = {
    user: req.user._id,
    date: { $gte: start, $lte: end },
  };
  if (type) match.type = type;

  const report = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    { $sort: { total: -1 } },
  ]);

  res.status(200).json({ success: true, data: report });
});

const getTrendReport = asyncHandler(async (req, res) => {
  const { groupBy = 'monthly', months = 6 } = req.query;

  const since = new Date();
  since.setMonth(since.getMonth() - Number(months));

  const dateFormat =
    groupBy === 'daily' ? '%Y-%m-%d' : groupBy === 'weekly' ? '%Y-%U' : '%Y-%m';

  const trend = await Transaction.aggregate([
    { $match: { user: req.user._id, date: { $gte: since } } },
    {
      $group: {
        _id: {
          period: { $dateToString: { format: dateFormat, date: '$date' } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.period': 1 } },
  ]);

  res.status(200).json({ success: true, data: trend });
});

const exportPdfReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400);
    throw new Error('startDate and endDate are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    res.status(400);
    throw new Error('startDate cannot be after endDate');
  }

  end.setHours(23, 59, 59, 999);

  const transactions = await Transaction.find({
    user: req.user._id,
    date: { $gte: start, $lte: end },
  }).populate('category', 'name type');

  const pdfBuffer = await generatePdfReport(req.user, transactions, { startDate, endDate });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=campuscoin-report.pdf');
  res.send(pdfBuffer);
});

module.exports = { getCategoryReport, getTrendReport, exportPdfReport };
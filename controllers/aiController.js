const asyncHandler = require('express-async-handler');
const { suggestCategory } = require('../utils/aiCategorizer');
const { generateForecast } = require('../utils/forecastEngine');

const suggestCategoryLive = asyncHandler(async (req, res) => {
  const { description } = req.body;

  if (!description) {
    res.status(400);
    throw new Error('Description text is required');
  }

  const suggestion = await suggestCategory(description, req.user._id);

  res.status(200).json({
    success: true,
    data: suggestion,
  });
});

const getForecast = asyncHandler(async (req, res) => {
  const forecast = await generateForecast(req.user._id, req.query.category);

  res.status(200).json({ success: true, data: forecast });
});

module.exports = { suggestCategoryLive, getForecast };
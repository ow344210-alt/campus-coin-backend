const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  suggestCategoryLive,
  getForecast,
} = require('../controllers/aiController');

const router = express.Router();

router.use(authMiddleware);

router.post('/categorize', suggestCategoryLive);
router.get('/forecast', getForecast);

module.exports = router;

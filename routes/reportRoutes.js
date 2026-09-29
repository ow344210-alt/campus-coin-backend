const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getCategoryReport,
  getTrendReport,
  exportPdfReport,
} = require('../controllers/reportController');

const router = express.Router();

router.use(authMiddleware);

router.get('/category', getCategoryReport);
router.get('/income-vs-expense', getTrendReport);
router.get('/summary', getCategoryReport);
router.get('/export', exportPdfReport);

module.exports = router;

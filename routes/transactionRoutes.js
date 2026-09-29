const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const {
  getTransactions,
  createTransaction,
  importTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.post('/import', uploadMiddleware, importTransactions);
router.get('/:id', getTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;

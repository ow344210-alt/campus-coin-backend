const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getBudgets,
  setBudget,
  deleteBudget,
} = require('../controllers/budgetController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getBudgets);
router.post('/', setBudget);
router.get('/progress', getBudgets);
router.delete('/:id', deleteBudget);

module.exports = router;
